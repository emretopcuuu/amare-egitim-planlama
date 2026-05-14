// netlify/functions/vimeo-yeni-cek.mjs
// ─────────────────────────────────────────────────────────────────────────
// Vimeo'da YENİ eklenen video'ları Firestore'a aktarır.
//
// İki tetikleme yolu:
//   1) SCHEDULED — her 6 saatte bir otomatik
//   2) MANUAL — admin panelden POST request ile x-admin-secret header
//
// Mantık:
//   - Vimeo /me/videos son 100 video çek (sort=date desc default)
//   - Her video için Firestore'da var mı kontrol et
//   - Yoksa: dışlama filtresi, eğitmen eşle, dil tespit, transcript çek
//   - {merge: true} ile yaz → idempotent
// ─────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';

export const config = { schedule: '0 */6 * * *' }; // 6 saatte bir

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const VIMEO_TOKEN = process.env.VIMEO_TOKEN;
const VIMEO_BASE = 'https://api.vimeo.com';

// ─── Normalize + matching helpers (DataContext.jsx ile uyumlu) ──────────
const TR_LOWER = { 'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'I': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
function makeSafeId(ad) {
  if (!ad) return '';
  let s = String(ad).normalize('NFC').replace(/[​-‍﻿]/g, '').replace(/ /g, ' ').trim();
  s = s.replace(/[ÇĞİIÖŞÜçğıöşü]/g, c => TR_LOWER[c.toUpperCase()] || c.toLowerCase());
  s = s.toLowerCase();
  return s.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function makeCoreId(ad) {
  if (!ad) return '';
  let clean = String(ad).normalize('NFC').replace(/[​-‍﻿]/g, '').replace(/ /g, ' ').trim();
  if (!clean) return '';
  let s = clean.replace(
    /^(Yrd\.?\s*Doç\.?\s*Dr\.?\s*|Prof\.?\s*Dr\.?\s*|Doç\.?\s*Dr\.?\s*|Uzm\.?\s*Dr\.?\s*|Op\.?\s*Dr\.?\s*|Dr\.?\s*Öğr\.?\s*Üyesi\.?\s*|Dr\.?\s*|Dt\.?\s*|Dyt\.?\s*|Psik\.?\s*|Psk\.?\s*|Ecz\.?\s*|Avt?\.?\s*|Öğr\.?\s*Gör\.?\s*|Arş\.?\s*Gör\.?\s*)/gi,
    ''
  ).trim();
  s = s.replace(/\s+(İLE|ILE|VE|SÖYLEŞİ|SÖYLEŞI|SOYLESI|ile|ve|söyleşi)\.{0,3}\s*$/gi, '').trim();
  return s ? makeSafeId(s) : makeSafeId(clean);
}

// ─── Dışlama filtresi (Kayene, Kyani, Camsoy, Dalkılıç) ─────────────────
function normalize(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
    .replace(/Ş/gi, 's').replace(/Ç/gi, 'c').replace(/Ğ/gi, 'g')
    .replace(/Ö/gi, 'o').replace(/Ü/gi, 'u').toLowerCase();
}
const EXCLUDE_PATTERNS = [
  { name: 'Kayene',         regex: /kayene/i },
  { name: 'Kyani',          regex: /kyani/i },
  { name: 'Tolga Camsoy',   regex: /tolga\s+camsoy/i },
  { name: 'Hakan Dalkılıç', regex: /hakan\s+dalkilic/i },
];
function checkExclude(video) {
  const text = normalize(`${video?.name || ''} ${video?.description || ''}`);
  for (const p of EXCLUDE_PATTERNS) if (p.regex.test(text)) return p.name;
  return null;
}

// ─── Vimeo API ──────────────────────────────────────────────────────────
async function vimeoFetch(path) {
  const url = path.startsWith('http') ? path : `${VIMEO_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `bearer ${VIMEO_TOKEN}`,
      'Accept': 'application/vnd.vimeo.*+json;version=3.4',
    },
  });
  if (!res.ok) throw new Error(`Vimeo ${res.status}`);
  return res.json();
}

async function fetchTranscript(vimeoId) {
  try {
    const tracks = await vimeoFetch(`/videos/${vimeoId}/texttracks`);
    if (!tracks?.data?.length) return null;
    const tr = tracks.data.find(t => t.language === 'tr') || tracks.data[0];
    if (!tr?.link) return null;
    const vttRes = await fetch(tr.link);
    if (!vttRes.ok) return null;
    const vtt = await vttRes.text();
    return vtt
      .replace(/^WEBVTT.*\n/, '')
      .replace(/\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}.*$/gm, '')
      .replace(/^\d+\s*$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch { return null; }
}

// ─── Eğitmen eşleştirme — title token bazlı ─────────────────────────────
function splitTokens(s) {
  return normalize(s).split(/[^a-z0-9]+/).filter(t => t.length >= 3);
}

function matchEgitmen(text, knownList) {
  if (!text) return { coreIds: [], displayNames: [] };
  const textTokens = new Set(splitTokens(text));
  const found = new Map();
  for (const e of knownList) {
    const allFound = e.tokens.every(t => textTokens.has(t));
    if (allFound) found.set(e.coreId, e.ad);
  }
  return {
    coreIds: [...found.keys()],
    displayNames: [...found.values()],
  };
}

// ─── Admin email whitelist ──────────────────────────────────────────────
const ADMIN_EMAILS = new Set([
  's.emretopcu@gmail.com',
  'onlineakademin@gmail.com',
  'toygarsenelmis@gmail.com',
  'alper.kirbiyik@gmail.com',
  'vitamindestegi@gmail.com',
  'kmaziliguney@gmail.com',
  'ilknurakkas17@gmail.com',
  'giray70@gmail.com',
  'furkancite@gmail.com',
]);

// ─── Ana iş ─────────────────────────────────────────────────────────────
export default async (req) => {
  const isScheduled = req?.headers?.get?.('user-agent')?.includes('Netlify');
  const url = req?.url ? new URL(req.url) : null;

  // Manuel tetik: Firebase Auth ID token VEYA INGEST_ADMIN_SECRET (legacy)
  if (!isScheduled && url) {
    const authHeader = req.headers.get('authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const secret = req.headers.get('x-admin-secret') || url.searchParams.get('secret');

    let yetkili = false;
    if (idToken) {
      try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        if (decoded?.email && ADMIN_EMAILS.has(decoded.email)) yetkili = true;
        else console.warn('Auth: email whitelist dışı:', decoded?.email);
      } catch (err) {
        console.warn('Auth: token verify hatası:', err.message);
      }
    }
    if (!yetkili && secret && process.env.INGEST_ADMIN_SECRET === secret) {
      yetkili = true;
    }
    if (!yetkili) {
      return new Response(JSON.stringify({ error: 'Yetkisiz — admin girişi gerekli' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (!VIMEO_TOKEN) {
    return new Response(JSON.stringify({ error: 'VIMEO_TOKEN env var missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const startTime = Date.now();
  console.log(`[vimeo-yeni-cek] başladı | scheduled=${isScheduled}`);

  // 1. Bilinen eğitmenleri yükle (konusmacilar + mevcut atamalar)
  const knownMap = new Map(); // coreId → { coreId, ad, tokens }
  const konSnap = await db.collection('konusmacilar').get();
  for (const d of konSnap.docs) {
    const ad = d.data().ad;
    if (!ad) continue;
    const cid = makeCoreId(ad);
    const tokens = splitTokens(ad.replace(/^(Prof|Doç|Dr|Uzm|Op|Dyt|Dt|Psik|Psk)\.?\s*/gi, ''));
    if (!cid || tokens.length < 2) continue;
    if (!knownMap.has(cid)) knownMap.set(cid, { coreId: cid, ad, tokens });
  }
  const knownList = [...knownMap.values()];
  console.log(`[known] ${knownList.length} eğitmen`);

  // 2. Vimeo'dan son video'ları çek (1 sayfa = 100 video yeter for incremental)
  const data = await vimeoFetch(
    '/me/videos?per_page=100&page=1&sort=date&direction=desc&fields=uri,name,description,link,player_embed_url,duration,release_time,created_time,pictures.sizes'
  );
  const videos = data?.data || [];
  console.log(`[vimeo] ${videos.length} son video alındı`);

  // 3. Her video için Firestore'da var mı kontrol
  let yeniSayisi = 0;
  let mevcutSayisi = 0;
  let excludedSayisi = 0;
  const yeniler = [];

  for (const v of videos) {
    const vimeoId = String(v.uri || '').split('/').pop();
    if (!vimeoId) continue;

    const ref = db.collection('kayitli_egitimler').doc(vimeoId);
    const existing = await ref.get();
    if (existing.exists) {
      mevcutSayisi++;
      continue;
    }

    // Yeni video — ekle
    const excludeReason = checkExclude(v);
    if (excludeReason) {
      excludedSayisi++;
      await ref.set({
        vimeoId,
        baslik: v.name || '',
        kayeneFiltrelendi: true,
        filtreliSebep: excludeReason,
        olusturulmaTarihi: admin.firestore.FieldValue.serverTimestamp(),
        guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      continue;
    }

    const matchText = `${v.name || ''} ${(v.description || '').slice(0, 300)}`;
    const eg = matchEgitmen(matchText, knownList);
    const transcript = await fetchTranscript(vimeoId);

    const thumb = v.pictures?.sizes?.[3]?.link || v.pictures?.sizes?.slice(-1)?.[0]?.link || null;
    const tarih = (v.release_time || v.created_time || '').slice(0, 10);

    const doc = {
      vimeoId,
      baslik: v.name || '',
      aciklama: v.description || '',
      tarih,
      sure: v.duration || 0,
      embedUrl: v.player_embed_url || `https://player.vimeo.com/video/${vimeoId}`,
      vimeoUrl: v.link || '',
      thumbnailUrl: thumb,
      egitmenler: eg.coreIds,
      egitmenAdlari: eg.displayNames,
      eslesmemis: eg.coreIds.length === 0,
      kategoriler: [],
      kategoriKaynagi: 'pending', // sonra Gemini scheduled function işler
      transcript,
      transcriptVar: !!transcript,
      kayeneFiltrelendi: false,
      olusturulmaTarihi: admin.firestore.FieldValue.serverTimestamp(),
      guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
    };
    await ref.set(doc, { merge: true });
    yeniSayisi++;
    if (yeniler.length < 10) {
      yeniler.push({ vimeoId, baslik: v.name, egitmen: eg.displayNames.join(', ') || '(eşleşmemiş)' });
    }
  }

  const sure = ((Date.now() - startTime) / 1000).toFixed(1);
  const summary = {
    sureSn: parseFloat(sure),
    taranan: videos.length,
    yeni: yeniSayisi,
    excludedYeni: excludedSayisi,
    mevcut: mevcutSayisi,
    yeniler,
  };
  console.log('[vimeo-yeni-cek] done:', JSON.stringify(summary));

  return new Response(JSON.stringify(summary, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

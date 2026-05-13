// netlify/functions/vimeo-ingest.mjs
// ─────────────────────────────────────────────────────────────────────────
// Vimeo'dan video listesini çek → Firestore `kayitli_egitimler` collection'ına yaz.
// Manuel tetikli (scheduled DEĞİL). Admin secret ile korunur.
//
// Endpoint:
//   GET /.netlify/functions/vimeo-ingest?dryRun=true   → ilk 10 videoyu loglar, yazmaz
//   GET /.netlify/functions/vimeo-ingest?dryRun=false  → tam ingest
//   GET /.netlify/functions/vimeo-ingest?page=N        → tek sayfa
//   GET /.netlify/functions/vimeo-ingest?limit=20      → kaç video işlensin (test)
//
// Header gerekli:
//   x-admin-secret: <INGEST_ADMIN_SECRET env var>
//
// Env vars:
//   VIMEO_TOKEN              — Vimeo API token (CREDENTIALS_BACKUP)
//   FIREBASE_PROJECT_ID      — Firebase admin
//   FIREBASE_CLIENT_EMAIL    — Firebase admin
//   FIREBASE_PRIVATE_KEY     — Firebase admin
//   INGEST_ADMIN_SECRET      — bu function'ı tetikleyebilen secret
// ─────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';

// Firebase Admin init (singleton)
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

// ─── Yardımcı: isim normalize (DataContext.jsx ile birebir aynı) ────────
const TR_LOWER = { 'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'I': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
function makeSafeId(ad) {
  if (!ad) return '';
  let s = String(ad).normalize('NFC').replace(/[​-‍﻿]/g, '').replace(/ /g, ' ').trim();
  s = s.replace(/[ÇĞİIÖŞÜçğıöşü]/g, c => TR_LOWER[c.toUpperCase()] || c.toLowerCase());
  s = s.toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return s;
}

// Unvanları \s* ile sıyır — "Dr.TUNÇ" gibi boşluksuz formatlar da geçer
function makeCoreId(ad) {
  if (!ad) return '';
  let clean = String(ad).normalize('NFC')
    .replace(/[​-‍﻿]/g, '')
    .replace(/ /g, ' ')
    .trim();
  if (!clean) return '';
  let s = clean.replace(
    /^(Yrd\.?\s*Doç\.?\s*Dr\.?\s*|Prof\.?\s*Dr\.?\s*|Doç\.?\s*Dr\.?\s*|Uzm\.?\s*Dr\.?\s*|Op\.?\s*Dr\.?\s*|Dr\.?\s*Öğr\.?\s*Üyesi\.?\s*|Dr\.?\s*|Dt\.?\s*|Dyt\.?\s*|Psik\.?\s*|Psk\.?\s*|Ecz\.?\s*|Avt?\.?\s*|Öğr\.?\s*Gör\.?\s*|Arş\.?\s*Gör\.?\s*)/gi,
    ''
  ).trim();
  if (s === clean) {
    s = clean.replace(
      /^(yrd_doc_dr_|prof_dr_|doc_dr_|uzm_dr_|op_dr_|dr_ogr_uyesi_|dr_|dt_|dyt_|psik_|psk_|ecz_|avt?_|ogr_gor_|ars_gor_)/i,
      ''
    ).trim();
  }
  s = s.replace(/\s+(İLE|ILE|VE|SÖYLEŞİ|SÖYLEŞI|SOYLESI|ile|ve|söyleşi)\.{0,3}\s*$/gi, '').trim();
  return s ? makeSafeId(s) : makeSafeId(clean);
}

// İsim parse — virgül/slash/ampersand/tire ile ayrılmış adları böl
function splitEgitmen(e) {
  if (!e) return [];
  return String(e).normalize('NFC').replace(/[​-‍﻿]/g, '').replace(/ /g, ' ')
    .split(/[\/,&]|\s*-\s*(?=[A-ZÇĞİÖŞÜa-zçğışöşü]*\.?\s*[A-ZÇĞİÖŞÜ]|Prof\.|Do[çc]\.|Uzm\.|Dr\.|Dyt\.|Op\.)/)
    .map(n => n.trim()).filter(n => n.length > 1);
}

// ─── Vimeo'dan video çek ─────────────────────────────────────────────────
async function vimeoFetch(path) {
  const url = path.startsWith('http') ? path : `${VIMEO_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `bearer ${VIMEO_TOKEN}`,
      'Accept': 'application/vnd.vimeo.*+json;version=3.4',
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Vimeo ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

// Vimeo otomatik transcript çek (texttracks endpoint)
async function fetchTranscript(vimeoId) {
  try {
    const tracks = await vimeoFetch(`/videos/${vimeoId}/texttracks`);
    if (!tracks?.data?.length) return null;
    // En uzun veya 'tr' dilini tercih et
    const tr = tracks.data.find(t => t.language === 'tr') || tracks.data[0];
    if (!tr?.link) return null;
    const vttRes = await fetch(tr.link);
    if (!vttRes.ok) return null;
    const vtt = await vttRes.text();
    // VTT'den sadece metni çıkar (timestamps + cue numaralarını at)
    return vtt
      .replace(/^WEBVTT.*\n/, '')
      .replace(/\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}.*$/gm, '')
      .replace(/^\d+\s*$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch (e) {
    console.warn(`[transcript] ${vimeoId}: ${e.message}`);
    return null;
  }
}

// ─── Eğitmen eşleştirme ──────────────────────────────────────────────────
// videoTitle + description'dan eğitmen adlarını çıkar, Firestore'daki coreId'lerle eşle
function matchEgitmen(text, knownCoreIds) {
  if (!text) return { coreIds: [], displayNames: [] };
  const adlar = splitEgitmen(text);
  const matches = new Map(); // coreId → displayName
  for (const ad of adlar) {
    const cid = makeCoreId(ad);
    if (cid && knownCoreIds.has(cid)) {
      matches.set(cid, knownCoreIds.get(cid));
    }
  }
  return {
    coreIds: [...matches.keys()],
    displayNames: [...matches.values()],
  };
}

// ─── Dışlama filtresi (Kayene + Kyani + Tolga Camsoy + Hakan Dalkılıç) ───
const EXCLUDE_PATTERNS = [
  { name: 'Kayene',         regex: /kayene/i },
  { name: 'Kyani',          regex: /\bkyani\b/i },
  { name: 'Tolga Camsoy',   regex: /tolga\s+cam[sş]oy/i },
  { name: 'Hakan Dalkılıç', regex: /hakan\s+dalk[ıi]l[ıi][çc]/i },
];
function checkExclude(video) {
  const text = `${video?.name || ''} ${video?.description || ''}`;
  for (const p of EXCLUDE_PATTERNS) {
    if (p.regex.test(text)) return p.name;
  }
  return null;
}

// ─── Tek video → Firestore doc ───────────────────────────────────────────
function buildVideoDoc(video, egitmenler, transcript) {
  const vimeoId = String(video.uri || '').split('/').pop();
  const thumb = video.pictures?.sizes?.[3]?.link || video.pictures?.sizes?.[0]?.link || null;
  const tarih = (video.release_time || video.created_time || '').slice(0, 10);
  return {
    vimeoId,
    baslik: video.name || '',
    aciklama: video.description || '',
    tarih, // YYYY-MM-DD
    sure: video.duration || 0,
    embedUrl: video.player_embed_url || `https://player.vimeo.com/video/${vimeoId}`,
    vimeoUrl: video.link || '',
    thumbnailUrl: thumb,
    egitmenler: egitmenler.coreIds,
    egitmenAdlari: egitmenler.displayNames,
    eslesmemis: egitmenler.coreIds.length === 0,  // admin paneli için
    kategoriler: [], // Faz 4'te AI doldurur
    kategoriKaynagi: 'pending',
    transcript: transcript || null,
    transcriptVar: !!transcript,
    kayeneFiltrelendi: false,
    olusturulmaTarihi: admin.firestore.FieldValue.serverTimestamp(),
    guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
  };
}

// ─── Ana ingest döngüsü ──────────────────────────────────────────────────
export default async (req) => {
  // Auth check
  const url = new URL(req.url);
  const secret = req.headers.get('x-admin-secret') || url.searchParams.get('secret');
  if (!process.env.INGEST_ADMIN_SECRET || secret !== process.env.INGEST_ADMIN_SECRET) {
    return new Response('Forbidden — x-admin-secret header missing or invalid', { status: 403 });
  }
  if (!VIMEO_TOKEN) {
    return new Response('VIMEO_TOKEN env var missing', { status: 500 });
  }

  const dryRun = url.searchParams.get('dryRun') !== 'false';
  const startPage = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '0', 10) || Infinity;
  const skipTranscript = url.searchParams.get('skipTranscript') === 'true';

  console.log(`[vimeo-ingest] start | dryRun=${dryRun} | page=${startPage} | limit=${limit}`);

  // 1. Firestore'daki konuşmacıları çek (coreId map)
  const konusmacilarSnap = await db.collection('konusmacilar').get();
  const knownCoreIds = new Map(); // coreId → displayName
  konusmacilarSnap.forEach(d => {
    const data = d.data();
    if (!data.ad) return;
    const cid = makeCoreId(data.ad);
    if (cid) knownCoreIds.set(cid, data.ad);
  });
  // Takvim'deki egitmen alanlarından da çıkar
  const takvimSnap = await db.collection('takvim').get();
  takvimSnap.forEach(d => {
    splitEgitmen(d.data().egitmen).forEach(ad => {
      const cid = makeCoreId(ad);
      if (cid && !knownCoreIds.has(cid)) knownCoreIds.set(cid, ad);
    });
  });
  console.log(`[vimeo-ingest] ${knownCoreIds.size} known coreId loaded`);

  // 2. Vimeo'dan paginate çek
  let nextUrl = `/me/videos?per_page=100&page=${startPage}&fields=uri,name,description,link,player_embed_url,duration,release_time,created_time,pictures.sizes`;
  let totalIngested = 0;
  let totalExcluded = 0;
  const excludedBreakdown = {};
  let totalUnmatched = 0;
  const sampleOutput = [];

  while (nextUrl && totalIngested < limit) {
    const data = await vimeoFetch(nextUrl);
    const videos = data.data || [];
    console.log(`[vimeo-ingest] page ${startPage}: ${videos.length} videos`);

    // Batch write — Firestore commit hard limit ~11.5 MB / 500 doc
    let batch = db.batch();
    let batchCount = 0;
    let batchBytes = 0;
    const BATCH_BYTE_BUDGET = 7_500_000;
    const BATCH_DOC_LIMIT = 100;

    for (const video of videos) {
      if (totalIngested >= limit) break;
      const vimeoId = String(video.uri || '').split('/').pop();
      if (!vimeoId) continue;

      // Dışlama filtresi (Kayene / Kyani / Tolga Camsoy / Hakan Dalkılıç)
      const excludeReason = checkExclude(video);
      if (excludeReason) {
        totalExcluded++;
        excludedBreakdown[excludeReason] = (excludedBreakdown[excludeReason] || 0) + 1;
        if (dryRun && sampleOutput.length < 10) {
          sampleOutput.push({ vimeoId, name: video.name, status: `EXCLUDE:${excludeReason}` });
        }
        // Yine de Firestore'a yaz ama kayeneFiltrelendi: true → UI'da gözükmez
        if (!dryRun) {
          const ref = db.collection('kayitli_egitimler').doc(vimeoId);
          batch.set(ref, {
            vimeoId,
            baslik: video.name || '',
            kayeneFiltrelendi: true,        // legacy field, query bunu filtreliyor
            filtreliSebep: excludeReason,   // hangi terim yakaladı
            olusturulmaTarihi: admin.firestore.FieldValue.serverTimestamp(),
            guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          batchCount++;
          batchBytes += 500;
        }
        continue;
      }

      // Eğitmen eşle
      const eg = matchEgitmen(`${video.name} ${video.description}`, knownCoreIds);
      if (eg.coreIds.length === 0) totalUnmatched++;

      // Transcript
      let transcript = null;
      if (!skipTranscript && !dryRun) {
        transcript = await fetchTranscript(vimeoId);
      }

      const doc = buildVideoDoc(video, eg, transcript);

      if (dryRun) {
        if (sampleOutput.length < 10) {
          sampleOutput.push({
            vimeoId, name: video.name,
            tarih: doc.tarih,
            egitmenler: doc.egitmenAdlari,
            transcriptVar: doc.transcriptVar,
          });
        }
      } else {
        const ref = db.collection('kayitli_egitimler').doc(vimeoId);
        batch.set(ref, doc, { merge: true });
        batchCount++;
        const docBytes = (doc.transcript?.length || 0) * 1.5 + (doc.aciklama?.length || 0) + (doc.baslik?.length || 0) + 500;
        batchBytes += docBytes;
        if (batchCount >= BATCH_DOC_LIMIT || batchBytes >= BATCH_BYTE_BUDGET) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
          batchBytes = 0;
        }
      }

      totalIngested++;
    }

    // Kalan batch'i flush
    if (!dryRun && batchCount > 0) {
      await batch.commit();
    }

    nextUrl = data.paging?.next || null;
    if (!nextUrl) break;
    if (totalIngested >= limit) break;
  }

  const summary = {
    dryRun,
    totalIngested,
    totalExcluded,
    excludedBreakdown,
    totalUnmatched,
    knownCoreIds: knownCoreIds.size,
    sampleOutput,
  };
  console.log('[vimeo-ingest] done:', summary);

  return new Response(JSON.stringify(summary, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

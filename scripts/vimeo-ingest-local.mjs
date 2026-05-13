// scripts/vimeo-ingest-local.mjs
// ─────────────────────────────────────────────────────────────────────────
// LOCAL one-shot ingest. Bilgisayardan çalıştır — Netlify Function DEĞİL.
//
// Kaynak:
//   1) turkish-transcripts.json  → vimeoId + title + link + transcript (37 MB)
//   2) Vimeo API /me/videos       → thumbnail, duration, release_time
//   3) Firestore konusmacilar     → eğitmen eşleşmesi için coreId map
//
// Çıktı: Firestore `kayitli_egitimler` collection (her vimeoId bir doc).
//
// Çalıştırma:
//   cd scripts
//   npm install
//   node vimeo-ingest-local.mjs              # full ingest
//   node vimeo-ingest-local.mjs --dry-run    # ilk 20 video, yazma
//   node vimeo-ingest-local.mjs --limit=100  # ilk 100 video
//   node vimeo-ingest-local.mjs --skip-vimeo # transcript-only mode (metadata yok)
//
// .env (scripts klasöründe):
//   FIREBASE_PROJECT_ID=...
//   FIREBASE_CLIENT_EMAIL=...
//   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
//   VIMEO_TOKEN=668180fb...
//   TRANSCRIPTS_PATH=C:\Users\Emre TOPÇU\Desktop\OneTeamAI-Automation\deploy\netlify\functions\turkish-transcripts.json
// ─────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import admin from 'firebase-admin';
import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (n) => args.find(a => a === `--${n}`) !== undefined;
const param = (n, d) => {
  const a = args.find(a => a.startsWith(`--${n}=`));
  return a ? a.split('=')[1] : d;
};

const DRY_RUN = flag('dry-run');
const SKIP_VIMEO = flag('skip-vimeo');
const LIMIT = parseInt(param('limit', '0'), 10) || Infinity;

const TRANSCRIPTS_PATH = process.env.TRANSCRIPTS_PATH
  || path.join(process.env.USERPROFILE || process.env.HOME, 'Desktop', 'OneTeamAI-Automation', 'deploy', 'netlify', 'functions', 'turkish-transcripts.json');

const VIMEO_TOKEN = process.env.VIMEO_TOKEN;
const VIMEO_BASE = 'https://api.vimeo.com';

// ─── Firebase Admin init ─────────────────────────────────────────────────
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

// ─── Türkçe normalize + coreId (DataContext.jsx ile birebir aynı) ────────
const TR_LOWER = { 'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'I': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
function makeSafeId(ad) {
  if (!ad) return '';
  let s = String(ad).normalize('NFC').replace(/[​-‍﻿]/g, '').replace(/ /g, ' ').trim();
  s = s.replace(/[ÇĞİIÖŞÜçğıöşü]/g, c => TR_LOWER[c.toUpperCase()] || c.toLowerCase());
  s = s.toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return s;
}
// Unvanları sıyır — \s* ile unvan sonrası boşluk OPSIYONEL ("Dr.TUNÇ" da geçer)
function makeCoreId(ad) {
  if (!ad) return '';
  let clean = String(ad).normalize('NFC')
    .replace(/[​-‍﻿]/g, '')
    .replace(/ /g, ' ')
    .trim();
  if (!clean) return '';
  // Doğal format
  let s = clean.replace(
    /^(Yrd\.?\s*Doç\.?\s*Dr\.?\s*|Prof\.?\s*Dr\.?\s*|Doç\.?\s*Dr\.?\s*|Uzm\.?\s*Dr\.?\s*|Op\.?\s*Dr\.?\s*|Dr\.?\s*Öğr\.?\s*Üyesi\.?\s*|Dr\.?\s*|Dt\.?\s*|Dyt\.?\s*|Psik\.?\s*|Psk\.?\s*|Ecz\.?\s*|Avt?\.?\s*|Öğr\.?\s*Gör\.?\s*|Arş\.?\s*Gör\.?\s*)/gi,
    ''
  ).trim();
  // ID format fallback
  if (s === clean) {
    s = clean.replace(
      /^(yrd_doc_dr_|prof_dr_|doc_dr_|uzm_dr_|op_dr_|dr_ogr_uyesi_|dr_|dt_|dyt_|psik_|psk_|ecz_|avt?_|ogr_gor_|ars_gor_)/i,
      ''
    ).trim();
  }
  // Sondaki "İLE", "VE", "SÖYLEŞİ" eklerini temizle
  s = s.replace(/\s+(İLE|ILE|VE|SÖYLEŞİ|SÖYLEŞI|SOYLESI|ile|ve|söyleşi)\.{0,3}\s*$/gi, '').trim();
  return s ? makeSafeId(s) : makeSafeId(clean);
}
function splitEgitmen(e) {
  if (!e) return [];
  return String(e).normalize('NFC').replace(/[​-‍﻿]/g, '').replace(/ /g, ' ')
    .split(/[\/,&]|\s*-\s*(?=[A-ZÇĞİÖŞÜa-zçğışöşü]*\.?\s*[A-ZÇĞİÖŞÜ]|Prof\.|Do[çc]\.|Uzm\.|Dr\.|Dyt\.|Op\.)/)
    .map(n => n.trim()).filter(n => n.length > 1);
}

// ─── Vimeo API helper ────────────────────────────────────────────────────
async function vimeoFetch(p) {
  const url = p.startsWith('http') ? p : `${VIMEO_BASE}${p}`;
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

// Tüm Vimeo videolarını pageleyerek çek — id → metadata map
async function fetchAllVimeoMetadata() {
  if (!VIMEO_TOKEN) {
    console.warn('[vimeo] TOKEN yok, metadata atlandı.');
    return new Map();
  }
  const map = new Map();
  let url = '/me/videos?per_page=100&page=1&fields=uri,name,description,link,player_embed_url,duration,release_time,created_time,pictures.sizes';
  let page = 0;
  while (url) {
    page++;
    process.stdout.write(`\r[vimeo] sayfa ${page}...`);
    const data = await vimeoFetch(url);
    for (const v of data.data || []) {
      const id = String(v.uri || '').split('/').pop();
      if (id) map.set(id, v);
    }
    url = data.paging?.next || null;
  }
  console.log(`\n[vimeo] ${map.size} video metadata yüklendi.`);
  return map;
}

// ─── Eğitmen eşleştirme ──────────────────────────────────────────────────
async function loadKnownCoreIds() {
  const known = new Map(); // coreId → displayName
  const kSnap = await db.collection('konusmacilar').get();
  kSnap.forEach(d => {
    const ad = d.data().ad;
    if (!ad) return;
    const cid = makeCoreId(ad);
    if (cid) known.set(cid, ad);
  });
  const tSnap = await db.collection('takvim').get();
  tSnap.forEach(d => {
    splitEgitmen(d.data().egitmen).forEach(ad => {
      const cid = makeCoreId(ad);
      if (cid && !known.has(cid)) known.set(cid, ad);
    });
  });
  console.log(`[match] ${known.size} bilinen coreId yüklendi.`);
  return known;
}

function matchEgitmen(text, known) {
  if (!text) return { coreIds: [], displayNames: [] };
  const found = new Map();
  // Önce splitEgitmen — virgülle ayrılmış adlar
  for (const ad of splitEgitmen(text)) {
    const cid = makeCoreId(ad);
    if (cid && known.has(cid)) found.set(cid, known.get(cid));
  }
  // Sonra tüm bilinen ad'ları text içinde substring olarak ara (transcript fallback)
  if (found.size === 0) {
    const lowerText = text.toLocaleLowerCase('tr-TR');
    for (const [cid, ad] of known.entries()) {
      if (ad.length < 6) continue; // çok kısa adlar false positive
      if (lowerText.includes(ad.toLocaleLowerCase('tr-TR'))) {
        found.set(cid, ad);
        if (found.size >= 3) break;
      }
    }
  }
  return {
    coreIds: [...found.keys()],
    displayNames: [...found.values()],
  };
}

// ─── Dışlama filtresi (Kayene + Kyani + Tolga Camsoy + Hakan Dalkılıç) ───
// Türkçe karakter ve diakritik normalize (Kyäni, KYANİ, Dalkılıç vs.)
function normalize(s) {
  return (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
    .replace(/Ş/gi, 's').replace(/Ç/gi, 'c').replace(/Ğ/gi, 'g')
    .replace(/Ö/gi, 'o').replace(/Ü/gi, 'u')
    .toLowerCase();
}
const EXCLUDE_PATTERNS = [
  { name: 'Kayene',          regex: /kayene/i },
  { name: 'Kyani',           regex: /kyani/i }, // normalize sonrası Kyäni→kyani, KYANİ→kyani
  { name: 'Tolga Camsoy',    regex: /tolga\s+camsoy/i },
  { name: 'Hakan Dalkılıç',  regex: /hakan\s+dalkilic/i },
];
function checkExclude(title, description) {
  const text = normalize(`${title || ''} ${description || ''}`);
  for (const p of EXCLUDE_PATTERNS) {
    if (p.regex.test(text)) return p.name;
  }
  return null;
}

// ─── Ana akış ────────────────────────────────────────────────────────────
async function main() {
  console.log(`[ingest] başladı | DRY=${DRY_RUN} | SKIP_VIMEO=${SKIP_VIMEO} | LIMIT=${LIMIT}`);
  console.log(`[ingest] transcripts path: ${TRANSCRIPTS_PATH}`);

  // 1. Transcript JSON yükle
  let transcriptsRaw;
  try {
    const text = await fs.readFile(TRANSCRIPTS_PATH, 'utf-8');
    transcriptsRaw = JSON.parse(text);
  } catch (err) {
    console.error('[ingest] transcript dosyası okunamadı:', err.message);
    process.exit(1);
  }
  const transcriptKeys = Object.keys(transcriptsRaw);
  console.log(`[ingest] ${transcriptKeys.length} transcript yüklendi.`);

  // 2. Vimeo metadata (paralel)
  const vimeoMap = SKIP_VIMEO ? new Map() : await fetchAllVimeoMetadata();

  // 3. Konuşmacı eşleştirme map
  const known = await loadKnownCoreIds();

  // 4. Birleştir + yaz
  let totalIngested = 0;
  let totalExcluded = 0;
  const excludedBreakdown = {};
  let totalUnmatched = 0;
  let totalMissingMeta = 0;
  const sample = [];

  let batch = db.batch();
  let batchCount = 0;
  let batchBytes = 0;
  // Firestore commit hard limit: ~11.5 MB. Safe budget: 7.5 MB.
  const BATCH_BYTE_BUDGET = 7_500_000;
  const BATCH_DOC_LIMIT = 100;

  for (const vimeoId of transcriptKeys) {
    if (totalIngested >= LIMIT) break;
    const t = transcriptsRaw[vimeoId];
    const meta = vimeoMap.get(vimeoId) || null;
    if (!meta) totalMissingMeta++;

    const baslik = (meta?.name || t.title || '').trim();
    const aciklama = (meta?.description || '').trim();

    // Dışlama filtresi (Kayene / Kyani / Tolga Camsoy / Hakan Dalkılıç)
    const excludeReason = checkExclude(baslik, aciklama);
    if (excludeReason) {
      totalExcluded++;
      excludedBreakdown[excludeReason] = (excludedBreakdown[excludeReason] || 0) + 1;
      if (!DRY_RUN) {
        batch.set(db.collection('kayitli_egitimler').doc(vimeoId), {
          vimeoId,
          baslik,
          kayeneFiltrelendi: true,         // legacy field — UI/query bunu filtreliyor
          filtreliSebep: excludeReason,    // hangi terim eşleşti
          olusturulmaTarihi: admin.firestore.FieldValue.serverTimestamp(),
          guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        batchCount++;
        batchBytes += 500; // dışlanan kayıtlar küçük
      }
      if (DRY_RUN && sample.length < 20) {
        sample.push({ vimeoId, title: baslik, status: `EXCLUDE:${excludeReason}` });
      }
      continue;
    }

    // Eğitmen eşle — başlık + açıklama + transcript ilk 1000 karakter
    const matchText = `${baslik} ${aciklama} ${(t.transcript || '').slice(0, 1000)}`;
    const eg = matchEgitmen(matchText, known);
    if (eg.coreIds.length === 0) totalUnmatched++;

    const tarih = (meta?.release_time || meta?.created_time || '').slice(0, 10);
    const thumb = meta?.pictures?.sizes?.[3]?.link
      || meta?.pictures?.sizes?.slice(-1)?.[0]?.link
      || null;

    const doc = {
      vimeoId,
      baslik,
      aciklama,
      tarih,
      sure: meta?.duration || 0,
      embedUrl: meta?.player_embed_url || `https://player.vimeo.com/video/${vimeoId}`,
      vimeoUrl: t.link || meta?.link || `https://vimeo.com/${vimeoId}`,
      thumbnailUrl: thumb,
      egitmenler: eg.coreIds,
      egitmenAdlari: eg.displayNames,
      eslesmemis: eg.coreIds.length === 0,  // admin paneli için
      kategoriler: [],
      kategoriKaynagi: 'pending',
      transcript: t.transcript || null,
      transcriptVar: !!(t.transcript && t.transcript.length > 50),
      plays: t.plays || 0,
      kayeneFiltrelendi: false,
      olusturulmaTarihi: admin.firestore.FieldValue.serverTimestamp(),
      guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (DRY_RUN) {
      if (sample.length < 20) {
        sample.push({
          vimeoId, baslik: doc.baslik, tarih: doc.tarih,
          egitmenler: doc.egitmenAdlari, transcriptVar: doc.transcriptVar,
          metaVar: !!meta,
        });
      }
    } else {
      // Firestore doc size limiti 1 MB — uzun transcript'leri kısalt
      // 1 MB ≈ 1M char ama UTF-8 multibyte char olabilir, güvenli sınır 800K
      if (doc.transcript && doc.transcript.length > 800000) {
        doc.transcript = doc.transcript.slice(0, 800000);
        doc.transcriptTruncated = true;
      }
      batch.set(db.collection('kayitli_egitimler').doc(vimeoId), doc, { merge: true });
      batchCount++;
      // Byte tahmini: transcript + diğer alanlar; UTF-8 için en kötü ~3x ama avg 1.5x
      const docBytes = (doc.transcript?.length || 0) * 1.5 + (doc.aciklama?.length || 0) + (doc.baslik?.length || 0) + 500;
      batchBytes += docBytes;
      if (batchCount >= BATCH_DOC_LIMIT || batchBytes >= BATCH_BYTE_BUDGET) {
        await batch.commit();
        console.log(`[ingest] commit | toplam ${totalIngested + 1} | batch ${batchCount} doc / ~${Math.round(batchBytes/1024)}KB`);
        batch = db.batch();
        batchCount = 0;
        batchBytes = 0;
      }
    }
    totalIngested++;
  }

  if (!DRY_RUN && batchCount > 0) {
    await batch.commit();
    console.log(`[ingest] son commit | ${batchCount} doc`);
  }

  console.log('\n========================================');
  console.log(`✓ ingest tamamlandı (DRY=${DRY_RUN})`);
  console.log(`  Total processed:   ${totalIngested}`);
  console.log(`  Dışlanan toplam:   ${totalExcluded}`);
  for (const [k, v] of Object.entries(excludedBreakdown)) {
    console.log(`    - ${k.padEnd(20)} ${v}`);
  }
  console.log(`  Eşleşmemiş:        ${totalUnmatched}`);
  console.log(`  Vimeo meta eksik:  ${totalMissingMeta}`);
  console.log('========================================');
  if (DRY_RUN) {
    console.log('\nÖrnek (ilk 20):');
    console.log(JSON.stringify(sample, null, 2));
  }
}

main().catch(err => {
  console.error('[ingest] hata:', err);
  process.exit(1);
});

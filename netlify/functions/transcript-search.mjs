// netlify/functions/transcript-search.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST { q: "stres", videoIds: ["123", "456", ...] }
// Frontend filtreleri uyguladıktan sonra aday id'leri gönderir. Burada
// transcriptChunks (timestamp'lı, Whisper) varsa kullanır, yoksa plain
// transcript metnine fallback eder.
//
// PERFORMANS:
//   - Firestore 30'lu batch'ler PARALEL (Promise.all)
//   - transcriptVar=true pre-filter (boş transcript olanları taraya bile gitmez)
//   - .select() field projection (sadece gerekli alanlar çekilir)
//   - In-memory cache (60sn TTL, warm function instance'larında etkin)
//
// Çıktı:
// {
//   results: [{ id: "123", matches: [{ start, end, text, snippet }] }],
//   meta: { taranan, eslesen, chunksHit, textHit, cacheHit, sureMs }
// }
// ─────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';

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

// ─── Cache (in-memory, warm instance'da etkili) ───────────────────────────
const CACHE = new Map(); // key → { ts, payload }
const CACHE_TTL = 60_000; // 60sn
const CACHE_MAX = 200;
function cacheGet(key) {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    CACHE.delete(key);
    return null;
  }
  return entry.payload;
}
function cacheSet(key, payload) {
  if (CACHE.size >= CACHE_MAX) {
    // En eski entry'yi sil
    const firstKey = CACHE.keys().next().value;
    if (firstKey) CACHE.delete(firstKey);
  }
  CACHE.set(key, { ts: Date.now(), payload });
}

// ─── Türkçe normalize ──────────────────────────────────────────────────────
const TR_LOWER = { 'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'I': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
function normalize(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFC')
    .replace(/[ÇĞİIÖŞÜçğıöşü]/g, c => TR_LOWER[c.toUpperCase()] || c.toLowerCase())
    .toLowerCase();
}

function makeSnippet(text, q, maxLen = 140) {
  const nText = normalize(text);
  const nQ = normalize(q);
  const idx = nText.indexOf(nQ);
  if (idx < 0) return text.slice(0, maxLen);
  const halfPad = Math.floor((maxLen - q.length) / 2);
  const start = Math.max(0, idx - halfPad);
  const end = Math.min(text.length, idx + q.length + halfPad);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return prefix + text.slice(start, end) + suffix;
}

// ─── Tek doc için match çıkar ─────────────────────────────────────────────
function findMatches(data, q, nQ) {
  const chunks = data.transcriptChunks;
  const matches = [];

  // 1. ÖNCELİK: transcriptChunks varsa timestamp'lı eşleşme
  if (Array.isArray(chunks) && chunks.length > 0) {
    for (const c of chunks) {
      if (!c.text) continue;
      const nC = normalize(c.text);
      if (nC.includes(nQ)) {
        matches.push({
          start: c.start,
          end: c.end,
          text: c.text,
          snippet: makeSnippet(c.text, q, 140),
        });
        if (matches.length >= 5) break;
      }
    }
    if (matches.length > 0) return { matches, type: 'chunks' };
  }

  // 2. FALLBACK: plain transcript metninde ara (timestamp yok)
  if (typeof data.transcript === 'string' && data.transcript.length > 0) {
    const nText = normalize(data.transcript);
    let pos = 0;
    while (matches.length < 3) {
      const idx = nText.indexOf(nQ, pos);
      if (idx < 0) break;
      matches.push({
        start: null,
        end: null,
        text: '',
        snippet: makeSnippet(
          data.transcript.slice(Math.max(0, idx - 80), idx + nQ.length + 80),
          q, 140
        ),
      });
      pos = idx + nQ.length;
    }
    if (matches.length > 0) return { matches, type: 'text' };
  }

  return { matches: [], type: null };
}

// ─── Tek batch'i çek (paralel için Promise döndürür) ──────────────────────
async function fetchBatch(batch, q, nQ) {
  const snap = await db.collection('kayitli_egitimler')
    .where(admin.firestore.FieldPath.documentId(), 'in', batch)
    .where('transcriptVar', '==', true)
    .select('transcript', 'transcriptChunks')
    .get();
  const out = [];
  let chunks = 0, text = 0;
  for (const d of snap.docs) {
    const { matches, type } = findMatches(d.data(), q, nQ);
    if (matches.length === 0) continue;
    out.push({ id: d.id, matches });
    if (type === 'chunks') chunks++;
    else if (type === 'text') text++;
  }
  return { out, chunks, text };
}

// ─── Handler ───────────────────────────────────────────────────────────────
export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const q = (body.q || '').trim();
    const videoIds = Array.isArray(body.videoIds) ? body.videoIds.slice(0, 1500) : [];

    if (!q || q.length < 2) {
      return new Response(JSON.stringify({ results: [], hint: 'Sorgu en az 2 karakter olmalı' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }
    if (videoIds.length === 0) {
      return new Response(JSON.stringify({ results: [] }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    const t0 = Date.now();

    // Cache kontrolü — aynı sorgu + aynı ID seti son 60sn'de geldi mi
    const idsKey = videoIds.length > 100
      ? `${videoIds.length}-${videoIds[0]}-${videoIds[videoIds.length - 1]}`
      : videoIds.slice().sort().join(',');
    const cacheKey = `${normalize(q)}|${idsKey}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      return new Response(JSON.stringify({
        ...cached,
        meta: { ...cached.meta, cacheHit: true, sureMs: Date.now() - t0 },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    const nQ = normalize(q);

    // PARALEL batch'ler — Firestore documentId() in [...] 30'lu, transcriptVar pre-filter
    const batches = [];
    for (let i = 0; i < videoIds.length; i += 30) {
      batches.push(videoIds.slice(i, i + 30));
    }
    const batchResults = await Promise.all(batches.map(b => fetchBatch(b, q, nQ)));

    const results = [];
    let chunksHit = 0, textHit = 0;
    for (const br of batchResults) {
      results.push(...br.out);
      chunksHit += br.chunks;
      textHit += br.text;
    }

    const payload = {
      results,
      meta: {
        taranan: videoIds.length,
        eslesen: results.length,
        chunksHit,
        textHit,
        cacheHit: false,
        sureMs: Date.now() - t0,
        batchSayisi: batches.length,
      },
    };
    cacheSet(cacheKey, payload);

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[transcript-search] hata:', err.message, err.stack);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

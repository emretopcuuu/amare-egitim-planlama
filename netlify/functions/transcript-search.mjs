// netlify/functions/transcript-search.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST { q: "stres", videoIds: ["123", "456", ...] }
// Frontend önce mevcut filtreleri uygular (kategori, dil, vs), aday video
// id'lerini gönderir. Burada transcriptChunks'larda arama yapılır, eşleşen
// chunk'lar (timestamp + snippet) döndürülür.
//
// Çıktı:
// [
//   { id: "123", matches: [{ start: 45.2, end: 50.1, text: "...stres yönetimi...", snippet: "...stres <mark>yönetimi</mark> çok önemli..." }] }
// ]
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

const TR_LOWER = { 'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'I': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
function normalize(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFC')
    .replace(/[ÇĞİIÖŞÜçğıöşü]/g, c => TR_LOWER[c.toUpperCase()] || c.toLowerCase())
    .toLowerCase();
}

function escapeReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const body = await req.json();
    const q = (body.q || '').trim();
    const videoIds = Array.isArray(body.videoIds) ? body.videoIds.slice(0, 1000) : [];

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

    const nQ = normalize(q);
    const t0 = Date.now();

    // Firestore documentId() in 30'lu batch
    const results = [];
    let chunksHit = 0;
    let textHit = 0;
    for (let i = 0; i < videoIds.length; i += 30) {
      const batch = videoIds.slice(i, i + 30);
      const snap = await db.collection('kayitli_egitimler')
        .where(admin.firestore.FieldPath.documentId(), 'in', batch)
        .get();
      for (const d of snap.docs) {
        const data = d.data();
        const chunks = data.transcriptChunks;
        const matches = [];

        // 1. ÖNCELİK: transcriptChunks varsa timestamp'lı eşleşme döndür
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
          if (matches.length > 0) chunksHit++;
        }

        // 2. FALLBACK: chunks yoksa plain transcript metninde ara (timestamp YOK)
        if (matches.length === 0 && typeof data.transcript === 'string' && data.transcript.length > 0) {
          const nText = normalize(data.transcript);
          // Çoklu eşleşme bul (max 3 snippet)
          let pos = 0;
          while (matches.length < 3) {
            const idx = nText.indexOf(nQ, pos);
            if (idx < 0) break;
            matches.push({
              start: null, // timestamp yok
              end: null,
              text: '',
              snippet: makeSnippet(data.transcript.slice(Math.max(0, idx - 80), idx + nQ.length + 80), q, 140),
            });
            pos = idx + nQ.length;
          }
          if (matches.length > 0) textHit++;
        }

        if (matches.length > 0) {
          results.push({ id: d.id, matches });
        }
      }
    }

    return new Response(JSON.stringify({
      results,
      meta: {
        taranan: videoIds.length,
        eslesen: results.length,
        chunksHit, // timestamp'lı eşleşmeler
        textHit,   // sadece düz metin (timestamp yok)
        sureMs: Date.now() - t0,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[transcript-search] hata:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

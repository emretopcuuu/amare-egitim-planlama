// netlify/functions/anlar-popularla.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST { vimeoId, start, kaynak }  (auth gerekli)
//   - Bir aha moment / bookmark / chunk'a tıklanınca çağrılır
//   - Firestore'da popular_anlar/{vimeoId__start} doc'unun sayacını artırır
//
// GET  ?limit=10   (public)
//   - Top N en popüler an'ı döner (24sa cache)
//
// Cache: popular_anlar_cache/main (1 saat TTL)
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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 saat

function jsonRes(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const db = admin.firestore();

  try {
    // ─── POST: kayıt ────────────────────────────────────────────────
    if (req.method === 'POST') {
      const auth = req.headers.get('authorization') || '';
      const m = auth.match(/^Bearer\s+(.+)$/i);
      if (!m) return jsonRes({ error: 'Token gerekli' }, 401);
      try { await admin.auth().verifyIdToken(m[1]); }
      catch { return jsonRes({ error: 'Geçersiz token' }, 401); }

      const body = await req.json();
      const vimeoId = String(body.vimeoId || '').trim();
      const start = Math.floor(Number(body.start) || 0);
      const kaynak = ['aha', 'bookmark', 'chunk', 'chapter'].includes(body.kaynak) ? body.kaynak : 'chunk';

      if (!vimeoId || start < 0) return jsonRes({ error: 'vimeoId + start gerekli' }, 400);

      // Bucket: her 10sn'ye yuvarla — yakın tıklamalar aynı an'a sayılsın
      const bucket = Math.floor(start / 10) * 10;
      const docId = `${vimeoId}__${bucket}`;

      const ref = db.doc(`popular_anlar/${docId}`);
      await ref.set({
        vimeoId,
        start: bucket,
        kaynak,
        sayac: admin.firestore.FieldValue.increment(1),
        sonGuncelleme: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      return jsonRes({ ok: true, bucket });
    }

    // ─── GET: liste ─────────────────────────────────────────────────
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10)));

      // Cache
      const cacheRef = db.doc('popular_anlar_cache/main');
      const cacheSnap = await cacheRef.get();
      if (cacheSnap.exists) {
        const c = cacheSnap.data();
        const ts = c.timestamp?._seconds * 1000 || 0;
        if (Date.now() - ts < CACHE_TTL_MS && Array.isArray(c.anlar)) {
          return jsonRes({ anlar: c.anlar.slice(0, limit), cached: true });
        }
      }

      // Top N
      const snap = await db.collection('popular_anlar')
        .orderBy('sayac', 'desc')
        .limit(Math.max(limit, 20))
        .get();

      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Video metadata + AI sebep enrichment (her video için tek call)
      const vimeoIds = Array.from(new Set(raw.map(r => r.vimeoId).filter(Boolean)));
      const videoMeta = {};
      for (let i = 0; i < vimeoIds.length; i += 10) {
        const batch = vimeoIds.slice(i, i + 10);
        const docs = await Promise.all(batch.map(vid =>
          db.doc(`kayitli_egitimler/${vid}`).get()
        ));
        docs.forEach((d, idx) => {
          if (d.exists) {
            const data = d.data();
            videoMeta[batch[idx]] = {
              baslik: data.baslik,
              egitmenAdlari: data.egitmenAdlari || [],
              thumbnailUrl: data.thumbnailUrl,
            };
          }
        });
      }

      // AI analiz'lerden bu noktaya yakın metni bul (tolerans ±15sn)
      const aiCache = {};
      for (const vid of vimeoIds) {
        try {
          const ai = await db.doc(`kayitli_egitimler/${vid}/ai_analiz/main`).get();
          if (ai.exists) aiCache[vid] = ai.data();
        } catch {}
      }

      const anlar = raw.map(r => {
        const meta = videoMeta[r.vimeoId] || {};
        const ai = aiCache[r.vimeoId];
        let alintiText = null;
        let alintiSebep = null;
        if (ai && Array.isArray(ai.ahaMoments)) {
          const near = ai.ahaMoments.find(a => Math.abs((a.start || 0) - r.start) < 15);
          if (near) {
            alintiText = near.text;
            alintiSebep = near.sebep;
          }
        }
        return {
          vimeoId: r.vimeoId,
          start: r.start,
          sayac: r.sayac || 0,
          kaynak: r.kaynak,
          baslik: meta.baslik,
          egitmenAdlari: meta.egitmenAdlari,
          thumbnailUrl: meta.thumbnailUrl,
          alintiText,
          alintiSebep,
        };
      });

      try {
        await cacheRef.set({
          anlar,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch {}

      return jsonRes({ anlar: anlar.slice(0, limit), cached: false });
    }

    return jsonRes({ error: 'GET veya POST' }, 405);

  } catch (err) {
    console.error('[anlar-popularla] hata:', err.message);
    return jsonRes({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }, 500);
  }
};

// netlify/functions/bugunun-ilhami.mjs
// ─────────────────────────────────────────────────────────────────────────
// GET /.netlify/functions/bugunun-ilhami
// Public — auth gerektirmez. Anonim ziyaretçi de görür.
//
// Günlük rastgele 1 Aha moment döner (tüm AI analiz'lenmiş videolardan).
// Cache: gunluk_ilham_cache/{YYYY-MM-DD} (24sa TTL)
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
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function dateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  try {
    const bugun = dateKey();
    const db = admin.firestore();

    // Cache kontrolü
    const cacheRef = db.doc(`gunluk_ilham_cache/${bugun}`);
    const cacheSnap = await cacheRef.get();
    if (cacheSnap.exists) {
      return new Response(JSON.stringify({ ...cacheSnap.data(), cached: true }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600', ...CORS },
      });
    }

    // AI analiz'lenmiş videoları topla — collectionGroup query
    // Performans: tüm ai_analiz/main doc'larını çek (1 fetch)
    const aiSnap = await db.collectionGroup('ai_analiz').limit(1000).get();
    const ahaPool = [];
    aiSnap.forEach(doc => {
      const data = doc.data();
      if (Array.isArray(data.ahaMoments) && data.ahaMoments.length > 0) {
        // Path: kayitli_egitimler/{vimeoId}/ai_analiz/main
        const vimeoId = doc.ref.parent.parent?.id;
        if (vimeoId) {
          data.ahaMoments.forEach(a => {
            if (a.text && a.text.length >= 30) {
              ahaPool.push({ ...a, vimeoId });
            }
          });
        }
      }
    });

    if (ahaPool.length === 0) {
      return new Response(JSON.stringify({
        baslik: 'Henüz AI küratör yok',
        mesaj: 'İlk video analiz edilince burada görünecek.',
        ilham: null,
      }), { headers: { 'Content-Type': 'application/json', ...CORS } });
    }

    // Bugünün seçimi — günlük seed ile deterministic rastgele
    // (aynı gün herkes aynı ilhamı görsün)
    const seed = parseInt(bugun.replace(/-/g, ''), 10);
    const idx = seed % ahaPool.length;
    const secilen = ahaPool[idx];

    // Video bilgilerini al
    let videoBilgi = null;
    try {
      const vSnap = await db.doc(`kayitli_egitimler/${secilen.vimeoId}`).get();
      if (vSnap.exists) {
        const v = vSnap.data();
        videoBilgi = {
          vimeoId: secilen.vimeoId,
          baslik: v.baslik,
          egitmenAdlari: v.egitmenAdlari || [],
          thumbnailUrl: v.thumbnailUrl,
          sure: v.sure,
        };
      }
    } catch {}

    const sonuc = {
      tarih: bugun,
      ilham: {
        text: secilen.text,
        sebep: secilen.sebep,
        start: secilen.start,
        vimeoId: secilen.vimeoId,
      },
      video: videoBilgi,
      poolSize: ahaPool.length,
    };

    // Cache yaz
    try {
      await cacheRef.set({
        ...sonuc,
        olusturuldu: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) { console.warn('[bugunun-ilhami] cache write err:', e.message); }

    return new Response(JSON.stringify({ ...sonuc, cached: false }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600', ...CORS },
    });

  } catch (err) {
    console.error('[bugunun-ilhami] hata:', err.message);
    return new Response(JSON.stringify({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
};

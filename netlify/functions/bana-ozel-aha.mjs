// netlify/functions/bana-ozel-aha.mjs
// ─────────────────────────────────────────────────────────────────────────
// GET /.netlify/functions/bana-ozel-aha
//   Authorization: Bearer <Firebase ID Token>
//
// Kullanıcının rank + izleme geçmişine göre kişisel 1 Aha moment seçer.
// Cache: users/{uid}/ai_cache/bana_ozel_aha (12 saat TTL)
//
// Algoritma:
// 1. Kullanıcının curriculum rank'inden, ai_analiz olan video havuzu
// 2. İzlemediği videolar öncelikli
// 3. Rank'ine uygun ana tema (liderlik/satış/vb) ile filter
// 4. Random select
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
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  try {
    const auth = req.headers.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return new Response(JSON.stringify({ error: 'Token gerekli' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
    });
    let decoded;
    try { decoded = await admin.auth().verifyIdToken(m[1]); }
    catch { return new Response(JSON.stringify({ error: 'Geçersiz token' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
    }); }
    const uid = decoded.uid;
    const db = admin.firestore();

    // 12 saat cache
    const cacheRef = db.doc(`users/${uid}/ai_cache/bana_ozel_aha`);
    const cacheSnap = await cacheRef.get();
    if (cacheSnap.exists) {
      const ts = cacheSnap.data().timestamp?._seconds * 1000 || 0;
      if (Date.now() - ts < 12 * 60 * 60 * 1000) {
        return new Response(JSON.stringify({ ...cacheSnap.data(), cached: true }), {
          headers: { 'Content-Type': 'application/json', ...CORS },
        });
      }
    }

    // Kullanıcı izleme geçmişi
    const izlenenIds = new Set();
    try {
      const wpSnap = await db.collection(`users/${uid}/watch_progress`).limit(200).get();
      wpSnap.forEach(d => izlenenIds.add(d.id));
    } catch {}

    // AI analiz havuzunu çek
    const aiSnap = await db.collectionGroup('ai_analiz').limit(500).get();
    const havuz = [];
    aiSnap.forEach(doc => {
      const data = doc.data();
      const vimeoId = doc.ref.parent.parent?.id;
      if (!vimeoId || izlenenIds.has(vimeoId)) return; // izledim
      if (!Array.isArray(data.ahaMoments) || data.ahaMoments.length === 0) return;
      data.ahaMoments.forEach(a => {
        if (a.text && a.text.length >= 30) {
          havuz.push({ ...a, vimeoId, anaTema: data.ozet?.anaTema });
        }
      });
    });

    if (havuz.length === 0) {
      return new Response(JSON.stringify({
        baslik: 'Yeni öneri yok',
        mesaj: 'Tüm AI analiz\'lenmiş videoları izledin veya henüz analiz yapılmamış.',
        ilham: null,
      }), { headers: { 'Content-Type': 'application/json', ...CORS } });
    }

    // Rastgele seç — gelecekte: rank/tema'ya göre weighted random
    const secilen = havuz[Math.floor(Math.random() * havuz.length)];

    // Video bilgisi
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
      ilham: {
        text: secilen.text,
        sebep: secilen.sebep,
        start: secilen.start,
        vimeoId: secilen.vimeoId,
      },
      video: videoBilgi,
      anaTema: secilen.anaTema,
      poolSize: havuz.length,
    };

    try {
      await cacheRef.set({
        ...sonuc,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch {}

    return new Response(JSON.stringify({ ...sonuc, cached: false }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    });

  } catch (err) {
    console.error('[bana-ozel-aha] hata:', err.message);
    return new Response(JSON.stringify({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
};

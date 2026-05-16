// netlify/functions/ekip-leaderboard.mjs
// ─────────────────────────────────────────────────────────────────────────
// GET /.netlify/functions/ekip-leaderboard
//   Authorization: Bearer <Firebase ID Token>
//
// Sponsor liderlik tablosu — bu hafta en iyi karne skoruna sahip sponsorlar.
// 1 saatlik cache (leaderboard_cache/{week}).
//
// Anonim sponsorlar: sadece ön ad + son harf gösterilir (privacy).
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

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// "Mehmet Akif Topçu" → "Mehmet T."
function maskName(ad) {
  if (!ad) return 'Anonim';
  const parts = String(ad).trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  try {
    // Auth
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
    const callerUid = decoded.uid;

    const buHafta = isoWeek(new Date());

    // 1 saatlik cache kontrolü
    const cacheRef = admin.firestore().doc(`leaderboard_cache/${buHafta}`);
    const cacheSnap = await cacheRef.get();
    const birSaat = 60 * 60 * 1000;
    let leaderboard = null;

    if (cacheSnap.exists) {
      const c = cacheSnap.data();
      const ts = c.timestamp?._seconds * 1000 || 0;
      if (Date.now() - ts < birSaat && c.items) {
        leaderboard = c.items;
      }
    }

    // Cache yoksa/eski → yeniden hesapla
    if (!leaderboard) {
      // 1. Tüm users'ı çek (amareId'si olan)
      const usersSnap = await admin.firestore().collection('users')
        .where('amareId', '!=', null)
        .limit(500)
        .get();

      const candidates = [];
      const promises = [];
      usersSnap.forEach(doc => {
        const d = doc.data();
        if (!d.amareId) return;
        promises.push((async () => {
          try {
            const k = await admin.firestore().doc(`users/${doc.id}/karne_log/${buHafta}`).get();
            if (k.exists) {
              candidates.push({
                uid: doc.id,
                ad: d.displayName || d.adSoyad || 'Anonim',
                fotoURL: d.fotoURL || null,
                amareId: String(d.amareId),
                skor: k.data().skor || 0,
                toplam: k.data().toplam || 0,
                aktif: k.data().aktif || 0,
                siteKullanan: k.data().siteKullanan || 0,
              });
            }
          } catch {}
        })());
      });
      await Promise.all(promises);

      // 2. Skor sırasına göre sırala
      candidates.sort((a, b) => b.skor - a.skor);
      // Aynı skorda toplam üye sayısı yüksek olan üstte
      // Cache'le (top 50 — privacy için sadece top 10 dönecek ama daha fazla saklayalım)
      leaderboard = candidates.slice(0, 50);

      try {
        await cacheRef.set({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          week: buHafta,
          items: leaderboard,
        });
      } catch (e) {
        console.warn('[leaderboard] cache write err:', e.message);
      }
    }

    // 3. Caller'ın pozisyonunu bul
    const callerPos = leaderboard.findIndex(l => l.uid === callerUid) + 1;
    const callerItem = leaderboard.find(l => l.uid === callerUid);

    // 4. Top 10 + maskeli isim
    const top = leaderboard.slice(0, 10).map((item, i) => ({
      sira: i + 1,
      uid: item.uid === callerUid ? item.uid : 'masked', // Sadece kendininki açık
      ad: item.uid === callerUid ? item.ad : maskName(item.ad),
      kendin: item.uid === callerUid,
      fotoURL: item.uid === callerUid ? item.fotoURL : null,
      skor: item.skor,
      toplam: item.toplam,
      aktif: item.aktif,
      siteKullanan: item.siteKullanan,
    }));

    return new Response(JSON.stringify({
      week: buHafta,
      toplam: leaderboard.length,
      top,
      callerPos: callerPos > 0 ? callerPos : null,
      callerSkor: callerItem?.skor || 0,
    }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=300', ...CORS } });

  } catch (err) {
    console.error('[leaderboard] hata:', err.message, err.stack);
    return new Response(JSON.stringify({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
};

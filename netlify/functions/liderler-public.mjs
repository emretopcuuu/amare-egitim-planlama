// netlify/functions/liderler-public.mjs
// ─────────────────────────────────────────────────────────────────────────
// GET /.netlify/functions/liderler-public
//   Public, auth gerektirmez. Anonim ziyaretçi de görebilir.
//
// 3 liste döner:
//   - Top 10 sponsor (karne skoru)
//   - Top 10 en çok izleyen üye (streak + toplam izleme)
//   - Top 10 en yüksek puanlı video
//
// Privacy: tüm isimler maskeli ("Mehmet T.")
// 1 saatlik cache (liderler_cache/buHafta)
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

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function maskAd(ad) {
  if (!ad) return 'Anonim';
  const parts = String(ad).trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  try {
    const db = admin.firestore();
    const buHafta = isoWeek(new Date());

    // 1 saatlik cache
    const cacheRef = db.doc(`liderler_cache/${buHafta}`);
    const cacheSnap = await cacheRef.get();
    if (cacheSnap.exists) {
      const c = cacheSnap.data();
      const ts = c.timestamp?._seconds * 1000 || 0;
      if (Date.now() - ts < 60 * 60 * 1000) {
        return new Response(JSON.stringify({ ...c, cached: true }), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600', ...CORS },
        });
      }
    }

    // 1. Sponsor karnesi top 10 (leaderboard_cache'den)
    let topSponsorlar = [];
    try {
      const lbSnap = await db.doc(`leaderboard_cache/${buHafta}`).get();
      if (lbSnap.exists) {
        topSponsorlar = (lbSnap.data().items || [])
          .filter(s => s.skor > 0)
          .slice(0, 10)
          .map(s => ({
            ad: maskAd(s.ad),
            skor: s.skor,
            ekipSayisi: s.toplam,
            aktif: s.aktif,
            avatar: null, // privacy
          }));
      }
    } catch {}

    // 2. En çok izleyen üyeler — streak.total veya streak.longest
    let topIzleyen = [];
    try {
      const usersSnap = await db.collection('users')
        .where('amareId', '!=', null)
        .limit(500)
        .get();
      const users = [];
      usersSnap.forEach(d => {
        const data = d.data();
        const izleme = data.streak?.total || 0;
        const longest = data.streak?.longest || 0;
        if (izleme > 0 || longest > 0) {
          users.push({
            ad: maskAd(data.displayName || data.adSoyad),
            izlemeSayisi: izleme,
            enUzunStreak: longest,
            mevcutStreak: data.streak?.current || 0,
          });
        }
      });
      topIzleyen = users
        .sort((a, b) => (b.izlemeSayisi + b.enUzunStreak * 3) - (a.izlemeSayisi + a.enUzunStreak * 3))
        .slice(0, 10);
    } catch (e) {
      console.warn('[liderler] izleyen err:', e.message);
    }

    // 3. En yüksek puanlı 10 video
    let topVideo = [];
    try {
      const vSnap = await db.collection('kayitli_egitimler')
        .where('kayeneFiltrelendi', '==', false)
        .orderBy('puanOrt', 'desc')
        .limit(20)
        .get();
      topVideo = vSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(v => (v.puanSayisi || 0) >= 1) // En az 1 oy
        .slice(0, 10)
        .map(v => ({
          vimeoId: v.vimeoId,
          baslik: v.baslik,
          puanOrt: v.puanOrt,
          puanSayisi: v.puanSayisi,
          thumbnailUrl: v.thumbnailUrl,
          egitmenAdlari: v.egitmenAdlari || [],
          plays: v.plays || 0,
        }));
    } catch (e) {
      // Index gerekebilir
      console.warn('[liderler] video sort err:', e.message);
    }

    const sonuc = {
      buHafta,
      topSponsorlar,
      topIzleyen,
      topVideo,
      olusturuldu: new Date().toISOString(),
    };

    // Cache yaz
    try {
      await cacheRef.set({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        ...sonuc,
      });
    } catch (e) { console.warn('[liderler] cache write err:', e.message); }

    return new Response(JSON.stringify(sonuc), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600', ...CORS },
    });

  } catch (err) {
    console.error('[liderler-public] hata:', err.message);
    return new Response(JSON.stringify({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
};

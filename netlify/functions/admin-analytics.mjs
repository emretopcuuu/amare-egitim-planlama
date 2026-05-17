// netlify/functions/admin-analytics.mjs
// ─────────────────────────────────────────────────────────────────────────
// GET /.netlify/functions/admin-analytics
//   Authorization: Bearer <Firebase ID Token> (admin email)
//
// Sistem geneli analytics:
//   - DAU/MAU (son 1 gün / 30 gün aktif kullanıcı)
//   - Toplam üye, eğitim, video, izleme
//   - En aktif sponsor top 10
//   - En izlenen video top 10
//   - Kategori dağılımı
//   - Bu hafta vs geçen hafta karşılaştırma
// ─────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';
import { isAdminToken } from './_adminEmails.mjs';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

// ADMIN_EMAILS artık _adminEmails.mjs'den

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

    if (!isAdminToken(decoded)) {
      return new Response(JSON.stringify({ error: 'Sadece admin' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const db = admin.firestore();
    const now = Date.now();
    const oneDayAgo = now - 86400000;
    const oneMonthAgo = now - 30 * 86400000;
    const oneWeekAgo = now - 7 * 86400000;
    const twoWeeksAgo = now - 14 * 86400000;

    // 1. Toplam üye + aktivite metrikleri (parallel)
    const [
      usersSnap,
      kayitliSnap,
      takvimSnap,
    ] = await Promise.all([
      db.collection('users').where('amareId', '!=', null).limit(2000).get(),
      db.collection('kayitli_egitimler').where('kayeneFiltrelendi', '==', false).get(),
      db.collection('takvim').get(),
    ]);

    const users = usersSnap.docs.map(d => d.data());
    const toplamUye = users.length;
    const dau = users.filter(u => u.sonGiris?._seconds * 1000 > oneDayAgo).length;
    const mau = users.filter(u => u.sonGiris?._seconds * 1000 > oneMonthAgo).length;
    const wau = users.filter(u => u.sonGiris?._seconds * 1000 > oneWeekAgo).length;
    const wauOnceki = users.filter(u => {
      const t = u.sonGiris?._seconds * 1000;
      return t > twoWeeksAgo && t <= oneWeekAgo;
    }).length;

    const wauDelta = wauOnceki > 0 ? Math.round(((wau - wauOnceki) / wauOnceki) * 100) : 0;

    const toplamVideo = kayitliSnap.size;
    const videolar = kayitliSnap.docs.map(d => d.data());
    const toplamPlays = videolar.reduce((acc, v) => acc + (v.plays || 0), 0);

    const toplamEgitim = takvimSnap.size;

    // 2. Top 10 izlenen video
    const topVideo = [...videolar]
      .sort((a, b) => (b.plays || 0) - (a.plays || 0))
      .slice(0, 10)
      .map(v => ({
        vimeoId: v.vimeoId,
        baslik: v.baslik,
        plays: v.plays || 0,
        puanOrt: v.puanOrt || null,
      }));

    // 3. Kategori dağılımı
    const katSayilar = {};
    videolar.forEach(v => {
      (v.kategoriler || []).forEach(k => {
        katSayilar[k] = (katSayilar[k] || 0) + 1;
      });
    });
    const topKategoriler = Object.entries(katSayilar)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([k, v]) => ({ kategori: k, sayi: v }));

    // 4. Top 10 sponsor (karne skoruna göre — bu hafta)
    function isoWeek(date) {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
      return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    }
    const buHaftaKey = isoWeek(new Date());

    let topSponsorlar = [];
    try {
      const cacheSnap = await db.doc(`leaderboard_cache/${buHaftaKey}`).get();
      if (cacheSnap.exists) {
        topSponsorlar = (cacheSnap.data().items || []).slice(0, 10).map(s => ({
          ad: (s.ad || '').split(' ')[0] + ' ' + ((s.ad || '').split(' ').slice(-1)[0]?.[0] || '') + '.',
          skor: s.skor,
          ekipSayisi: s.toplam,
          aktif: s.aktif,
        }));
      }
    } catch {}

    // 5. Saat heatmap (son 7 gün — sonGiris'ten)
    const saatDagilim = Array(24).fill(0);
    users.forEach(u => {
      const t = u.sonGiris?._seconds * 1000;
      if (t && t > oneWeekAgo) {
        const saat = new Date(t).getHours();
        saatDagilim[saat]++;
      }
    });

    return new Response(JSON.stringify({
      ozet: {
        toplamUye,
        dau, wau, mau,
        wauDelta,
        toplamVideo,
        toplamPlays,
        toplamEgitim,
      },
      topVideo,
      topKategoriler,
      topSponsorlar,
      saatDagilim,
      olusturuldu: new Date().toISOString(),
    }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=300', ...CORS } });

  } catch (err) {
    console.error('[admin-analytics] hata:', err.message);
    return new Response(JSON.stringify({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
};

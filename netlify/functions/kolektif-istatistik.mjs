// netlify/functions/kolektif-istatistik.mjs
// ─────────────────────────────────────────────────────────────────────────
// Kolektif topluluk istatistiği — McGonigal FIX #6: Epic Scale (10 Billion Kills).
//
// Tüm kullanıcıların toplam izleme saatini toplar → global_stats/2026 cache.
// Frontend KolektifHedef bandı bu cache'i okur (public read).
//
// Schedule: günde 1 kez (06:00 UTC = 09:00 Istanbul). Manuel HTTP de açık (guard'sız
// çünkü sadece OKUR + cache yazar, abuse riski düşük; istenirse secret eklenir).
//
// PERFORMANS: collectionGroup('meta') ile tüm watch_progress doc'larını çeker,
// her doc içindeki video sürelerini toplar. Günde 1 kez olduğu için maliyet düşük.
// ─────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';

function initFirebase() {
  if (admin.apps.length) return admin.firestore();
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
  return admin.firestore();
}

// 2026 hedefi — 100.000 saat. İleride admin'den ayarlanabilir.
const HEDEF_SAAT = 100000;
const YIL = '2026';

export default async (req) => {
  try {
    const db = initFirebase();

    // Tüm watch_progress doc'ları (collectionGroup — users/{uid}/meta/watch_progress)
    const snap = await db.collectionGroup('meta').get();

    let toplamSaniye = 0;
    let aktifKullanici = 0;
    const sehirSaat = {}; // ileride şehir bazlı leaderboard için

    snap.forEach(doc => {
      if (doc.id !== 'watch_progress') return; // sadece watch_progress meta doc'ları
      const data = doc.data() || {};
      // data: { [videoId]: { t, duration, pct, lastSeen }, ... } veya { progress: {...} }
      const videolar = data.progress || data;
      let kullaniciSaniye = 0;
      for (const k in videolar) {
        const v = videolar[k];
        if (v && typeof v === 'object' && typeof v.t === 'number') {
          kullaniciSaniye += Math.min(v.t, v.duration || v.t); // t izlenen saniye
        }
      }
      if (kullaniciSaniye > 0) {
        toplamSaniye += kullaniciSaniye;
        aktifKullanici++;
      }
    });

    const toplamSaat = Math.round(toplamSaniye / 3600);
    const yuzde = Math.min(100, Math.round((toplamSaat / HEDEF_SAAT) * 1000) / 10);

    const payload = {
      yil: YIL,
      toplamSaat,
      hedefSaat: HEDEF_SAAT,
      yuzde,
      aktifKullanici,
      guncelleme: admin.firestore.FieldValue.serverTimestamp(),
      guncellemeUnix: Math.floor(Date.now() / 1000),
    };

    await db.doc(`global_stats/${YIL}`).set(payload, { merge: true });

    return new Response(JSON.stringify({
      ok: true,
      toplamSaat,
      hedefSaat: HEDEF_SAAT,
      yuzde,
      aktifKullanici,
      taranan: snap.size,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[kolektif-istatistik]', err.message);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Günde 1 kez — 06:00 UTC (09:00 Istanbul)
export const config = {
  schedule: '0 6 * * *',
};

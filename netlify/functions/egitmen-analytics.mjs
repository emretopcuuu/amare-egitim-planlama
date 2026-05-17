// netlify/functions/egitmen-analytics.mjs
// ─────────────────────────────────────────────────────────────────────────
// GET /.netlify/functions/egitmen-analytics?coreId=tunc_tuncer
//   Authorization: Bearer <Firebase ID Token>
//
// Eğitmen kendi videolarının istatistiklerini görür:
//   - Toplam video, plays, ortalama süre
//   - Top 5 izlenen video
//   - Ortalama yıldız puan
//   - Toplam yorum
//
// Yetki: Eğitmen kendi coreId'siyle eşleşmesi gerek (users/{uid}.egitmenCoreId)
//        Veya admin email
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

    const url = new URL(req.url);
    const coreId = url.searchParams.get('coreId');
    if (!coreId) return new Response(JSON.stringify({ error: 'coreId param gerekli' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
    });

    // Yetki: admin VEYA users/{uid}.egitmenCoreId eşleşmesi
    const isAdmin = isAdminToken(decoded);
    if (!isAdmin) {
      const userDoc = await admin.firestore().doc(`users/${decoded.uid}`).get();
      const benimCoreId = userDoc.data()?.egitmenCoreId;
      if (benimCoreId !== coreId) {
        return new Response(JSON.stringify({ error: 'Sadece kendi profilini görebilirsin' }), {
          status: 403, headers: { 'Content-Type': 'application/json', ...CORS },
        });
      }
    }

    // Eğitmenin tüm videolarını çek
    const videoSnap = await admin.firestore()
      .collection('kayitli_egitimler')
      .where('egitmenler', 'array-contains', coreId)
      .where('kayeneFiltrelendi', '==', false)
      .get();

    const videolar = videoSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const toplamVideo = videolar.length;
    const toplamPlays = videolar.reduce((acc, v) => acc + (v.plays || 0), 0);
    const ortalamaSure = videolar.length > 0
      ? Math.round(videolar.reduce((acc, v) => acc + (v.sure || 0), 0) / videolar.length)
      : 0;

    // Top 5 izlenen
    const topIzlenen = [...videolar]
      .sort((a, b) => (b.plays || 0) - (a.plays || 0))
      .slice(0, 5)
      .map(v => ({
        vimeoId: v.vimeoId,
        baslik: v.baslik,
        plays: v.plays || 0,
        puanOrt: v.puanOrt || null,
        puanSayisi: v.puanSayisi || 0,
        thumbnailUrl: v.thumbnailUrl,
      }));

    // Ortalama puan
    const puanlilar = videolar.filter(v => v.puanSayisi > 0);
    const ortalamaPuan = puanlilar.length > 0
      ? puanlilar.reduce((acc, v) => acc + v.puanOrt * v.puanSayisi, 0) / puanlilar.reduce((acc, v) => acc + v.puanSayisi, 0)
      : null;

    // Yorum sayısı (tüm video subcollection'larından say)
    let toplamYorum = 0;
    for (let i = 0; i < videolar.length; i += 10) {
      const batch = videolar.slice(i, i + 10);
      const sayilar = await Promise.all(batch.map(v =>
        admin.firestore().collection(`kayitli_egitimler/${v.id}/yorumlar`).count().get()
          .then(snap => snap.data().count).catch(() => 0)
      ));
      toplamYorum += sayilar.reduce((a, b) => a + b, 0);
    }

    // Kategori dağılımı
    const kategoriDagilim = {};
    videolar.forEach(v => {
      (v.kategoriler || []).forEach(k => {
        kategoriDagilim[k] = (kategoriDagilim[k] || 0) + 1;
      });
    });
    const topKategoriler = Object.entries(kategoriDagilim)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([k, v]) => ({ kategori: k, sayi: v }));

    return new Response(JSON.stringify({
      coreId,
      toplamVideo,
      toplamPlays,
      ortalamaSure,
      ortalamaSureMetin: `${Math.floor(ortalamaSure / 60)}dk`,
      ortalamaPuan: ortalamaPuan ? Math.round(ortalamaPuan * 10) / 10 : null,
      toplamPuanlananVideo: puanlilar.length,
      toplamYorum,
      topIzlenen,
      topKategoriler,
    }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=600', ...CORS } });

  } catch (err) {
    console.error('[egitmen-analytics] hata:', err.message);
    return new Response(JSON.stringify({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
};

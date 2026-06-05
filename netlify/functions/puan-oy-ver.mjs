// netlify/functions/puan-oy-ver.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST { vimeoId: string, yildiz: 1-5 }  (Authorization: Bearer <idToken>)
//
// 2026-06-05 audit fix (#3): Önceden frontend transaction ile puanOrt/puanSayisi
// alanlarını doğrudan yazıyordu. Rules buna izin veriyordu — kullanıcı DevTools
// üzerinden puanOrt: 9999 yazabilirdi (vote manipülasyon).
//
// Yeni akış:
//   1. Frontend POST /puan-oy-ver (idToken + vimeoId + yildiz)
//   2. Backend admin SDK transaction:
//      - oylar/{uid} doc'unu yaz
//      - parent kayitli_egitimler/{vimeoId} puanOrt + puanSayisi'ı YENİDEN hesapla
//   3. Rules: parent update artık kullanıcı tarafından YAPILAMAZ
//
// Aggregate doğruluğu artık server-side garanti — manipüle edilemez.
// ─────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';
import { rateLimitCheck, rateLimitResponse } from './_rateLimit.mjs';
import { corsPrivate, corsPreflight } from './_cors.mjs';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

export default async (req) => {
  const CORS = corsPrivate(req);

  if (req.method === 'OPTIONS') return corsPreflight(req, true);
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  // Rate limit: kullanıcı başına agresif (10/dk, 100/sa) — oyların değiştirilmesi normal değil
  const limit = await rateLimitCheck(req, 'puan-oy-ver', { perMinute: 10, perHour: 100 });
  if (!limit.ok) return rateLimitResponse(limit, CORS);

  try {
    // 1. Authorization → uid
    const auth = req.headers.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) {
      return new Response(JSON.stringify({ ok: false, error: 'Authorization eksik' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(m[1]);
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'idToken geçersiz' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }
    const uid = decoded.uid;
    if (decoded.firebase?.sign_in_provider === 'anonymous') {
      return new Response(JSON.stringify({ ok: false, error: 'Anonim kullanıcı oy veremez' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    // 2. Body validasyon
    const body = await req.json().catch(() => ({}));
    const vimeoId = String(body.vimeoId || '').trim();
    const yildiz = Number(body.yildiz);
    if (!vimeoId || vimeoId.length > 50) {
      return new Response(JSON.stringify({ ok: false, error: 'vimeoId geçersiz' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }
    if (!Number.isInteger(yildiz) || yildiz < 1 || yildiz > 5) {
      return new Response(JSON.stringify({ ok: false, error: 'yildiz 1-5 arasında olmalı' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    // 3. Transaction: oy yaz + aggregate güncelle
    const db = admin.firestore();
    const videoRef = db.doc(`kayitli_egitimler/${vimeoId}`);
    const oyRef = db.doc(`kayitli_egitimler/${vimeoId}/oylar/${uid}`);

    const sonuc = await db.runTransaction(async (tx) => {
      const videoSnap = await tx.get(videoRef);
      if (!videoSnap.exists) {
        throw new Error('Video bulunamadı');
      }
      const oySnap = await tx.get(oyRef);
      const eskiYildiz = oySnap.exists ? (oySnap.data().yildiz || 0) : 0;
      const eskiOrt = videoSnap.data().puanOrt || 0;
      const eskiSayisi = videoSnap.data().puanSayisi || 0;

      let yeniSayisi, yeniToplamPuan;
      if (eskiYildiz > 0) {
        // Değiştirme — sayı aynı, toplam değişir
        yeniSayisi = eskiSayisi;
        yeniToplamPuan = eskiOrt * eskiSayisi - eskiYildiz + yildiz;
      } else {
        // İlk oy
        yeniSayisi = eskiSayisi + 1;
        yeniToplamPuan = eskiOrt * eskiSayisi + yildiz;
      }
      const yeniOrt = yeniSayisi > 0 ? yeniToplamPuan / yeniSayisi : 0;

      tx.set(oyRef, {
        yildiz,
        tarih: admin.firestore.FieldValue.serverTimestamp(),
        uid,
      }, { merge: true });
      tx.set(videoRef, {
        puanOrt: Math.round(yeniOrt * 10) / 10,
        puanSayisi: yeniSayisi,
      }, { merge: true });

      return { puanOrt: Math.round(yeniOrt * 10) / 10, puanSayisi: yeniSayisi };
    });

    return new Response(JSON.stringify({
      ok: true,
      yildiz,
      puanOrt: sonuc.puanOrt,
      puanSayisi: sonuc.puanSayisi,
    }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...CORS, 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[puan-oy-ver]', err.message);
    return new Response(JSON.stringify({ ok: false, error: err.message || 'Sistem hatası' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
};

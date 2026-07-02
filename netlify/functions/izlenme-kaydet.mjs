// netlify/functions/izlenme-kaydet.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST { vimeoId: string }  (Authorization: Bearer <idToken>)
//
// "En çok izlenen eğitim" için GERÇEK, sunucu-taraflı doğrulanmış sayaç.
// puan-oy-ver.mjs ile AYNI güvenlik deseni (2026-06-05 audit): aggregate
// alan (izlenmeSayisi) client'tan asla direkt yazılmaz — yalnız bu fonksiyon
// admin SDK transaction ile artırır. Rules: kayitli_egitimler.update sadece
// ['reactions'] alanına izin veriyor; izlenmeSayisi rules'ta da YASAK.
//
// Dedup: kullanıcı başına video başına TEK sayım (izlenmeler/{uid} subcoll).
// Tetiklenme: frontend, izleme %30'u geçince BİR KEZ çağırır (watchProgress.js).
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
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: { 'Content-Type': 'application/json', ...CORS } });
  }

  const limit = await rateLimitCheck(req, 'izlenme-kaydet', { perMinute: 20, perHour: 200 });
  if (!limit.ok) return rateLimitResponse(limit, CORS);

  try {
    const auth = req.headers.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return new Response(JSON.stringify({ ok: false, error: 'Authorization eksik' }), { status: 401, headers: { 'Content-Type': 'application/json', ...CORS } });
    let decoded;
    try { decoded = await admin.auth().verifyIdToken(m[1]); }
    catch { return new Response(JSON.stringify({ ok: false, error: 'idToken geçersiz' }), { status: 401, headers: { 'Content-Type': 'application/json', ...CORS } }); }
    const uid = decoded.uid;

    const body = await req.json().catch(() => ({}));
    const vimeoId = String(body.vimeoId || '').trim();
    if (!vimeoId || vimeoId.length > 50) {
      return new Response(JSON.stringify({ ok: false, error: 'vimeoId geçersiz' }), { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } });
    }

    const db = admin.firestore();
    const videoRef = db.doc(`kayitli_egitimler/${vimeoId}`);
    const izlemeRef = db.doc(`kayitli_egitimler/${vimeoId}/izlenmeler/${uid}`);

    const sonuc = await db.runTransaction(async (tx) => {
      const videoSnap = await tx.get(videoRef);
      if (!videoSnap.exists) throw new Error('Video bulunamadı');
      const izlemeSnap = await tx.get(izlemeRef);
      if (izlemeSnap.exists) return { yeni: false, izlenmeSayisi: videoSnap.data().izlenmeSayisi || 0 };

      const yeniSayi = (videoSnap.data().izlenmeSayisi || 0) + 1;
      tx.set(izlemeRef, { tarih: admin.firestore.FieldValue.serverTimestamp(), uid }, { merge: true });
      tx.set(videoRef, { izlenmeSayisi: yeniSayi }, { merge: true });
      return { yeni: true, izlenmeSayisi: yeniSayi };
    });

    return new Response(JSON.stringify({ ok: true, ...sonuc }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS, 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[izlenme-kaydet]', err.message);
    return new Response(JSON.stringify({ ok: false, error: err.message || 'Sistem hatası' }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } });
  }
};

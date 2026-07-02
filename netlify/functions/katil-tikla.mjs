// netlify/functions/katil-tikla.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST { egitimId: string }  (Authorization: Bearer <idToken> — anonim de olur)
//
// Canlı (Zoom) eğitim "Katıl" tıklama sayacı — "X kişi katıldı" rozetinin
// GERÇEK veri kaynağı. izlenme-kaydet.mjs / puan-oy-ver.mjs ile aynı güvenlik
// deseni: aggregate alan (katilTiklamaSayisi) client'tan asla yazılamaz —
// yalnız bu fonksiyon admin SDK transaction ile artırır.
//
// Dedup: kullanıcı (anonim uid dahil) başına eğitim başına TEK sayım
// (takvim/{id}/katilimlar/{uid} subcollection — client read/write KAPALI).
// Anonim kabul edilir: katıl tıklaması login gerektirmez; anon uid dedup
// için yeterli, sahte şişirme rate-limit + uid tekilliğiyle sınırlı.
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

  const limit = await rateLimitCheck(req, 'katil-tikla', { perMinute: 15, perHour: 120 });
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
    const egitimId = String(body.egitimId || '').trim();
    if (!egitimId || egitimId.length > 80) {
      return new Response(JSON.stringify({ ok: false, error: 'egitimId geçersiz' }), { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } });
    }

    const db = admin.firestore();
    const egitimRef = db.doc(`takvim/${egitimId}`);
    const katilimRef = db.doc(`takvim/${egitimId}/katilimlar/${uid}`);

    const sonuc = await db.runTransaction(async (tx) => {
      const egitimSnap = await tx.get(egitimRef);
      if (!egitimSnap.exists) throw new Error('Eğitim bulunamadı');
      const katilimSnap = await tx.get(katilimRef);
      if (katilimSnap.exists) return { yeni: false, katilTiklamaSayisi: egitimSnap.data().katilTiklamaSayisi || 0 };

      const yeniSayi = (egitimSnap.data().katilTiklamaSayisi || 0) + 1;
      tx.set(katilimRef, { tarih: admin.firestore.FieldValue.serverTimestamp(), uid }, { merge: true });
      tx.set(egitimRef, { katilTiklamaSayisi: yeniSayi }, { merge: true });
      return { yeni: true, katilTiklamaSayisi: yeniSayi };
    });

    return new Response(JSON.stringify({ ok: true, ...sonuc }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS, 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[katil-tikla]', err.message);
    return new Response(JSON.stringify({ ok: false, error: err.message || 'Sistem hatası' }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } });
  }
};

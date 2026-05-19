// netlify/functions/email-duzelt-talep.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST /.netlify/functions/email-duzelt-talep
//   Body: { lookup, ad, yeniEmail, sebep, telefon? }
//
// Kullanıcı email'i Supabase'de bozuk/yok ise, bu form'la talep gönderir.
// Admin paneli email_duzeltme_talepleri koleksiyonunu görür, onaylar/red eder.
// Onay sonrası supabaseService_role ile gerçek email güncellenir.
// ─────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';
import { rateLimitCheck, rateLimitResponse } from './_rateLimit.mjs';

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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

function jsonRes(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return jsonRes({ error: 'POST only' }, 405);

  try {
    // Rate limit — spam koruması
    const ip = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || 'anonymous';
    const rl = await rateLimitCheck('email-duzelt-talep', ip, { perMinute: 5, perHour: 20 });
    if (!rl.ok) return rateLimitResponse(rl);

    const body = await req.json();
    const lookup = String(body.lookup || '').trim();
    const ad = String(body.ad || '').trim();
    const yeniEmail = String(body.yeniEmail || '').trim().toLowerCase();
    const sebep = String(body.sebep || '').trim().slice(0, 500);
    const telefon = String(body.telefon || '').trim();

    if (!yeniEmail) return jsonRes({ error: 'Yeni email gerekli' }, 400);
    if (!EMAIL_REGEX.test(yeniEmail)) return jsonRes({ error: 'Email formatı geçersiz' }, 400);
    if (!ad || ad.length < 3) return jsonRes({ error: 'Ad/soyad gerekli (min 3 karakter)' }, 400);

    // Firestore'a kaydet
    const docRef = admin.firestore().collection('email_duzeltme_talepleri').doc();
    await docRef.set({
      lookup,           // amareId veya phone (kullanıcı ne ile login'i denedi)
      ad,
      yeniEmail,
      sebep,
      telefon,
      durum: 'beklemede', // 'beklemede' | 'onaylandi' | 'reddedildi'
      ip,
      olusturulmaTarihi: admin.firestore.FieldValue.serverTimestamp(),
    });

    return jsonRes({
      ok: true,
      talepId: docRef.id,
      mesaj: 'Talebin admin\'e iletildi. 24sa içinde dönüş yapılır.',
    });
  } catch (err) {
    console.error('[email-duzelt-talep] hata:', err.message);
    return jsonRes({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }, 500);
  }
};

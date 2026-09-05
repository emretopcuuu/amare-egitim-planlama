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
import { Resend } from 'resend';
import { rateLimitCheck, rateLimitResponse } from './_rateLimit.mjs';
import { ADMIN_EMAILS } from './_adminEmails.mjs';

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
    // Rate limit — spam koruması (rateLimitCheck signature: req, endpoint, opts)
    const rl = await rateLimitCheck(req, 'email-duzelt-talep', { perMinute: 5, perHour: 20 });
    if (!rl.ok) return rateLimitResponse(rl, CORS);
    const ip = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || 'anonymous';

    const body = await req.json();
    const lookup = String(body.lookup || '').trim();
    // 2026-06-09: Amare ID zorunlu (admin onayı bunsuz çalışmıyordu — DB match için ID şart)
    const amareId = String(body.amareId || '').trim();
    const ad = String(body.ad || '').trim();
    const yeniEmail = String(body.yeniEmail || '').trim().toLowerCase();
    const sebep = String(body.sebep || '').trim().slice(0, 500);
    const telefon = String(body.telefon || '').trim();

    if (!amareId || !/^\d{6,10}$/.test(amareId)) {
      return jsonRes({ error: 'Amare ID gerekli (6-10 rakam). Sponsorundan öğren.' }, 400);
    }
    if (!yeniEmail) return jsonRes({ error: 'Yeni email gerekli' }, 400);
    if (!EMAIL_REGEX.test(yeniEmail)) return jsonRes({ error: 'Email formatı geçersiz' }, 400);
    if (!ad || ad.length < 3) return jsonRes({ error: 'Ad/soyad gerekli (min 3 karakter)' }, 400);

    // Firestore'a kaydet
    const docRef = admin.firestore().collection('email_duzeltme_talepleri').doc();
    await docRef.set({
      amareId,          // 2026-06-09: PRIMARY match key — admin onayı bununla DB update eder
      lookup,           // kullanıcı login'de ne yazdı (debug/eski)
      ad,
      yeniEmail,
      sebep,
      telefon,
      durum: 'beklemede', // 'beklemede' | 'onaylandi' | 'reddedildi'
      ip,
      olusturulmaTarihi: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2026-09-05: Adminlere ANINDA bildirim. Öncesinde hiçbir bildirim yoktu —
    // talepler panelde birikiyordu (9 talep, en eskisi 18 gün beklemişti) ve
    // kullanıcılar "gelen giden yok" diyordu. FAIL-SAFE: mail patlarsa talep
    // yine kaydedilmiş olur, kullanıcıya hata dönmez (yalnız log).
    try {
      const alicilar = ADMIN_EMAILS.filter(Boolean);
      if (process.env.RESEND_API_KEY && alicilar.length) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const esc = (x) => String(x || '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
        const panelUrl = 'https://egitimtakvimi.oneteamglobal.ai/admin';
        await resend.emails.send({
          from: 'One Team <noreply@oneteamglobal.ai>',
          to: alicilar,
          subject: `Giris sorunu: ${esc(ad)} (ID ${esc(amareId || '-')})`,
          html: `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px">
            <h2 style="margin:0 0 12px">Yeni email duzeltme talebi</h2>
            <table style="border-collapse:collapse;font-size:14px">
              <tr><td style="padding:4px 12px 4px 0;color:#666">Ad</td><td><b>${esc(ad)}</b></td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#666">Amare ID</td><td><b>${esc(amareId || '-')}</b></td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#666">Giriste yazdigi</td><td>${esc(lookup)}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#666">Dogru email</td><td><b>${esc(yeniEmail)}</b></td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#666">Telefon</td><td>${esc(telefon || '-')}</td></tr>
            </table>
            <p style="margin:18px 0"><a href="${panelUrl}" style="background:#7c3aed;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:700">Admin panelde ac</a></p>
            <p style="color:#888;font-size:12px">Kisi giris yapamiyor — Kimlik/Email konsolundan ID ile arayip "Hepsine Kaydet" yeterli.</p>
          </div>`,
        });
      }
    } catch (mailErr) {
      console.warn('[email-duzelt-talep] admin bildirimi gonderilemedi:', mailErr?.message);
    }

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

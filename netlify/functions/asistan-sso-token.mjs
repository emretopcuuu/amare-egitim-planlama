// netlify/functions/asistan-sso-token.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST {} (Authorization: Bearer <idToken>)
//
// Frontend giriş yapmış kullanıcı için kısa süreli (5dk) HMAC-imzalı SSO
// token üretir. Asistan tarafı bu token'i `?ssoToken=...` ile alır ve
// `asistan-sso-verify` endpoint'ine sorarak email'i öğrenir.
//
// İmzasız ?email= yerine bunu kullanırız — saldırgan başkasının email'iyle
// asistan oturumu açamaz çünkü imza secret'i bilmez.
// ─────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';
import { rateLimitCheck, rateLimitResponse } from './_rateLimit.mjs';
import { ssoTokenUret } from './_ssoToken.mjs';

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
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Rate limit — token üretim için makul: 20/dk per IP, 200/sa
  const limit = await rateLimitCheck(req, 'asistan-sso-token', { perMinute: 20, perHour: 200 });
  if (!limit.ok) return rateLimitResponse(limit);

  try {
    // Authorization: Bearer <idToken>
    const auth = req.headers.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) {
      return new Response(JSON.stringify({ ok: false, error: 'Authorization eksik' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      });
    }
    const idToken = m[1];

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: 'idToken geçersiz' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      });
    }

    const email = String(decoded.email || '').trim().toLowerCase();
    if (!email) {
      return new Response(JSON.stringify({ ok: false, error: 'Email yok' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Opsiyonel: hedef rozeti (telemetri)
    let src = 'egitim-takvimi';
    try {
      const body = await req.json().catch(() => ({}));
      if (typeof body.src === 'string' && body.src.length < 40) src = body.src;
    } catch {}

    const { token, payload } = ssoTokenUret(email, { ttlSec: 300, src });

    return new Response(JSON.stringify({
      ok: true,
      token,
      email,
      exp: payload.exp,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[asistan-sso-token]', err.message);
    return new Response(JSON.stringify({ ok: false, error: 'Sistem hatası' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

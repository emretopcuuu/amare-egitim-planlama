// netlify/functions/asistan-sso-verify.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST {token: "..."}
// Response: {ok: true, email: "..."} | {ok: false, hata: "..."}
//
// CORS açık (asistan.oneteamglobal.ai ve diğer ekosistem domain'leri için)
// — bu endpoint imza/exp/replay doğrulaması yapar, sadece email döner.
//
// Replay protection: nonce'lar sso_used_nonces collection'da 1sa tutulur
// — aynı token ikinci kez kabul edilmez.
// ─────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';
import { rateLimitCheck, rateLimitResponse } from './_rateLimit.mjs';
import { ssoTokenCoz } from './_ssoToken.mjs';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const ALLOWED_ORIGINS = new Set([
  'https://asistan.oneteamglobal.ai',
  'https://egitimtakvimi.oneteamglobal.ai',
  'https://crm.oneteamglobal.ai',
  'https://hbb.oneteamglobal.ai',
  'https://hesaplayici.oneteamglobal.ai',
  'http://localhost:5173',
  'http://localhost:3000',
]);

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '3600',
    'Vary': 'Origin',
  };
}

export default async (req) => {
  const origin = req.headers.get('origin') || '';
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const limit = await rateLimitCheck(req, 'asistan-sso-verify', { perMinute: 40, perHour: 400 });
  if (!limit.ok) return rateLimitResponse(limit);

  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || '');
    if (!token) {
      return new Response(JSON.stringify({ ok: false, hata: 'token-yok' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const sonuc = ssoTokenCoz(token);
    if (!sonuc.ok) {
      return new Response(JSON.stringify({ ok: false, hata: sonuc.hata }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { email, nonce, exp, src } = sonuc.payload;

    // Replay koruması: nonce daha önce kullanıldı mı?
    const db = admin.firestore();
    const nonceRef = db.collection('sso_used_nonces').doc(nonce);
    const nonceDoc = await nonceRef.get();
    if (nonceDoc.exists) {
      return new Response(JSON.stringify({ ok: false, hata: 'replay' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    // Kullanıldı işaretle — 1 saat sonra otomatik silinir (TTL policy ayrı kurulur)
    await nonceRef.set({
      kullanim: admin.firestore.FieldValue.serverTimestamp(),
      email,
      src,
      exp,
    });

    return new Response(JSON.stringify({
      ok: true,
      email,
      src,
      exp,
    }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[asistan-sso-verify]', err.message);
    return new Response(JSON.stringify({ ok: false, hata: 'sunucu' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
};

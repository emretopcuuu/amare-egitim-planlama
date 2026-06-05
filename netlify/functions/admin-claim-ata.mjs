// netlify/functions/admin-claim-ata.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST { email: string, admin: boolean }  (Header: x-admin-claim-secret)
//
// 2026-06-05 audit fix (#2): Admin allowlist'i bundle'dan kaldırma.
// Eski: src/constants.js ADMIN_EMAILS public → phishing target listesi.
// Yeni: Firebase Custom Claims (request.auth.token.admin == true).
//
// Bu endpoint super-admin (Emre) tarafından kullanılır:
//   1. Migration: mevcut 9 admin'e claim ata (tek seferlik script)
//   2. Sonradan: yeni admin ekleme / mevcut admin çıkarma
//
// Güvenlik:
//   - ADMIN_CLAIM_SECRET env'de saklı, sadece super-admin elinde
//   - HTTPS zorunlu (Netlify default)
//   - Rate limit (10/saat — toplu migration için yeterli)
//   - email param doğrulanır, claim sonrası user token'ı 1 saat içinde yenilenir
// ─────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';
import { rateLimitCheck, rateLimitResponse } from './_rateLimit.mjs';
import { safeEqual } from './_otpHash.mjs';

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

  // Rate limit — toplu migration için 10/saat yeterli
  const limit = await rateLimitCheck(req, 'admin-claim-ata', { perMinute: 5, perHour: 30 });
  if (!limit.ok) return rateLimitResponse(limit);

  try {
    // 1. Super-admin secret kontrolü (constant-time compare)
    const beklenenSecret = process.env.ADMIN_CLAIM_SECRET;
    if (!beklenenSecret) {
      return new Response(JSON.stringify({ ok: false, error: 'ADMIN_CLAIM_SECRET env yok' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      });
    }
    const gelenSecret = req.headers.get('x-admin-claim-secret') || '';
    if (!safeEqual(gelenSecret, beklenenSecret)) {
      return new Response(JSON.stringify({ ok: false, error: 'Forbidden' }), {
        status: 403, headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Body validasyon
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const adminFlag = body.admin === true;
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
    if (!email || !emailRegex.test(email)) {
      return new Response(JSON.stringify({ ok: false, error: 'email geçersiz' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. User'ı bul veya oluştur (henüz Google ile giriş yapmamış olabilir)
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
    } catch (e) {
      // Yoksa oluşturma — admin kullanıcı önce Google login yapmalı
      return new Response(JSON.stringify({
        ok: false,
        error: 'Bu email ile Firebase user yok — önce Google ile giriş yapmalı, sonra claim atanmalı',
      }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Mevcut claim'leri al, admin alanını güncelle
    const mevcutClaims = user.customClaims || {};
    const yeniClaims = { ...mevcutClaims };
    if (adminFlag) {
      yeniClaims.admin = true;
    } else {
      delete yeniClaims.admin;
    }
    await admin.auth().setCustomUserClaims(user.uid, yeniClaims);

    return new Response(JSON.stringify({
      ok: true,
      uid: user.uid,
      email,
      admin: adminFlag,
      not: 'User\'in yeni claim\'i kullanması için 1 saat içinde token yenilenmesi (logout/login) gerek',
    }), {
      status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[admin-claim-ata]', err.message);
    return new Response(JSON.stringify({ ok: false, error: err.message || 'Sistem hatası' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

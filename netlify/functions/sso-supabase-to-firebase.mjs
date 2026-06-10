// netlify/functions/sso-supabase-to-firebase.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST { access_token: <supabase access token> }
//
// TERS SSO KÖPRÜSÜ — Supabase grubu (crm/mentorluk/hbb/asistan) → egitimtakvimi (Firebase)
// Supabase oturumlu kullanıcı egitimtakvimi'ye TEK TIKLA geçer (yeniden giriş yok).
//
// İleri yön zaten var: egitimtakvimi (Firebase) → Supabase grubu (ssoBridge.js).
// Bu, eksik olan ters yönü tamamlar.
//
// Akış:
//   1. crm/mentorluk frontend: sb.auth.getSession() → access_token
//   2. Bu endpoint'e POST → access_token Supabase'in /auth/v1/user ucu ile DOĞRULANIR
//      (sahte/expired token reddedilir — doğrulamayı Supabase'in kendisi yapar)
//   3. Email → Firebase getUserByEmail/createUser → createCustomToken
//   4. Frontend: /sso?t=<customToken>&e=<email> → signInWithCustomToken → Firebase login
//
// Güvenlik:
//   - access_token POST body'de (URL'de DEĞİL — loglara/Referer'a sızmaz)
//   - Token gerçekliğini Supabase doğruluyor (apikey + Bearer access_token)
//   - CORS allowlist (corsPrivate) — yalnız OneTeam origin'leri
//   - Rate limit: 30/dk, 200/saat per IP (brute force koruma)
//   - email Supabase oturumundan gelir → emailVerified:true (Amare DB zaten doğrulu)
// ─────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';
import { corsPrivate, corsPreflight } from './_cors.mjs';
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

const SUPABASE_URL = process.env.SUPABASE_URL;
// /auth/v1/user için apikey: anon yeterli; yoksa mevcut SUPABASE_KEY'e düş.
const SUPABASE_APIKEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

function j(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors },
  });
}

export default async (req) => {
  const cors = corsPrivate(req);

  if (req.method === 'OPTIONS') return corsPreflight(req, true);
  if (req.method !== 'POST') {
    return j({ ok: false, error: 'POST only' }, 405, cors);
  }

  try {
    // Brute force koruması
    const limit = await rateLimitCheck(req, 'sso-supa-fb', { perMinute: 30, perHour: 200 });
    if (!limit.ok) return rateLimitResponse(limit, cors);

    const body = await req.json().catch(() => ({}));
    const accessToken = String(body.access_token || '').trim();
    if (!accessToken || accessToken.length < 20) {
      return j({ ok: false, error: 'access_token gerekli' }, 400, cors);
    }

    // 1. Supabase access_token'ı DOĞRULA — Supabase'in kendisi doğruluyor.
    //    Geçersiz/expired token → 401, sahte token ile Firebase login alınamaz.
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_APIKEY,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!userRes.ok) {
      return j({ ok: false, error: 'Geçersiz veya süresi dolmuş oturum' }, 401, cors);
    }
    const supaUser = await userRes.json().catch(() => ({}));
    const email = String(supaUser?.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return j({ ok: false, error: 'Oturumda email bulunamadı' }, 400, cors);
    }

    // 2. Firebase user — varsa kullan, yoksa oluştur
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        user = await admin.auth().createUser({
          email,
          displayName: supaUser?.user_metadata?.full_name || undefined,
          emailVerified: true, // Supabase doğrulu oturum verdi
        });
      } else {
        throw e;
      }
    }

    // 3. Custom token üret — frontend signInWithCustomToken ile login eder (1 saat geçerli)
    const customToken = await admin.auth().createCustomToken(user.uid, {
      girisYolu: 'sso_supabase',
    });

    return j({ ok: true, customToken, email }, 200, cors);
  } catch (err) {
    console.error('[sso-supabase-to-firebase] hata:', err.message);
    return j({ ok: false, error: 'Sistem hatası. Birazdan tekrar dene.', detail: String(err.message).slice(0, 160) }, 500, cors);
  }
};

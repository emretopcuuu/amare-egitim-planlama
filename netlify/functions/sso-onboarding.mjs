// netlify/functions/sso-onboarding.mjs
// ─────────────────────────────────────────────────────────────────────────
// GET /.netlify/functions/sso-onboarding?amare_id=2210978
//
// oneteamglobal.ai onboarding'i tamamlayan kullanıcıyı egitimtakvimi'ye
// tek tıkla login eder. Firebase Auth custom token üretir.
//
// Güvenlik:
//   1. members tablosunda son 30 dk'da bu amare_id ile aktif kayıt olmalı
//      (yani gerçek bir kullanıcı onboarding yapıyor olmalı)
//   2. amare_raw_members'ta amare_id valid olmalı + email kayıtlı olmalı
//   3. Custom token Firebase tarafından imzalı, varsayılan 1 saat geçerli
//      ama biz frontend'de hemen kullanırız, expire önemli değil
//
// Response: { token, email, full_name } veya { error }
// ─────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';

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
const SUPABASE_KEY = process.env.SUPABASE_KEY;

async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...CORS_HEADERS,
    },
  });
}

export default async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const url = new URL(req.url);
    const amareId = (url.searchParams.get('amare_id') || '').trim();

    if (!amareId || !/^\d{4,12}$/.test(amareId)) {
      return jsonResponse({ error: 'Geçersiz amare_id formatı' }, 400);
    }

    // 1. members'ta son 30 dk içinde aktif onboarding var mı?
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const memberRows = await supabaseGet(
      `members?select=id,amare_id,current_screen,last_active_at,full_name&` +
      `amare_id=eq.${encodeURIComponent(amareId)}&` +
      `last_active_at=gte.${encodeURIComponent(thirtyMinAgo)}&` +
      `limit=1`
    );
    if (!memberRows || memberRows.length === 0) {
      return jsonResponse({
        error: 'Aktif onboarding bulunamadı. Onboarding yarıda mı kaldı?',
        hint: 'Yeniden giriş için Üye Girişi butonunu kullan.',
      }, 404);
    }

    // 2. amare_raw_members'tan email + isim çek
    const amareRows = await supabaseGet(
      `amare_raw_members?select=email,full_name,phone&` +
      `amare_id=eq.${encodeURIComponent(amareId)}&` +
      `email_invalid=is.false&` +
      `limit=1`
    );
    if (!amareRows || amareRows.length === 0 || !amareRows[0].email) {
      return jsonResponse({
        error: 'Bu Amare ID için email kayıtlı değil.',
      }, 404);
    }

    const email = amareRows[0].email;
    const fullName = amareRows[0].full_name || memberRows[0].full_name || null;

    // 3. Firebase Auth user — varsa kullan, yoksa oluştur
    let firebaseUid;
    try {
      const user = await admin.auth().getUserByEmail(email);
      firebaseUid = user.uid;
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        const newUser = await admin.auth().createUser({
          email,
          displayName: fullName || undefined,
          emailVerified: true, // Amare DB'de zaten doğrulu
        });
        firebaseUid = newUser.uid;
      } else {
        throw e;
      }
    }

    // 4. Custom token üret (varsayılan 1 saat geçerli)
    const token = await admin.auth().createCustomToken(firebaseUid, {
      amare_id: amareId,
      source: 'onboarding_sso',
    });

    return jsonResponse({
      token,
      email,
      fullName,
      uid: firebaseUid,
    });

  } catch (err) {
    console.error('[sso-onboarding] hata:', err.message, err.stack);
    return jsonResponse({
      error: 'Sistem hatası. Lütfen birazdan tekrar dene.',
      detail: err.message.slice(0, 200),
    }, 500);
  }
};

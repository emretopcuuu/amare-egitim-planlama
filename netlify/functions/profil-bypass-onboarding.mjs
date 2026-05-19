// netlify/functions/profil-bypass-onboarding.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST /.netlify/functions/profil-bypass-onboarding
//   Header: Authorization: Bearer <Firebase ID Token>
//
// Kullanıcının onboarding gate'i atlatma talebi. FERDİ KIMIŞ vakası gibi
// progress/status alanları doğru set edilmemiş ama gerçekte onboarding'i
// tamamlamış kullanıcılar için self-serve çözüm.
//
// Firestore: users/{uid}.onboardingBypass = true (+ tarih + amareId)
// profil-veri.mjs bu flag'i okuyup gate'i pas geçer.
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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonRes(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return jsonRes({ error: 'POST only' }, 405);

  try {
    // Auth
    const auth = req.headers.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return jsonRes({ error: 'Token gerekli' }, 401);

    let decoded;
    try { decoded = await admin.auth().verifyIdToken(m[1]); }
    catch { return jsonRes({ error: 'Geçersiz token' }, 401); }

    const uid = decoded.uid;

    // users/{uid} doc varlığını kontrol et (amareId bağlı olmalı)
    const userRef = admin.firestore().doc(`users/${uid}`);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return jsonRes({ error: 'Profil bulunamadı' }, 404);
    }
    const userData = userSnap.data() || {};
    if (!userData.amareId) {
      return jsonRes({ error: 'Amare ID bağlı değil — önce login ol' }, 400);
    }

    // Bypass flag set et
    await userRef.update({
      onboardingBypass: true,
      onboardingBypassTarihi: admin.firestore.FieldValue.serverTimestamp(),
      onboardingBypassNeden: 'kullanici_talep', // log için
    });

    console.log(`[bypass] uid=${uid} amareId=${userData.amareId} email=${decoded.email}`);

    return jsonRes({ ok: true, message: 'Bypass aktif' });
  } catch (err) {
    console.error('[profil-bypass-onboarding] hata:', err.message);
    return jsonRes({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }, 500);
  }
};

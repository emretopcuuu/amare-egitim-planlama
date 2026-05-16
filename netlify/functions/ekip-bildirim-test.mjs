// netlify/functions/ekip-bildirim-test.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST /.netlify/functions/ekip-bildirim-test
//   Authorization: Bearer <Firebase ID Token>
//
// Sponsor'a test push notification gönderir.
// users/{uid}/push_aboneleri/sponsor → endpoint + keys'i kullanır.
// ─────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';
import webpush from 'web-push';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const VAPID_PUBLIC = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(
    'mailto:noreply@oneteamglobal.ai',
    VAPID_PUBLIC,
    VAPID_PRIVATE
  );
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), {
    status: 405, headers: { 'Content-Type': 'application/json', ...CORS },
  });

  try {
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return new Response(JSON.stringify({ error: 'VAPID anahtarları yapılandırılmamış' }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    // Auth
    const auth = req.headers.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return new Response(JSON.stringify({ error: 'Token gerekli' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
    });
    let decoded;
    try { decoded = await admin.auth().verifyIdToken(m[1]); }
    catch { return new Response(JSON.stringify({ error: 'Geçersiz token' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
    }); }
    const uid = decoded.uid;

    // Subscription'ı oku
    const subDoc = await admin.firestore().doc(`users/${uid}/push_aboneleri/sponsor`).get();
    if (!subDoc.exists) {
      return new Response(JSON.stringify({ error: 'Henüz bildirime abone değilsin' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }
    const sub = subDoc.data();

    // Test payload
    const payload = JSON.stringify({
      title: 'Test bildirim ✨',
      body: 'Bildirim sistemin çalışıyor. Ekibin için artık anlık uyarılar göreceksin.',
      icon: '/logo-192.png',
      badge: '/badge.png',
      url: '/ekibim',
    });

    await webpush.sendNotification({
      endpoint: sub.endpoint,
      keys: sub.keys,
    }, payload);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    });

  } catch (err) {
    console.error('[bildirim-test] hata:', err.message, err.stack);
    return new Response(JSON.stringify({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
};

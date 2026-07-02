// netlify/functions/abonelik-durumu.mjs
// ─────────────────────────────────────────────────────────────────────────
// GET  /.netlify/functions/abonelik-durumu
//   Header: Authorization: Bearer <Firebase ID Token>
//   → { bulten: { abone, docId }, hatirlatmalar: [...] }
//
// POST /.netlify/functions/abonelik-durumu?action=bulten-iptal
//   Header: Authorization: Bearer <Firebase ID Token>
//   → { ok: true }  (kendi bulten_aboneleri kaydını siler)
//
// Neden var (Sentry NODE-Q, 2 Tem 2026):
//   2026-06-05 güvenlik denetiminde bulten_aboneleri + hatirlatmalar
//   koleksiyonları "allow read, list, update, delete: if isAdmin()" oldu
//   (quota/spam koruması — anonim create serbest kaldı ama read admin-only).
//   Profil.jsx bu koleksiyonlara DOĞRUDAN client SDK ile (kendi email'iyle
//   filtreleyerek) okuma + silme yapmaya devam ediyordu -> her normal
//   kullanıcı /profil'e girince "Missing or insufficient permissions"
//   (14+ occurrence, escalating). Fonksiyonel etki: bülten/hatırlatma
//   durumu her zaman "abone değil / boş" görünüyordu, iptal butonu da
//   sessizce başarısız oluyordu.
//
// Güvenlik: Firebase ID token doğrulanır, e-posta TOKEN'DAN alınır
// (client'ın gönderdiği email'e güvenilmez) — profil-veri.mjs ile
// aynı desen. Admin SDK security rules'ı bypass eder, sadece kendi
// e-postasına ait kayıtlar döner/silinir.
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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-store',
      ...CORS_HEADERS,
    },
  });
}

async function verifyEmail(req) {
  const authHeader = req.headers.get('authorization') || '';
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return { error: jsonResponse({ error: 'Yetkisiz: token yok' }, 401) };
  try {
    const decoded = await admin.auth().verifyIdToken(m[1]);
    if (!decoded.email) return { error: jsonResponse({ error: 'Token e-posta içermiyor' }, 400) };
    return { email: decoded.email };
  } catch (e) {
    return { error: jsonResponse({ error: 'Yetkisiz: token geçersiz' }, 401) };
  }
}

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const { email, error } = await verifyEmail(req);
  if (error) return error;

  const db = admin.firestore();
  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  try {
    if (req.method === 'POST' && action === 'bulten-iptal') {
      const snap = await db.collection('bulten_aboneleri').where('email', '==', email).get();
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      return jsonResponse({ ok: true, silinen: snap.size });
    }

    if (req.method === 'GET') {
      const [bultenSnap, hatSnap] = await Promise.all([
        db.collection('bulten_aboneleri').where('email', '==', email).limit(1).get(),
        db.collection('hatirlatmalar').where('email', '==', email).get(),
      ]);
      const bultenDoc = bultenSnap.docs[0];
      return jsonResponse({
        bulten: { abone: !!bultenDoc, docId: bultenDoc?.id || null },
        hatirlatmalar: hatSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      });
    }

    return jsonResponse({ error: 'Desteklenmeyen istek' }, 400);
  } catch (e) {
    return jsonResponse({ error: 'Sunucu hatası', detay: String(e.message || e).slice(0, 200) }, 500);
  }
};

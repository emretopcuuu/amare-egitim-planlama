// netlify/functions/openai-gorsel.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST /.netlify/functions/openai-gorsel   (Auth: admin Bearer ID token)
//   Body: { apiKey?, prompt, size, quality }
//
// AI Afiş'in OpenAI (gpt-image-1) yolu — Gemini kredisi bitince YEDEK.
// Anahtar: body.apiKey (admin kendi anahtarını verdiyse) VEYA sunucudaki
// OPENAI_API_KEY (functions env; koda/bundle'a inmez). Endpoint ADMIN-KİLİTLİ
// (Firebase ID token + isAdminToken) — yoksa herkes OpenAI kotamızı yakar.
// ─────────────────────────────────────────────────────────────────────────
import admin from 'firebase-admin';
import { isAdminToken } from './_adminEmails.mjs';
import { corsPrivate, corsPreflight } from './_cors.mjs';

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
  const CORS = corsPrivate(req);
  const jr = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', ...CORS } });
  if (req.method === 'OPTIONS') return corsPreflight(req, true);
  if (req.method !== 'POST') return jr({ error: 'POST only' }, 405);

  // Admin doğrulama (sunucu anahtarı kullanılabildiği için şart)
  const authH = req.headers.get('authorization') || '';
  const m = authH.match(/^Bearer\s+(.+)$/i);
  if (!m) return jr({ error: 'Token gerekli' }, 401);
  let decoded;
  try { decoded = await admin.auth().verifyIdToken(m[1]); } catch { return jr({ error: 'Geçersiz token' }, 401); }
  if (!isAdminToken(decoded)) return jr({ error: 'Admin yetkisi yok' }, 403);

  try {
    const { apiKey, prompt, size = '1024x1536', quality = 'low' } = await req.json();
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) return jr({ error: 'OpenAI anahtarı yok (sunucuda OPENAI_API_KEY tanımlı değil)' }, 400);
    if (!prompt) return jr({ error: 'prompt yok' }, 400);

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-1', prompt, size, quality, n: 1 }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return jr({ error: data?.error?.message || `OpenAI ${res.status}` }, res.status === 429 ? 429 : 502);
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return jr({ error: 'OpenAI görsel döndürmedi' }, 502);
    return jr({ b64 }, 200);
  } catch (e) {
    return jr({ error: e.message || 'proxy hatası' }, 500);
  }
};

// netlify/functions/gemini-afis.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST /.netlify/functions/gemini-afis   (Auth: admin Bearer ID token)
//   Body: { prompt }
//   → Sunucudaki GEMINI_API_KEY ile Gemini görsel üretir, { b64, mimeType } döner.
//
// AMAÇ: AI Afiş için Gemini anahtarını TARAYICIYA indirmeden, sunucuda tut.
// Anahtar koda/bundle'a GÖMÜLMEZ; yalnız Netlify env'inde (functions scope).
// Endpoint ADMIN-KİLİTLİ (Firebase ID token + isAdminToken) — yoksa herkes
// bizim Gemini kotamızı yakabilir. Kötüye kullanım = para/kota kaybı.
// ─────────────────────────────────────────────────────────────────────────
import admin from 'firebase-admin';
import { isAdminToken } from './_adminEmails.mjs';

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
const jsonRes = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return jsonRes({ error: 'POST only' }, 405);

  // ── Admin doğrulama (endpoint kötüye kullanıma kapalı) ──
  const auth = req.headers.get('authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return jsonRes({ error: 'Token gerekli' }, 401);
  let decoded;
  try { decoded = await admin.auth().verifyIdToken(m[1]); }
  catch { return jsonRes({ error: 'Geçersiz token' }, 401); }
  if (!isAdminToken(decoded)) return jsonRes({ error: 'Admin yetkisi yok' }, 403);

  const key = process.env.GEMINI_API_KEY;
  if (!key) return jsonRes({ error: 'Sunucuda GEMINI_API_KEY tanımlı değil' }, 500);

  let prompt = '';
  try { ({ prompt } = await req.json()); } catch { return jsonRes({ error: 'Geçersiz gövde' }, 400); }
  if (!prompt || typeof prompt !== 'string') return jsonRes({ error: 'prompt gerekli' }, 400);

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 90000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/nano-banana-pro-preview:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
        }),
        signal: ctrl.signal,
      }
    );
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      return jsonRes({ error: e?.error?.message || `Gemini ${res.status}` }, res.status === 429 ? 429 : 502);
    }
    const data = await res.json();
    const part = (data?.candidates?.[0]?.content?.parts || []).find(p => p.inlineData?.mimeType?.startsWith('image/'));
    if (!part) return jsonRes({ error: 'Gemini görsel döndürmedi' }, 502);
    return jsonRes({ b64: part.inlineData.data, mimeType: part.inlineData.mimeType });
  } catch (e) {
    return jsonRes({ error: e.name === 'AbortError' ? 'Gemini zaman aşımı' : ('Gemini isteği başarısız: ' + e.message) }, 502);
  } finally {
    clearTimeout(t);
  }
};

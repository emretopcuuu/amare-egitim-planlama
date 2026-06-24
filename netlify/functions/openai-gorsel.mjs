// netlify/functions/openai-gorsel.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST /.netlify/functions/openai-gorsel
//   Body: { apiKey, prompt, size, quality }
//
// Tarayıcı api.openai.com'a CORS ile erişemiyor ("Failed to fetch") →
// AI Afiş'in OpenAI YEDEK yolu bu sunucu proxy üzerinden geçer.
// Admin kendi OpenAI anahtarını gönderir (bundle'a gömülmez).
// Not: gpt-image üretimi yavaş olabilir; Netlify zaman sınırına takılırsa
// 502/504 döner, frontend Gemini'yi zaten önce dener.
// ─────────────────────────────────────────────────────────────────────────
import { corsPrivate, corsPreflight } from './_cors.mjs';

export default async (req) => {
  const CORS = corsPrivate(req);
  if (req.method === 'OPTIONS') return corsPreflight(req, true);
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), {
    status: 405, headers: { 'Content-Type': 'application/json', ...CORS },
  });

  try {
    const { apiKey, prompt, size = '1024x1536', quality = 'low' } = await req.json();
    if (!apiKey) return new Response(JSON.stringify({ error: 'OpenAI anahtarı yok' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
    });
    if (!prompt) return new Response(JSON.stringify({ error: 'prompt yok' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
    });

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-1', prompt, size, quality, n: 1 }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return new Response(JSON.stringify({ error: data?.error?.message || `OpenAI ${res.status}` }), {
        status: res.status, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return new Response(JSON.stringify({ error: 'OpenAI görsel döndürmedi' }), {
      status: 502, headers: { 'Content-Type': 'application/json', ...CORS },
    });
    return new Response(JSON.stringify({ b64 }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'proxy hatası' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
};

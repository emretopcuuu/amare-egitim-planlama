// netlify/functions/dil-cevir.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST /.netlify/functions/dil-cevir
//   Body: { texts: ["..."], targetLang: "en|de|nl" }
//
// Frontend dinamik çeviri için backend proxy.
// Eski: LanguageContext.jsx Gemini'yi doğrudan çağırıyordu, key bundle'a
// gömülüyordu (VITE_GEMINI_API_KEY) → SIZINTI riski.
// Yeni: OpenRouter backend tarafından çağrılır, key asla bundle'a girmez.
// ─────────────────────────────────────────────────────────────────────────

import { rateLimitCheck, rateLimitResponse } from './_rateLimit.mjs';
import { corsPrivate, corsPreflight } from './_cors.mjs';

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
const SITE_URL = 'https://egitimtakvimi.oneteamglobal.ai';

// 2026-06-05 audit fix: wildcard CORS → ekosistem allowlist (OpenRouter cost theft koruma)
const LANG_NAMES = {
  en: 'English',
  de: 'German',
  nl: 'Dutch',
};

export default async (req) => {
  const CORS = corsPrivate(req);

  if (req.method === 'OPTIONS') return corsPreflight(req, true);
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), {
    status: 405, headers: { 'Content-Type': 'application/json', ...CORS },
  });

  try {
    if (!OPENROUTER_KEY) {
      return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY env var Netlify\'da yok' }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    // Rate limit: 30 req/dk, 200 req/sa per IP (OpenRouter bakiye korumalı)
    const limit = await rateLimitCheck(req, 'dil-cevir', { perMinute: 30, perHour: 200 });
    if (!limit.ok) return rateLimitResponse(limit, CORS);

    const body = await req.json();
    const texts = Array.isArray(body.texts) ? body.texts.filter(t => typeof t === 'string' && t.trim()).slice(0, 50) : [];
    const targetLang = String(body.targetLang || '');

    if (texts.length === 0) {
      return new Response(JSON.stringify({ translations: [] }), {
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }
    if (!LANG_NAMES[targetLang]) {
      return new Response(JSON.stringify({ error: `Geçersiz dil: ${targetLang}` }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const langName = LANG_NAMES[targetLang];
    const prompt = `Translate the following Turkish texts to ${langName}. Return ONLY a JSON array of translated strings in the same order. Keep proper nouns, brand names (Amare, One Team, Diamond), city names, and technical terms as-is. Do not add explanations.

Input: ${JSON.stringify(texts)}`;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': SITE_URL,
        'X-Title': 'One Team Education',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: 'You are a professional translator. Output only valid JSON arrays of strings.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const errText = (await res.text()).slice(0, 300);
      return new Response(JSON.stringify({ error: `OpenRouter ${res.status}: ${errText}` }), {
        status: 502, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || '';

    // JSON array çıkar — bazen { "translations": [...] } veya direkt [...] gelir
    let translations = null;
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) translations = parsed;
      else if (Array.isArray(parsed.translations)) translations = parsed.translations;
      else if (Array.isArray(parsed.array)) translations = parsed.array;
      else {
        // Object'in ilk array değerini al
        const firstArray = Object.values(parsed).find(v => Array.isArray(v));
        if (firstArray) translations = firstArray;
      }
    } catch {
      // Regex fallback
      const match = text.match(/\[[\s\S]*\]/);
      if (match) translations = JSON.parse(match[0]);
    }

    if (!Array.isArray(translations) || translations.length !== texts.length) {
      return new Response(JSON.stringify({
        error: 'Çeviri formatı uygun değil',
        detail: text.slice(0, 200),
      }), { status: 502, headers: { 'Content-Type': 'application/json', ...CORS } });
    }

    return new Response(JSON.stringify({ translations }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        ...CORS,
      },
    });

  } catch (err) {
    console.error('[dil-cevir] hata:', err.message);
    return new Response(JSON.stringify({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
};

// netlify/functions/metin-uret.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST /.netlify/functions/metin-uret
//   Body: { tip: "duyuru|hatirlatma|ozel", baglam: {...}, sistemPrompt?, model? }
//
// Admin panelinden duyuru / hatırlatma metni üretir. OpenRouter backend.
// Eski: Gemini API key frontend'de localStorage'dan okunup direkt çağrılırdı.
// Yeni: Backend proxy, key bundle'a girmez.
//
// Auth: Firebase ID token (admin email check)
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

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
const SITE_URL = 'https://egitimtakvimi.oneteamglobal.ai';

// ADMIN_EMAILS artık _adminEmails.mjs'den

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function buildPrompt(tip, baglam) {
  const e = baglam || {};
  if (tip === 'duyuru') {
    return `Aşağıdaki eğitim için kısa, dikkat çekici bir DUYURU mesajı yaz. WhatsApp grubuna yapıştırılacak.

Kurallar:
- Maksimum 4 kısa paragraf
- Emoji kullan (3-5 adet, abartı yok)
- Türkçe, samimi, motive edici, klişe yok
- Tarih, saat, link bilgisi mutlaka olsun

Eğitim Bilgileri:
- Başlık: ${e.baslik || ''}
- Tarih: ${e.tarih || ''}
- Saat (TR): ${e.saat || ''}
- Platform/Yer: ${e.yer || 'ZOOM'}${e.egitmen ? '\n- Eğitmen: ' + e.egitmen : ''}${e.kategori ? '\n- Kategori: ' + e.kategori : ''}${e.aciklama ? '\n- Açıklama: ' + e.aciklama : ''}${e.link ? '\n- Link: ' + e.link : ''}

Sadece duyuru metnini yaz, başka açıklama yapma.`;
  }
  if (tip === 'hatirlatma') {
    return `Aşağıdaki eğitim için kısa bir HATIRLATMA mesajı yaz. Eğitime 1 saat kala WhatsApp ile gönderilecek.

Kurallar:
- Çok kısa (2-3 cümle max)
- Emoji 1-2 tane
- Türkçe, sıcak, davet edici
- Saat ve link mutlaka geçsin

Eğitim:
- Başlık: ${e.baslik || ''}
- Tarih: ${e.tarih || ''}
- Saat: ${e.saat || ''}
- Platform: ${e.yer || 'ZOOM'}${e.egitmen ? '\n- Eğitmen: ' + e.egitmen : ''}${e.kategori ? '\n- Kategori: ' + e.kategori : ''}${e.link ? '\n- Link: ' + e.link : ''}

Sadece mesajı yaz.`;
  }
  // 'ozel' — caller kendi prompt'unu gönderir
  return baglam?.prompt || '';
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), {
    status: 405, headers: { 'Content-Type': 'application/json', ...CORS },
  });

  try {
    if (!OPENROUTER_KEY) {
      return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY env var Netlify\'da yok' }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    // Auth — admin email kontrolü
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
    if (!isAdminToken(decoded)) {
      return new Response(JSON.stringify({ error: 'Sadece admin' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const body = await req.json();
    const tip = ['duyuru', 'hatirlatma', 'ozel'].includes(body.tip) ? body.tip : 'ozel';
    const sistemPrompt = body.sistemPrompt || 'You are a helpful Turkish content writer for a network marketing education platform.';
    const userPrompt = buildPrompt(tip, body.baglam);
    const model = body.model || OPENROUTER_MODEL;

    if (!userPrompt) {
      return new Response(JSON.stringify({ error: 'Prompt boş' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': SITE_URL,
        'X-Title': 'One Team Education',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: sistemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const errText = (await res.text()).slice(0, 300);
      return new Response(JSON.stringify({ error: `OpenRouter ${res.status}: ${errText}` }), {
        status: 502, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const data = await res.json();
    const metin = (data?.choices?.[0]?.message?.content || '').trim();
    if (!metin) {
      return new Response(JSON.stringify({ error: 'OpenRouter boş cevap döndürdü' }), {
        status: 502, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    return new Response(JSON.stringify({ metin }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    });

  } catch (err) {
    console.error('[metin-uret] hata:', err.message);
    return new Response(JSON.stringify({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
};

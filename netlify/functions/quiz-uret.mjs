// netlify/functions/quiz-uret.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST /.netlify/functions/quiz-uret
//   Body: { vimeoId, baslik, aciklama, transcript? }
//   Auth: Firebase ID Token (signed-in)
//
// Video için 3-5 soruluk MCQ üretir + Firestore'a cache'ler.
// Cache: kayitli_egitimler/{vimeoId}/quiz/main = { sorular: [...], olusturuldu }
// Tek seferlik üretilir, sonra herkese aynısı gösterilir.
// ─────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';
import { metinTemizleDeep } from './_metinTemizle.mjs';

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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SISTEM_PROMPT = `Sen bir eğitim quiz tasarımcısısın. Verilen video başlığı/açıklaması/transkriptinden 3-5 çoktan seçmeli soru üret.

KURALLAR:
- 3-5 soru, her biri 4 seçenekli
- Soru ve seçenekler Türkçe
- Doğru cevap seçeneklerden biri olmalı
- Trivya değil, KAVRAMI öğretici olsun
- Çok kolay ya da çok zor olmasın

ÇIKTI (sadece JSON):
{
  "sorular": [
    {
      "soru": "...",
      "secenekler": ["A şıkkı", "B şıkkı", "C şıkkı", "D şıkkı"],
      "dogruIndex": 0,
      "aciklama": "Doğru cevabın kısa açıklaması (1-2 cümle)"
    }
  ]
}`;

async function callLLM(prompt) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://egitimtakvimi.oneteamglobal.ai',
      'X-Title': 'One Team Education',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: SISTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    throw new Error(`OpenRouter ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Cevap JSON değil');
  return JSON.parse(match[0]);
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), {
    status: 405, headers: { 'Content-Type': 'application/json', ...CORS },
  });

  try {
    if (!OPENROUTER_KEY) {
      return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY eksik' }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const auth = req.headers.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return new Response(JSON.stringify({ error: 'Token gerekli' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
    });
    try { await admin.auth().verifyIdToken(m[1]); }
    catch { return new Response(JSON.stringify({ error: 'Geçersiz token' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
    }); }

    const body = await req.json();
    const vimeoId = String(body.vimeoId || '');
    if (!vimeoId) return new Response(JSON.stringify({ error: 'vimeoId gerekli' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
    });

    // Cache kontrolü
    const cacheRef = admin.firestore().doc(`kayitli_egitimler/${vimeoId}/quiz/main`);
    const cacheSnap = await cacheRef.get();
    if (cacheSnap.exists && cacheSnap.data().sorular?.length > 0) {
      return new Response(JSON.stringify({ ...cacheSnap.data(), cached: true }), {
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    // Yoksa Üret
    const prompt = `Video Bilgisi:
Başlık: ${body.baslik || ''}
Açıklama: ${(body.aciklama || '').slice(0, 1500)}
${body.transcript ? '\nTranskript (kısaltılmış):\n' + String(body.transcript).slice(0, 3000) : ''}

Bu video için 3-5 soruluk eğitici quiz üret.`;

    const sonucRaw = await callLLM(prompt);
    if (!sonucRaw.sorular || !Array.isArray(sonucRaw.sorular)) {
      throw new Error('Quiz üretimi başarısız — sorular array yok');
    }
    // MARKA TEMİZLİĞİ
    const sorular = metinTemizleDeep(sonucRaw.sorular);

    // Cache'le
    try {
      await cacheRef.set({
        vimeoId,
        sorular,
        olusturuldu: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {
      console.warn('[quiz-uret] cache write err:', e.message);
    }

    return new Response(JSON.stringify({ sorular, cached: false }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    });

  } catch (err) {
    console.error('[quiz-uret] hata:', err.message);
    return new Response(JSON.stringify({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
};

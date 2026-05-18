// netlify/functions/ai-transcript-analiz.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST /.netlify/functions/ai-transcript-analiz
//   Body: { vimeoId }
//   Auth: opsiyonel (cached değilse signed-in gerek)
//
// Tek bir LLM çağrısıyla videonun transcript'inden 3 değerli çıktı üretir:
//   - ahaMoments: 5 yüksek değerli alıntı (start saniye + text + sebep)
//   - chapters: zaman damgalı bölüm başlıkları (YouTube tarzı)
//   - ozet: 3 cümlede + 1 paragraf detay
//
// Cache: kayitli_egitimler/{vimeoId}/ai_analiz/main (30 gün TTL)
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

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SISTEM_PROMPT = `Sen network marketing/leadership eğitim videolarını analiz eden bir uzmansin.
Türkçe transcript verilir, 3 ÇIKTI üretirsin (sadece JSON):

{
  "ahaMoments": [
    { "start": 142.5, "text": "Tam alıntı 50-200 char", "sebep": "Neden onemli (10-25 kelime)" }
  ],
  "chapters": [
    { "start": 0, "baslik": "5-12 kelime bölüm başlığı" }
  ],
  "ozet": {
    "kisa": "3 cümle ozet (max 250 char)",
    "uzun": "1 paragraf detay (max 600 char)",
    "anaTema": "1 kelime ana tema (örn: liderlik, satış, motivasyon)"
  }
}

KURALLAR:
- ahaMoments: 3-5 adet, gerçekten düşündürücü/güçlü alıntılar. Soru cümlesi değil, ifade.
- chapters: 3-10 adet, videoyu mantıksal parçalara böl. Her chapter min 60sn olmalı.
- chapters[0].start her zaman 0
- ozet.anaTema: liderlik, satış, motivasyon, kişisel gelişim, vizyon, sağlık, ürün, vb
- Sadece JSON yaz, hiçbir açıklama EKLEME.`;

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
      temperature: 0.3,
      max_tokens: 3000,
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
  if (!match) throw new Error(`Cevap JSON değil: ${text.slice(0, 100)}`);
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

    const body = await req.json();
    const vimeoId = String(body.vimeoId || '').trim();
    if (!vimeoId) return new Response(JSON.stringify({ error: 'vimeoId gerekli' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
    });

    // Cache kontrolü (30 gün TTL — içerik değişmez)
    const cacheRef = admin.firestore().doc(`kayitli_egitimler/${vimeoId}/ai_analiz/main`);
    const cacheSnap = await cacheRef.get();
    if (cacheSnap.exists) {
      const c = cacheSnap.data();
      const ts = c.timestamp?._seconds * 1000 || 0;
      if (Date.now() - ts < 30 * 24 * 60 * 60 * 1000) {
        return new Response(JSON.stringify({ ...c, cached: true }), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600', ...CORS },
        });
      }
    }

    // Auth check (cache değilse signed-in gerek)
    const auth = req.headers.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return new Response(JSON.stringify({ error: 'Token gerekli (cache miss)' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
    });
    try { await admin.auth().verifyIdToken(m[1]); }
    catch { return new Response(JSON.stringify({ error: 'Geçersiz token' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
    }); }

    // Video doc'undan transcript çek
    const videoSnap = await admin.firestore().doc(`kayitli_egitimler/${vimeoId}`).get();
    if (!videoSnap.exists) {
      return new Response(JSON.stringify({ error: 'Video bulunamadı' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }
    const videoData = videoSnap.data();
    const chunks = Array.isArray(videoData.transcriptChunks) ? videoData.transcriptChunks : [];

    if (chunks.length === 0) {
      return new Response(JSON.stringify({
        error: 'Bu videoda transcript chunks yok',
        ahaMoments: [], chapters: [], ozet: null,
      }), { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } });
    }

    // Transcript'i LLM'e hazırla — kısaltılmış, sadece [start] text format
    const transcript = chunks.map(c =>
      `[${Math.floor(c.start || 0)}s] ${c.text || ''}`
    ).join('\n').slice(0, 18000); // ~18K char max

    const prompt = `Video: ${videoData.baslik || ''}
Egitmenler: ${(videoData.egitmenAdlari || []).join(', ')}
Kategoriler: ${(videoData.kategoriler || []).join(', ')}
Süre: ${Math.floor((videoData.sure || 0) / 60)}dk

Transcript ([saniye] text formatinda):
${transcript}

3 ÇIKTI üret: ahaMoments + chapters + ozet (sistem prompt'taki format).`;

    const sonuc = await callLLM(prompt);

    // Validate
    if (!Array.isArray(sonuc.ahaMoments)) sonuc.ahaMoments = [];
    if (!Array.isArray(sonuc.chapters)) sonuc.chapters = [];

    // Cache yaz
    try {
      await cacheRef.set({
        ...sonuc,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        model: OPENROUTER_MODEL,
        chunksCount: chunks.length,
      });
    } catch (e) {
      console.warn('[ai-transcript-analiz] cache write err:', e.message);
    }

    return new Response(JSON.stringify({ ...sonuc, cached: false }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    });

  } catch (err) {
    console.error('[ai-transcript-analiz] hata:', err.message);
    return new Response(JSON.stringify({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
};

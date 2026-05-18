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

// Cache invalidation — bu numarayı bump'la, eski cache'ler atılır.
// v1 → original (18K char truncation bug, chapters yarıda)
// v2 → 200K char limit + chapter coverage uyarısı
// v3 → ahaMoments Whisper hatası düzeltme + Doğrudan Satış sözlüğü
const PROMPT_VERSION = 3;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SISTEM_PROMPT = `Sen Doğrudan Satış / liderlik eğitim videolarını analiz eden bir uzmansin.
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
  ahaMoments TÜM VİDEO BOYUNCA dağılmalı (başı, ortası, sonu). Hepsi videonun başında olmasın.

- ÖNEMLİ — TRANSCRIPT TEMİZLİĞİ:
  Transcript Whisper (otomatik konuşma tanıma) ile üretildi. Türkçede yaygın hatalar yapıyor:
  "sitres" → "stres", "ciharet" → "ticaret", "mademleri" → "maddemiz", "baspılıyor" → "başlıyor",
  "Burken" → "Buradan", "dürüdü" → "tüyo", "menüm" → "benim", "ki şı" → "kişi" vb.
  ahaMoments[].text alanını yazarken:
  - Anlamı koruyarak Whisper hatalarını DÜZELT (yazım, kelime hataları)
  - Konuşmacının üslubunu BOZMA (orijinal cümle yapısı kalsın)
  - Belirgin yanlış kelimeyi düzelt, şüpheliyi bırak
  - Sonuç DOĞRU Türkçe akıcı bir alıntı olmalı

- chapters: 5-10 adet, videoyu mantıksal parçalara böl. Her chapter min 60sn olmalı.
  ÇOK ÖNEMLİ: chapters TÜM VİDEO SÜRESİNİ KAPSAMALI. Son chapter videonun son %15'i içinde olmalı.
  Örnek: 33dk video → son chapter en geç 28dk civarında başlamalı. Yarıda bitirme.
- chapters[0].start her zaman 0
- ozet.anaTema: liderlik, satış, motivasyon, kişisel gelişim, vizyon, sağlık, ürün, vb
- MARKA: "network marketing" terimini ASLA kullanma. Her zaman "Doğrudan Satış" yaz.
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
      max_tokens: 4000,
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

    // Cache kontrolü (30 gün TTL + prompt versiyon)
    // ?force=1 → cache'i atla, yeniden üret (tek video için)
    const url = new URL(req.url);
    const force = url.searchParams.get('force') === '1';
    const cacheRef = admin.firestore().doc(`kayitli_egitimler/${vimeoId}/ai_analiz/main`);
    const cacheSnap = await cacheRef.get();
    if (!force && cacheSnap.exists) {
      const c = cacheSnap.data();
      const ts = c.timestamp?._seconds * 1000 || 0;
      const versionOk = (c.promptVersion || 1) >= PROMPT_VERSION;
      if (versionOk && Date.now() - ts < 30 * 24 * 60 * 60 * 1000) {
        return new Response(JSON.stringify({ ...c, cached: true }), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600', ...CORS },
        });
      }
      // Versiyon uyumsuz → re-generate (eski cache yarıda kalmış chapter'lar içeriyor)
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

    // Transcript'i LLM'e hazırla — [start] text format
    // Gemini 2.5 Flash 1M token context destekler → 200K char limiti tamamen güvenli.
    // Eski 18K char limiti uzun videolarda chapter'ları yarıda kesiyordu.
    const FULL_LIMIT = 200000; // ~50K token, son chunk dahil
    let transcript = chunks.map(c =>
      `[${Math.floor(c.start || 0)}s] ${c.text || ''}`
    ).join('\n');

    // Eğer 200K'dan büyükse (çok nadir, 3+ saatlik videolar), smart sample:
    // başı tam tut, ortayı seyrelt, sonu tam tut → chapter'lar baş+son'u görebilsin
    if (transcript.length > FULL_LIMIT) {
      const bas = transcript.slice(0, FULL_LIMIT * 0.4);
      const son = transcript.slice(-FULL_LIMIT * 0.4);
      const orta = transcript.slice(FULL_LIMIT * 0.4, transcript.length - FULL_LIMIT * 0.4);
      // Orta'dan her N. satırı al
      const ortaSatirlar = orta.split('\n');
      const adim = Math.ceil(ortaSatirlar.length / (FULL_LIMIT * 0.2 / 50));
      const ortaSampled = ortaSatirlar.filter((_, i) => i % adim === 0).join('\n');
      transcript = bas + '\n[... transcript orta kısmı seyreltildi ...]\n' + ortaSampled + '\n' + son;
    }

    const sureSn = Math.floor(videoData.sure || 0);
    const sureMin = Math.floor(sureSn / 60);
    const sureMinSn = sureSn % 60;
    const sonChunkSn = Math.floor(chunks[chunks.length - 1]?.start || sureSn);
    const sonChapterMin = Math.floor(sonChunkSn * 0.85 / 60); // %85'ten sonra başlamalı

    const prompt = `Video: ${videoData.baslik || ''}
Egitmenler: ${(videoData.egitmenAdlari || []).join(', ')}
Kategoriler: ${(videoData.kategoriler || []).join(', ')}
TOPLAM SÜRE: ${sureMin} dakika ${sureMinSn} saniye (${sureSn} saniye)
Son transcript chunk: ${Math.floor(sonChunkSn/60)}:${String(sonChunkSn%60).padStart(2,'0')}

UYARI: Chapters TÜM VİDEOYU kapsamalı. Son chapter en geç ${sonChapterMin}. dakikada başlamalı.

Transcript ([saniye] text formatinda):
${transcript}

3 ÇIKTI üret: ahaMoments + chapters + ozet (sistem prompt'taki format).
HATIRLAT: chapters videonun BAŞINDAN SONUNA kadar dağılmalı, yarıda kesme.`;

    const sonucRaw = await callLLM(prompt);

    // Validate
    if (!Array.isArray(sonucRaw.ahaMoments)) sonucRaw.ahaMoments = [];
    if (!Array.isArray(sonucRaw.chapters)) sonucRaw.chapters = [];

    // MARKA TEMİZLİĞİ — "network marketing" → "Doğrudan Satış"
    const sonuc = metinTemizleDeep(sonucRaw);

    // Cache yaz
    try {
      await cacheRef.set({
        ...sonuc,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        model: OPENROUTER_MODEL,
        chunksCount: chunks.length,
        promptVersion: PROMPT_VERSION,
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

// netlify/functions/ai-rank-puanla.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST /.netlify/functions/ai-rank-puanla
//   Auth: admin Bearer token
//   Body: { rankKey: 'gold', limit: 30 }  veya  { rankKey: 'all' }
//
// Belirtilen rank profili için tüm AI-analizli videoları puanlar (0-100).
// Top N video Firestore'a kaydedilir: rank_oneriler/{rankKey}
// Admin ID listesi: Firestore'dan _adminEmails.mjs ile doğrulanır.
//
// Algoritma:
//   1. AI-analizli, kayene-değil tüm video havuzu (max 200 video)
//   2. Hızlı pre-filter: ozet.anaTema rank.temalar ile eşleşme + kategoriler
//   3. LLM batch scoring (20 video / call, ~5-10 call):
//      "Bu video [rank profili] için ne kadar uygun? 0-100 + 1 cümle sebep"
//   4. Sonuç: top N (default 10) Firestore'a yazılır
//   5. Cache: 14 gün (rank_oneriler_cache içinde timestamp)
// ─────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';
import { RANK_PROFILLERI, RANK_KEYS } from './_rankProfilleri.mjs';
import { isAdminToken } from './_adminEmails.mjs';
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

const BATCH_SIZE = 20;        // her LLM call'da kaç video skorlanır
const POOL_MAX = 200;          // toplam taranan video sayısı
const TOP_N_DEFAULT = 10;      // her rank için döndürülen top
const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 gün

const SISTEM_PROMPT = `Sen Doğrudan Satış kariyer eğitim sistemi için video küratörüsün.
Sana bir RANK PROFİLİ ve VIDEO LİSTESİ verilir.
Her videoya o rank için 0-100 arası uygunluk puanı + 1 cümle sebep döndür.

PUANLAMA KRİTERLERİ:
- Hedeflere uygunluk (en önemli) - rank.hedefler ile videonun içerik örtüşmesi
- Tema uyumu - video.anaTema rank.temalar ile eşleşmeli
- Zorluk seviyesi - rank.seviye ile video derinliği uyumu (yeni başlayana çok teknik atma)
- Pratik değer - "bu video bu rank'a ne kazandırır?"

MARKA: "network marketing" yazma, "Doğrudan Satış" kullan.

ÇIKTI (SADECE JSON):
{
  "skorlar": [
    { "vimeoId": "...", "puan": 87, "sebep": "Tek cümle açıklama" }
  ]
}`;

async function llmCall(prompt) {
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
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('JSON parse hatasi');
  return JSON.parse(match[0]);
}

function jsonRes(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

// Bir rank için skorlama
async function rankIcinSkorla(rankKey, db) {
  const profil = RANK_PROFILLERI[rankKey];
  if (!profil) throw new Error(`Bilinmeyen rank: ${rankKey}`);

  // 1. AI analizli video havuzu çek
  // Önce rank tema/kategorilere yakın olanları seç (pre-filter)
  const tumVideoSnap = await db.collection('kayitli_egitimler')
    .where('transcriptVar', '==', true)
    .where('kayeneFiltrelendi', '==', false)
    .select('baslik', 'kategoriler', 'sure', 'tarih', 'egitmenAdlari', 'dil', 'thumbnailUrl')
    .limit(500)
    .get();

  // Pre-filter: dil=TR (veya boş, TR varsay) + kategori veya tema match
  const preFiltered = [];
  tumVideoSnap.docs.forEach(d => {
    const data = d.data();
    const dil = (data.dil || 'TR').toUpperCase();
    if (dil !== 'TR') return; // sadece TR (default)
    const kats = (data.kategoriler || []).map(k => k.toLowerCase());
    const baslikLow = (data.baslik || '').toLowerCase();

    // Kategori veya başlık temalardan biriyle eşleşiyorsa puan +
    let preScore = 0;
    for (const tema of profil.temalar) {
      const t = tema.toLowerCase();
      if (kats.some(k => k.includes(t))) preScore += 30;
      if (baslikLow.includes(t)) preScore += 20;
    }
    for (const kat of (profil.kategoriler || [])) {
      if (kats.some(k => k === kat.toLowerCase())) preScore += 40;
    }

    if (preScore > 0) {
      preFiltered.push({ id: d.id, ...data, preScore });
    }
  });

  // En yüksek preScore'a göre sırala, top POOL_MAX
  preFiltered.sort((a, b) => b.preScore - a.preScore);
  const pool = preFiltered.slice(0, POOL_MAX);

  if (pool.length === 0) {
    return { rankKey, top: [], havuz: 0, ai_analizli: 0 };
  }

  // 2. AI analiz bilgisi ekle (paralel batch fetch)
  const aiMap = {};
  for (let i = 0; i < pool.length; i += 30) {
    const batch = pool.slice(i, i + 30);
    const snaps = await Promise.all(batch.map(p =>
      db.doc(`kayitli_egitimler/${p.id}/ai_analiz/main`).get()
    ));
    snaps.forEach((s, idx) => {
      if (s.exists) aiMap[batch[idx].id] = s.data();
    });
  }

  const aiAnalizli = pool.filter(p => aiMap[p.id]);
  if (aiAnalizli.length === 0) {
    return { rankKey, top: [], havuz: pool.length, ai_analizli: 0 };
  }

  // 3. LLM batch scoring
  const profilStr = `RANK: ${profil.label} (Seviye ${profil.seviye}/14)
HEDEFLER:
${profil.hedefler.map((h, i) => `${i+1}. ${h}`).join('\n')}
TEMALAR: ${profil.temalar.join(', ')}
KATEGORİLER (tercih): ${(profil.kategoriler || []).join(', ')}`;

  const skorlar = {};
  for (let i = 0; i < aiAnalizli.length; i += BATCH_SIZE) {
    const batch = aiAnalizli.slice(i, i + BATCH_SIZE);
    const videoStr = batch.map(p => {
      const ai = aiMap[p.id];
      const ozet = ai.ozet?.kisa || '';
      const tema = ai.ozet?.anaTema || '';
      const kats = (p.kategoriler || []).join(', ');
      return `vimeoId: ${p.id} | baslik: ${(p.baslik || '').slice(0, 80)} | anaTema: ${tema} | kategoriler: ${kats}
ozet: ${ozet.slice(0, 200)}`;
    }).join('\n\n');

    const prompt = `${profilStr}

VIDEO LISTESI (${batch.length} adet):

${videoStr}

Her video için 0-100 arası uygunluk puanı + 1 cümle sebep döndür. Sıralama önemli değil, sadece skor + sebep.`;

    try {
      const cikti = await llmCall(prompt);
      (cikti.skorlar || []).forEach(s => {
        if (s.vimeoId && typeof s.puan === 'number') {
          skorlar[String(s.vimeoId)] = {
            puan: Math.max(0, Math.min(100, Math.round(s.puan))),
            sebep: s.sebep || '',
          };
        }
      });
    } catch (e) {
      console.warn(`[ai-rank-puanla] ${rankKey} batch ${i} hata:`, e.message);
    }
  }

  // 4. Top N seç (skor + meta)
  const enriched = aiAnalizli
    .filter(p => skorlar[p.id])
    .map(p => ({
      vimeoId: p.id,
      baslik: p.baslik,
      thumbnailUrl: p.thumbnailUrl,
      egitmenAdlari: p.egitmenAdlari || [],
      kategoriler: p.kategoriler || [],
      sure: p.sure,
      tarih: p.tarih,
      anaTema: aiMap[p.id]?.ozet?.anaTema,
      puan: skorlar[p.id].puan,
      sebep: skorlar[p.id].sebep,
    }))
    .sort((a, b) => b.puan - a.puan);

  const sonuc = {
    rankKey,
    rankLabel: profil.label,
    top: metinTemizleDeep(enriched.slice(0, 20)),
    havuz: pool.length,
    ai_analizli: aiAnalizli.length,
    skorlanan: Object.keys(skorlar).length,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  // 5. Firestore'a yaz
  try {
    await db.doc(`rank_oneriler/${rankKey}`).set(sonuc);
  } catch (e) {
    console.warn(`[ai-rank-puanla] ${rankKey} Firestore yaz hata:`, e.message);
  }

  return sonuc;
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return jsonRes({ error: 'POST only' }, 405);

  try {
    if (!OPENROUTER_KEY) return jsonRes({ error: 'OPENROUTER_API_KEY eksik' }, 500);

    // Admin token check
    const auth = req.headers.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return jsonRes({ error: 'Token gerekli' }, 401);
    let decoded;
    try { decoded = await admin.auth().verifyIdToken(m[1]); }
    catch { return jsonRes({ error: 'Geçersiz token' }, 401); }
    if (!isAdminToken(decoded)) return jsonRes({ error: 'Admin yetkisi yok' }, 403);

    const body = await req.json();
    const rankKey = String(body.rankKey || '').trim();
    const force = body.force === true;
    const db = admin.firestore();

    if (!rankKey) return jsonRes({ error: 'rankKey gerekli ("all" veya rank adı)' }, 400);

    // Tek rank skorla
    if (rankKey !== 'all') {
      if (!RANK_KEYS.includes(rankKey)) {
        return jsonRes({ error: `Bilinmeyen rank: ${rankKey}` }, 400);
      }
      // Cache kontrol (force=true ile by-pass)
      if (!force) {
        const cacheSnap = await db.doc(`rank_oneriler/${rankKey}`).get();
        if (cacheSnap.exists) {
          const c = cacheSnap.data();
          const ts = c.timestamp?._seconds * 1000 || 0;
          if (Date.now() - ts < CACHE_TTL_MS) {
            return jsonRes({ ...c, cached: true });
          }
        }
      }
      const t0 = Date.now();
      const sonuc = await rankIcinSkorla(rankKey, db);
      return jsonRes({ ...sonuc, cached: false, sureMs: Date.now() - t0 });
    }

    // Tüm ranklar — bu uzun sürer (~5-10dk), tek HTTP request'te yapmayalım
    // Frontend tek tek "all" çağırmalı veya queue olmalı
    return jsonRes({
      error: 'rankKey="all" desteklenmez (timeout). Tek tek çağır: brand_partner, brand_builder, ...',
      ranks: RANK_KEYS,
    }, 400);

  } catch (err) {
    console.error('[ai-rank-puanla] hata:', err.message, err.stack);
    return jsonRes({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }, 500);
  }
};

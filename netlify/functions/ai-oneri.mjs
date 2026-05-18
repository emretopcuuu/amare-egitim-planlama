// netlify/functions/ai-oneri.mjs
// ─────────────────────────────────────────────────────────────────────────
// GET /.netlify/functions/ai-oneri
//   Authorization: Bearer <Firebase ID Token>
//
// Kullanıcının izleme geçmişine + favorilerine + curriculum'una göre
// AI ile 5 video önerisi yapar.
//
// Yaklaşım:
//   - Kullanıcının izledikleri + favorileri + rank → bağlam
//   - kayitli_egitimler'den (kayene değil) 100 başlık ile birlikte LLM'e gönder
//   - LLM en uygun 5'i seçer (içerik tabanlı)
//
// Cache: users/{uid}/ai_cache/oneri (12 saat)
// Embedding-vari değil ama LLM-as-recommender — küçük katalog için yeterli
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
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SISTEM_PROMPT = `Sen Doğrudan Satış eğitim platformu için içerik öneri motorusun.
Kullanıcının izleme geçmişi, favorileri ve kariyer rank'ına bakarak SONRAKI 3 videoyu öner.

Kurallar:
- Her öneri için: vimeoId, başlık, neden (1 kısa Türkçe cümle)
- Çeşitlilik: aynı eğitmen/konuda 3 öneri olmasın
- Kullanıcı izlediği şeyleri öneri listesine KOYMA
- Rank'a uygun ya da 1 üstüne yönlendirici olsun
- MARKA: "network marketing" yazma — her zaman "Doğrudan Satış" kullan
- Sadece JSON çıktı

ÇIKTI FORMATI:
{
  "oneriler": [
    { "vimeoId": "...", "sebep": "..." }
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
      temperature: 0.5,
      max_tokens: 1024,
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
    let decoded;
    try { decoded = await admin.auth().verifyIdToken(m[1]); }
    catch { return new Response(JSON.stringify({ error: 'Geçersiz token' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
    }); }
    const uid = decoded.uid;

    // Cache (12 saat)
    const cacheRef = admin.firestore().doc(`users/${uid}/ai_cache/oneri`);
    const cacheSnap = await cacheRef.get();
    if (cacheSnap.exists) {
      const c = cacheSnap.data();
      const ts = c.timestamp?._seconds * 1000 || 0;
      if (Date.now() - ts < 12 * 60 * 60 * 1000) {
        return new Response(JSON.stringify({ ...c.sonuc, cached: true }), {
          headers: { 'Content-Type': 'application/json', ...CORS },
        });
      }
    }

    // 1. Kullanıcının izleme geçmişi (users/{uid}/watch_progress)
    let izlenenler = [];
    try {
      const wpSnap = await admin.firestore().collection(`users/${uid}/watch_progress`)
        .orderBy('updatedAt', 'desc').limit(20).get();
      izlenenler = wpSnap.docs.map(d => d.id);
    } catch {}

    // 2. Favoriler — eğer varsa
    let favoriler = [];
    try {
      const ufSnap = await admin.firestore().collection(`users/${uid}/takip`).limit(20).get();
      favoriler = ufSnap.docs.map(d => d.id);
    } catch {}

    // 3. Rank
    let kullaniciRank = null;
    try {
      const userSnap = await admin.firestore().doc(`users/${uid}`).get();
      if (userSnap.exists) {
        kullaniciRank = userSnap.data().rank || null;
      }
    } catch {}

    // 4. Tüm kataloglu video başlıkları (kompakt)
    const vSnap = await admin.firestore()
      .collection('kayitli_egitimler')
      .where('kayeneFiltrelendi', '==', false)
      .limit(200)
      .get();
    const katalog = vSnap.docs
      .filter(d => !izlenenler.includes(d.data().vimeoId))
      .map(d => {
        const data = d.data();
        return {
          vimeoId: data.vimeoId,
          baslik: (data.baslik || '').slice(0, 100),
          kategoriler: (data.kategoriler || []).slice(0, 2),
        };
      })
      .slice(0, 150);

    if (katalog.length === 0) {
      return new Response(JSON.stringify({ oneriler: [], sebep: 'Katalog boş' }), {
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    // 5. LLM'e prompt
    const prompt = `Kullanıcı Profili:
Rank: ${kullaniciRank || 'Belirsiz'}
Son izledikleri (vimeoId): ${izlenenler.slice(0, 10).join(', ') || 'yok'}
Favorileri: ${favoriler.slice(0, 5).join(', ') || 'yok'}

Eğitim Kataloğu (vimeoId · başlık · kategori):
${katalog.map(k => `${k.vimeoId} · ${k.baslik} · ${k.kategoriler.join('/')}`).join('\n')}

Bu kullanıcıya SONRAKI 5 video önerisi yap.`;

    const sonuc = await callLLM(prompt);

    // 6. Önerileri video metadata ile zenginleştir
    const oneriMap = {};
    vSnap.docs.forEach(d => { oneriMap[d.data().vimeoId] = { id: d.id, ...d.data() }; });
    const zenginOneriler = (sonuc.oneriler || [])
      .filter(o => oneriMap[o.vimeoId])
      .slice(0, 3)
      .map(o => ({
        vimeoId: o.vimeoId,
        sebep: o.sebep,
        baslik: oneriMap[o.vimeoId].baslik,
        thumbnailUrl: oneriMap[o.vimeoId].thumbnailUrl,
        egitmenAdlari: oneriMap[o.vimeoId].egitmenAdlari || [],
        kategoriler: oneriMap[o.vimeoId].kategoriler || [],
        puanOrt: oneriMap[o.vimeoId].puanOrt || null,
        sure: oneriMap[o.vimeoId].sure || null,
      }));

    const cikti = metinTemizleDeep({ oneriler: zenginOneriler });

    // Cache
    try {
      await cacheRef.set({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        sonuc: cikti,
      });
    } catch {}

    return new Response(JSON.stringify({ ...cikti, cached: false }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    });

  } catch (err) {
    console.error('[ai-oneri] hata:', err.message);
    return new Response(JSON.stringify({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
};

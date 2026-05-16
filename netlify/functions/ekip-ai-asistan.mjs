// netlify/functions/ekip-ai-asistan.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST /.netlify/functions/ekip-ai-asistan
//   Authorization: Bearer <Firebase ID Token>
//
// Gemini 2.5 Flash ile sponsor'a haftalık 3-5 öncelikli aksiyon önerir.
// Input: ekibim verisi snapshot (özet + her üye için anahtar metrikler)
// Output: { oneriler: [{ amareId, ad, eylem, mesaj, oncelik, sebep }] }
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

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

const SISTEM_PROMPT = `Sen bir network marketing eğitim sistemi yapay zekâ asistanısın.
Görevin: sponsor'un (lider) bu hafta hangi 3-5 üyesine ne yapması gerektiğini önermek.

Veri tabanlı, bold, direkt yaz. Klişe yok, "harika!" gibi tatlandırma yok.

ÇIKTI FORMATI (sadece JSON, açıklama yazma):
{
  "oneriler": [
    {
      "amareId": "...",
      "ad": "...",
      "eylem": "wp_mesaj | davet | tebrik | egitim_oner | rank_itki | kontrol",
      "oncelik": 1-5,
      "sebep": "20 kelimeyi geçmesin — neden bu üye, neden bu eylem",
      "mesaj": "Yapay 2-3 cümlelik WhatsApp mesajı taslağı, doğal Türkçe, samimi"
    }
  ]
}

Öncelik 1 = bu hafta MUTLAKA, 5 = nice-to-have.
Maks 5 öneri. Her üyeden sadece 1 öneri.
Yeni üye (kayıt < 14g) varsa onlar önce.
Rank'a çok yakın varsa onları öne çıkar.
Risk/Pasif olanlar her zaman dikkat ister.`;

async function callGemini(prompt) {
  if (!GEMINI_KEY) throw new Error('Gemini API key eksik');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
        systemInstruction: { parts: [{ text: SISTEM_PROMPT }] },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.find(p => p.text)?.text || '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Gemini cevabı parse edilemedi');
  return JSON.parse(match[0]);
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), {
    status: 405, headers: { 'Content-Type': 'application/json', ...CORS },
  });

  try {
    // Auth
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

    // Cache kontrolü — 6 saatte bir tekrar AI çağırma
    const cacheRef = admin.firestore().doc(`users/${uid}/ai_cache/asistan`);
    const cacheSnap = await cacheRef.get();
    const altiSaat = 6 * 60 * 60 * 1000;
    if (cacheSnap.exists) {
      const cTimestamp = cacheSnap.data().timestamp?._seconds * 1000 || 0;
      if (Date.now() - cTimestamp < altiSaat) {
        return new Response(JSON.stringify({
          ...cacheSnap.data().sonuc,
          cached: true,
          yas: Math.floor((Date.now() - cTimestamp) / 60000),
        }), { headers: { 'Content-Type': 'application/json', ...CORS } });
      }
    }

    // Sponsor amareId
    const userDoc = await admin.firestore().doc(`users/${uid}`).get();
    if (!userDoc.exists) return new Response(JSON.stringify({ error: 'Profil yok' }), {
      status: 404, headers: { 'Content-Type': 'application/json', ...CORS },
    });
    const sponsorAmareId = String(userDoc.data().amareId || '');
    if (!sponsorAmareId) return new Response(JSON.stringify({ error: 'Amare ID bağlı değil' }), {
      status: 404, headers: { 'Content-Type': 'application/json', ...CORS },
    });

    // Ekibi çek (özet bilgilerle)
    const ekipRows = await supabaseGet(
      `amare_raw_members?select=amare_id,full_name,rank,enrollment_date,raw_data&` +
      `or=(enroller_amare_id.eq.${encodeURIComponent(sponsorAmareId)},sponsor_amare_id.eq.${encodeURIComponent(sponsorAmareId)})&` +
      `limit=100`
    );

    if (!ekipRows || ekipRows.length === 0) {
      return new Response(JSON.stringify({ oneriler: [], sebep: 'Henüz ekip üyesi yok' }), {
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    // Firestore users → curriculum + last seen
    const allAmareIds = ekipRows.map(r => String(r.amare_id));
    const userMap = {};
    for (let i = 0; i < allAmareIds.length; i += 30) {
      const batch = allAmareIds.slice(i, i + 30);
      try {
        const snap = await admin.firestore().collection('users').where('amareId', 'in', batch).get();
        snap.forEach(doc => {
          const d = doc.data();
          userMap[String(d.amareId)] = {
            uid: doc.id,
            sonGiris: d.sonGiris?._seconds || null,
            streak: d.streak?.current || 0,
          };
        });
      } catch {}
    }

    // Curriculum
    const egitimMap = {};
    for (const u of Object.values(userMap)) {
      try {
        const ed = await admin.firestore().doc(`users/${u.uid}/egitim_durumu/profil`).get();
        if (ed.exists) {
          const aktif = ed.data().yollar?.[ed.data().mevcutRank];
          egitimMap[u.uid] = aktif?.tamamlanmaOrani ?? 0;
        }
      } catch {}
    }

    // AI için kompakt veri
    const ekipOzet = ekipRows.map(r => {
      const aId = String(r.amare_id);
      const u = userMap[aId];
      const sonGirisG = u?.sonGiris ? Math.floor((Date.now() / 1000 - u.sonGiris) / 86400) : null;
      const kayitG = r.enrollment_date ? Math.floor((Date.now() - new Date(r.enrollment_date).getTime()) / 86400000) : null;
      const raw = r.raw_data || {};
      return {
        amareId: aId,
        ad: r.full_name || raw.full_name || '?',
        rank: r.rank || raw.career_rank || null,
        kayitGun: kayitG,
        sonGirisGun: sonGirisG,
        siteKullanan: !!u,
        curriculum: u ? (egitimMap[u.uid] ?? null) : null,
        streak: u?.streak || 0,
        pv: Number(raw.pv ?? raw.personal_volume ?? 0) || 0,
        gv: Number(raw.gv ?? raw.group_volume ?? 0) || 0,
        sonSiparis: raw.last_order_date || null,
        direct: Number(raw.direct_count ?? 0) || 0,
      };
    });

    // Gemini'ye prompt
    const prompt = `Sponsor'un ekip verisi (JSON):
${JSON.stringify({ sponsorAmareId, ekip: ekipOzet }, null, 2)}

Bu veriyi analiz et ve sponsor'un BU HAFTA yapması gereken 3-5 öncelikli eylemi öner.`;

    const sonuc = await callGemini(prompt);

    // Cache'le
    try {
      await cacheRef.set({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        sonuc,
      });
    } catch {}

    return new Response(JSON.stringify({ ...sonuc, cached: false, yas: 0 }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    });

  } catch (err) {
    console.error('[ekip-ai-asistan] hata:', err.message, err.stack);
    return new Response(JSON.stringify({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
};

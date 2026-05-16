// netlify/functions/vimeo-kategorize.mjs
// ─────────────────────────────────────────────────────────────────────────
// kayitli_egitimler içinde kategorisi olmayan videolar için Gemini ile
// kategori ata. Önce başlık+açıklama, "Diğer" çıkarsa transcript ile yeniden dene.
//
// Scheduled: 6 saatte bir, batch 50 video.
//
// Manuel tetik:
//   GET /.netlify/functions/vimeo-kategorize?dryRun=true&limit=5
//   GET /.netlify/functions/vimeo-kategorize?force=true   (kategori dolu olanları da yeniden ele)
//
// Header: x-admin-secret (manuel tetik için)
//
// Env vars:
//   OPENROUTER_API_KEY        — OpenRouter (default model: google/gemini-2.5-flash)
//   OPENROUTER_MODEL          — opsiyonel, başka modele geçmek için
//   FIREBASE_*                — admin SDK
//   INGEST_ADMIN_SECRET       — manuel tetik korumalı
// ─────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';

export const config = { schedule: '0 */6 * * *' };

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

// 13 kategori + Diğer (plan'a göre)
const KATEGORILER = [
  'Liderlik', 'Satış', 'Motivasyon', 'Davet', 'Kapanış',
  'Sunum Teknikleri', 'Zaman Yönetimi', 'Kişisel Gelişim',
  'Sağlık', 'Finansal Özgürlük', 'Vizyon', 'Hikaye',
  'Ürün Eğitimi', 'Diğer',
];

async function callLLM(prompt) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY missing');
  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://egitimtakvimi.oneteamglobal.ai',
      'X-Title': 'One Team Education',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 256,
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${txt.slice(0, 200)}`);
  }

  const data = await res.json();
  return (data?.choices?.[0]?.message?.content || '').trim();
}

function buildPrompt({ baslik, aciklama, transcript }) {
  const transcriptKismi = transcript
    ? `\nVİDEO TRANSKRİPTİ (kısaltılmış):\n${transcript.slice(0, 3500)}`
    : '';
  return `Sen bir eğitim videosu kategorizasyon uzmanısın. Aşağıdaki video için EN UYGUN 1 veya 2 kategori seç.

İZİN VERİLEN KATEGORİLER (sadece bu listeden):
${KATEGORILER.join(', ')}

KURALLAR:
- Maksimum 2 kategori, virgülle ayır. (örn: "Liderlik, Motivasyon")
- Yalnızca yukarıdaki listeden seç, listede olmayan kelime YAZMA.
- Kategori belirlenemiyorsa: "Diğer"
- Başlık ve açıklama yeterince bilgi vermiyorsa transkriptten karar ver.
- Sadece kategorileri yaz, başka açıklama EKLEME, JSON formatı KULLANMA.

VİDEO:
Başlık: ${baslik || '-'}
Açıklama: ${(aciklama || '').slice(0, 1000)}${transcriptKismi}

CEVAP (sadece kategori adları):`;
}

function parseKategoriler(geminiText) {
  if (!geminiText) return [];
  // İlk satırı al, virgülle böl
  const first = geminiText.split('\n')[0];
  const parts = first.split(/[,;|/]/)
    .map(s => s.trim().replace(/^["'`]|["'`]$/g, ''))
    .filter(Boolean);

  const valid = [];
  for (const p of parts) {
    // Tam eşleşme veya case-insensitive
    const match = KATEGORILER.find(k => k.toLocaleLowerCase('tr-TR') === p.toLocaleLowerCase('tr-TR'));
    if (match && !valid.includes(match)) valid.push(match);
    if (valid.length >= 2) break;
  }
  return valid.length > 0 ? valid : ['Diğer'];
}

// ─── Ana iş ──────────────────────────────────────────────────────────────
export default async (req) => {
  const url = new URL(req.url || 'http://localhost');
  const isScheduled = !req.headers || !req.headers.get('x-admin-secret');

  // Manuel tetik için secret check
  if (!isScheduled) {
    const secret = req.headers.get('x-admin-secret') || url.searchParams.get('secret');
    if (!process.env.INGEST_ADMIN_SECRET || secret !== process.env.INGEST_ADMIN_SECRET) {
      return new Response('Forbidden', { status: 403 });
    }
  }

  const dryRun = url.searchParams.get('dryRun') === 'true';
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  const force = url.searchParams.get('force') === 'true';

  console.log(`[kategorize] start | dryRun=${dryRun} | limit=${limit} | force=${force}`);

  // Kategorisi boş olan kayıtları çek (kayene değil)
  let query = db.collection('kayitli_egitimler')
    .where('kayeneFiltrelendi', '==', false)
    .limit(limit);
  if (!force) {
    query = query.where('kategoriKaynagi', '==', 'pending');
  }

  const snap = await query.get();
  if (snap.empty) {
    console.log('[kategorize] kategorize edilecek video yok');
    return new Response(JSON.stringify({ processed: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log(`[kategorize] ${snap.size} video işlenecek`);

  let processed = 0;
  let withTranscript = 0;
  const sample = [];

  for (const doc of snap.docs) {
    const d = doc.data();
    try {
      // 1. Önce başlık + açıklama
      const promptShort = buildPrompt({
        baslik: d.baslik, aciklama: d.aciklama, transcript: null,
      });
      const respShort = await callLLM(promptShort);
      let kategoriler = parseKategoriler(respShort);
      let kaynak = 'ai_baslik';

      // 2. "Diğer" çıktı ve transcript varsa transcript ile yeniden dene
      if (kategoriler.length === 1 && kategoriler[0] === 'Diğer' && d.transcript) {
        const promptFull = buildPrompt({
          baslik: d.baslik, aciklama: d.aciklama, transcript: d.transcript,
        });
        const respFull = await callLLM(promptFull);
        const kategorilerFull = parseKategoriler(respFull);
        if (!(kategorilerFull.length === 1 && kategorilerFull[0] === 'Diğer')) {
          kategoriler = kategorilerFull;
          kaynak = 'ai_transcript';
          withTranscript++;
        }
      }

      if (dryRun) {
        sample.push({ vimeoId: d.vimeoId, baslik: d.baslik, kategoriler, kaynak });
      } else {
        await doc.ref.update({
          kategoriler,
          kategoriKaynagi: kaynak,
          guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      processed++;

      // Gemini rate limit dostu: küçük gecikme
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.warn(`[kategorize] ${d.vimeoId} hata:`, err.message);
    }
  }

  const summary = { dryRun, processed, withTranscript, sample: sample.slice(0, 10) };
  console.log('[kategorize] done:', summary);
  return new Response(JSON.stringify(summary, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
};

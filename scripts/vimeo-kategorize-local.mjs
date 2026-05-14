// scripts/vimeo-kategorize-local.mjs
// ─────────────────────────────────────────────────────────────────────────
// LOCAL kategorize. Firestore `kayitli_egitimler` içinde kategorisi olmayan
// videolar için Gemini'den kategori al, geri yaz.
//
// Çalıştırma:
//   node vimeo-kategorize-local.mjs                 # 50 video
//   node vimeo-kategorize-local.mjs --limit=200     # 200 video
//   node vimeo-kategorize-local.mjs --dry-run       # yazma
//   node vimeo-kategorize-local.mjs --force         # mevcut kategorileri yeniden
//
// .env: FIREBASE_* + GEMINI_API_KEY
// ─────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import admin from 'firebase-admin';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const param = (n, d) => {
  const a = args.find(a => a.startsWith(`--${n}=`));
  return a ? a.split('=')[1] : d;
};
const DRY_RUN = flag('dry-run');
const FORCE = flag('force');
const LIMIT = parseInt(param('limit', '50'), 10);

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

const KATEGORILER = [
  'Liderlik', 'Satış', 'Motivasyon', 'Davet', 'Kapanış',
  'Sunum Teknikleri', 'Zaman Yönetimi', 'Kişisel Gelişim',
  'Sağlık', 'Finansal Özgürlük', 'Vizyon', 'Hikaye', 'Ürün Eğitimi',
  'Liste', 'Kazanç Planı', 'Backoffice', 'Odak', 'İtiraz Karşılama',
  'Takip', 'Doğru Başlangıç', 'Kamp', 'Katlama',
  'Diğer',
];

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY missing');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 128,
          thinkingConfig: { thinkingBudget: 256 },
        },
      }),
    }
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const textPart = parts.find(p => p.text && !p.thought) || parts.find(p => p.text) || {};
  return (textPart.text || '').trim();
}

function buildPrompt({ baslik, aciklama, transcript }) {
  const t = transcript ? `\nTRANSKRIPT (ilk 3500 karakter):\n${transcript.slice(0, 3500)}` : '';
  return `Aşağıdaki Türkçe eğitim videosu için EN UYGUN 1-2 kategori seç.

İZİN VERİLEN KATEGORİLER:
${KATEGORILER.join(', ')}

KURALLAR:
- Maksimum 2 kategori, virgülle ayır.
- Yalnızca yukarıdaki listeden seç.
- Belirlenemezse: "Diğer"
- Sadece kategori adlarını yaz, açıklama EKLEME, JSON KULLANMA.

VİDEO:
Başlık: ${baslik || '-'}
Açıklama: ${(aciklama || '').slice(0, 800)}${t}

CEVAP:`;
}

function parseKategoriler(text) {
  if (!text) return [];
  const first = text.split('\n')[0];
  const parts = first.split(/[,;|/]/)
    .map(s => s.trim().replace(/^["'`*-]+|["'`*-]+$/g, ''))
    .filter(Boolean);
  const valid = [];
  for (const p of parts) {
    const m = KATEGORILER.find(k => k.toLocaleLowerCase('tr-TR') === p.toLocaleLowerCase('tr-TR'));
    if (m && !valid.includes(m)) valid.push(m);
    if (valid.length >= 2) break;
  }
  return valid.length ? valid : ['Diğer'];
}

async function main() {
  console.log(`[kategorize] başladı | DRY=${DRY_RUN} | FORCE=${FORCE} | LIMIT=${LIMIT}`);

  let q = db.collection('kayitli_egitimler')
    .where('kayeneFiltrelendi', '==', false)
    .limit(LIMIT);
  if (!FORCE) q = q.where('kategoriKaynagi', '==', 'pending');

  const snap = await q.get();
  if (snap.empty) {
    console.log('[kategorize] işlenecek video yok 🎉');
    return;
  }
  console.log(`[kategorize] ${snap.size} video işlenecek`);

  let ok = 0;
  let withTranscript = 0;
  let failed = 0;
  let idx = 0;
  const total = snap.size;
  const startTime = Date.now();
  for (const d of snap.docs) {
    idx++;
    const data = d.data();
    try {
      // 1. Başlık + açıklama dene
      let resp = await callGemini(buildPrompt({
        baslik: data.baslik, aciklama: data.aciklama, transcript: null,
      }));
      let kategoriler = parseKategoriler(resp);
      let kaynak = 'ai_baslik';

      // 2. "Diğer" + transcript var → yeniden
      if (kategoriler.length === 1 && kategoriler[0] === 'Diğer' && data.transcript) {
        resp = await callGemini(buildPrompt({
          baslik: data.baslik, aciklama: data.aciklama, transcript: data.transcript,
        }));
        const full = parseKategoriler(resp);
        if (!(full.length === 1 && full[0] === 'Diğer')) {
          kategoriler = full;
          kaynak = 'ai_transcript';
          withTranscript++;
        }
      }

      if (DRY_RUN) {
        console.log(`  ${data.vimeoId} | ${(data.baslik || '').slice(0, 50)} → ${kategoriler.join(', ')} (${kaynak})`);
      } else {
        await d.ref.update({
          kategoriler,
          kategoriKaynagi: kaynak,
          guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      ok++;
      // Her 10 video'da bir ilerleme + ETA
      if (idx % 10 === 0 || idx === total) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = idx / elapsed;
        const eta = rate > 0 ? Math.round((total - idx) / rate) : 0;
        const m = Math.floor(eta / 60), s = eta % 60;
        console.log(`  [${idx}/${total}] ok=${ok} fail=${failed} | hız: ${rate.toFixed(1)} v/s | ETA: ${m}d ${s}s`);
      }
      // Rate limit dostu
      await new Promise(r => setTimeout(r, 400));
    } catch (err) {
      failed++;
      console.warn(`  [${idx}/${total}] ${data.vimeoId} HATA: ${err.message?.slice(0, 100)}`);
    }
  }

  console.log('\n========================================');
  console.log(`✓ kategorize tamamlandı`);
  console.log(`  Başarılı:        ${ok}`);
  console.log(`  Transcript ile:  ${withTranscript}`);
  console.log(`  Hatalı:          ${failed}`);
  console.log('========================================');
}

main().catch(err => {
  console.error('[kategorize] hata:', err);
  process.exit(1);
});

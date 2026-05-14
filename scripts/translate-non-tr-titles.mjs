// scripts/translate-non-tr-titles.mjs
// ─────────────────────────────────────────────────────────────────────────
// TR dışı dildeki video başlıklarını Gemini ile orijinal dile çevirir,
// parantez içinde Türkçe karşılığını ekler.
//
// Format: "Original Title (Türkçe Karşılık)"
// Ürün adları (Amare Sunset, Sunrise, Nitro) ve kişi adları korunur.
// Eski başlık baslikOrijinal alanında saklanır.
//
// Çalıştırma:
//   node translate-non-tr-titles.mjs --dry-run --limit=6
//   node translate-non-tr-titles.mjs --limit=50
//   node translate-non-tr-titles.mjs                 # tümü
// ─────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import admin from 'firebase-admin';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

const DIL_PATTERNS = [
  { kod: 'RU', ad: 'Russian',  regex: /russian|russia|русск|россия|russisch/i },
  { kod: 'EN', ad: 'English',  regex: /\benglish\b|englisch|\(en\)|in english/i },
  { kod: 'DE', ad: 'German',   regex: /\bdeutsch\b|\bgerman\b|deutschland|germany|\(de\)/i },
  { kod: 'NL', ad: 'Dutch',    regex: /nederlands|\bdutch\b|nederland|holland|\(nl\)/i },
];

function detectDil(baslik, aciklama) {
  const text = `${baslik || ''} ${aciklama || ''}`;
  for (const p of DIL_PATTERNS) {
    if (p.regex.test(text)) return p;
  }
  return null;
}

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
          maxOutputTokens: 256,
          thinkingConfig: { thinkingBudget: 256 },
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const textPart = parts.find(p => p.text && !p.thought) || parts.find(p => p.text) || {};
  return (textPart.text || '').trim();
}

function buildPrompt(baslik, dilAdi) {
  return `You are a translator. The following video title is in ${dilAdi} (mixed with some Turkish words). Reformat it cleanly in this exact format:

OUTPUT FORMAT (single line only):
<title fully in ${dilAdi}> (<Turkish translation of the same title>)

RULES:
- Product names like "Amare Sunset", "Amare Sunrise", "Amare Nitro", "HL5", "Fit20", "Origin", "MNTA Biotic", "NRGI" — keep EXACTLY as written
- Person names like "Prof. Dr. Mahmut İlker Yılmaz", "Doç. Dr. Nuri Haksever" — keep EXACTLY as written
- Remove language tags like "(English)", "- German", "/Russian", "-Russian (Russia)" etc. from the output
- Clean punctuation and spacing
- Title should be natural, not literal word-by-word
- Turkish translation goes in parentheses at the end
- Output ONLY the formatted result, NO explanation, NO markdown

ORIGINAL TITLE: "${baslik}"

OUTPUT:`;
}

function temizleSonuc(metin) {
  // Trim, ilk satırı al, markdown vs temizle
  let s = (metin || '').trim();
  s = s.replace(/^["'`]+|["'`]+$/g, '');
  s = s.replace(/^output\s*:?\s*/i, '');
  // İlk satır
  s = s.split('\n')[0].trim();
  return s;
}

async function main() {
  console.log(`[translate] başladı | DRY=${DRY_RUN} | LIMIT=${LIMIT}`);
  const snap = await db.collection('kayitli_egitimler').where('kayeneFiltrelendi', '==', false).get();
  console.log(`[firestore] ${snap.size} aktif doc`);

  const hedefler = [];
  for (const d of snap.docs) {
    const data = d.data();
    if (data.baslikCevrildi) continue; // zaten çevrildi
    const dilObj = detectDil(data.baslik, data.aciklama);
    if (!dilObj) continue;
    hedefler.push({ ref: d.ref, id: d.id, baslik: data.baslik, dil: dilObj });
    if (hedefler.length >= LIMIT) break;
  }
  console.log(`[hedef] ${hedefler.length} non-TR video çevrilecek`);

  let ok = 0, fail = 0;
  for (let i = 0; i < hedefler.length; i++) {
    const h = hedefler[i];
    try {
      const prompt = buildPrompt(h.baslik, h.dil.ad);
      const yanit = await callGemini(prompt);
      const yeniBaslik = temizleSonuc(yanit);

      if (!yeniBaslik || yeniBaslik.length < 5 || !yeniBaslik.includes('(')) {
        console.warn(`  [${i+1}] ⚠ Geçersiz yanıt: "${yeniBaslik.slice(0, 60)}"`);
        fail++;
        continue;
      }

      console.log(`  [${i+1}/${hedefler.length}] ${h.dil.kod} | ${h.id}`);
      console.log(`    eski: ${h.baslik.slice(0, 80)}`);
      console.log(`    yeni: ${yeniBaslik.slice(0, 80)}`);

      if (!DRY_RUN) {
        await h.ref.update({
          baslikOrijinal: h.baslik,
          baslik: yeniBaslik,
          baslikCevrildi: true,
          baslikDili: h.dil.kod,
          guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      ok++;
      await new Promise(r => setTimeout(r, 400)); // rate limit dostu
    } catch (err) {
      console.warn(`  [${i+1}] ✗ HATA ${h.id}: ${err.message?.slice(0, 80)}`);
      fail++;
    }
  }

  console.log('\n========================================');
  console.log(`✓ tamamlandı (DRY=${DRY_RUN})`);
  console.log(`  Başarılı: ${ok}`);
  console.log(`  Hatalı:   ${fail}`);
  console.log('========================================');
}

main().catch(err => { console.error(err); process.exit(1); });

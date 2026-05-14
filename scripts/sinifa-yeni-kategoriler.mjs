// scripts/sinifa-yeni-kategoriler.mjs
// ─────────────────────────────────────────────────────────────────────────
// Mevcut video'ların başlık + transcript'inde belirli anahtar kelimeleri
// arar, eğer geçiyorsa video'nun kategoriler[] array'ine yeni kategoriyi
// EKLER (mevcut kategoriyi SİLMEZ — multi-category mantık).
//
// Eşik:
//   - Başlıkta geçerse → kesinlikle ekle (1 mention yeter)
//   - Transcript'te 5+ mention → ekle
//
// Çalıştırma:
//   node sinifa-yeni-kategoriler.mjs --dry-run
//   node sinifa-yeni-kategoriler.mjs
// ─────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import admin from 'firebase-admin';

const DRY_RUN = process.argv.includes('--dry-run');
const TRANSCRIPT_MIN_MENTION = 5;

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

// Anahtar kelimeler — Türkçe normalize sonrası eşleşmeli (lowercase + ASCII)
// Bu regex'ler normalize edilmiş metinde aranır
const KEYWORD_KATEGORI = {
  'Liste':            /\bliste(yi|yle|de|den|ler|leri|m[a-z]?|mi[a-z]?|miz[a-z]?|niz[a-z]?|s[a-z]?)?\b/g,
  'Kazanç Planı':     /kazan[c]\s+plan|ucret\s+plan|kariyer\s+plan|pazarlama\s+plan/g,
  'Backoffice':       /back\s*office|backofis|geri\s+ofis/g,
  'Odak':             /\bodak(lan[a-z]*|li[a-z]*|im[a-z]*|imiz[a-z]*|ta[a-z]*|tan[a-z]*)?\b|focus/g,
  'İtiraz Karşılama': /\bitiraz(lar[a-z]*|i[a-z]*|in[a-z]*|imiz[a-z]*)?\b|mazeret(ler[a-z]*|i[a-z]*)?|red(d[a-z]*)?\s+cevab/g,
  'Takip':            /\btakip(te|ten|i[a-z]*|im[a-z]*|imi[a-z]*|imiz[a-z]*|niz[a-z]*|ci[a-z]*|cisi[a-z]*)?\b/g,
  'Doğru Başlangıç':  /dogru\s+baslan[gı]ic|dogru\s+baslama|\bdbe\b|d\s*\.\s*b\s*\.\s*e/g,
  'Kamp':             /\bkamp(lar[a-z]*|a[a-z]*|ta[a-z]*|tan[a-z]*|in[a-z]*|im[a-z]*|i[a-z]*|cilar[a-z]*)?\b/g,
  'Katlama':          /\bkatla(ma|n|n[ıi]r|n[ıi]l|m[ıi]y|ma[a-z]*|nan|nd[a-z]*|m[a-z]*)\b/g,
};

const TR_LOWER = { 'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'I': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
function normalize(s) {
  if (!s) return '';
  let out = String(s).normalize('NFC');
  out = out.replace(/[ÇĞİIÖŞÜçğıöşü]/g, c => TR_LOWER[c.toUpperCase()] || c.toLowerCase());
  return out.toLowerCase();
}

function countMatches(text, regex) {
  if (!text) return 0;
  regex.lastIndex = 0;
  let count = 0;
  while (regex.exec(text) !== null) {
    count++;
    if (count > 100) break; // safety
  }
  return count;
}

async function main() {
  console.log(`[siniflama] başladı | DRY=${DRY_RUN} | transcript min: ${TRANSCRIPT_MIN_MENTION}`);

  const snap = await db.collection('kayitli_egitimler').where('kayeneFiltrelendi', '==', false).get();
  console.log(`[firestore] ${snap.size} aktif doc`);

  let batch = db.batch();
  let batchCount = 0;
  const stats = {};
  let toplamGuncel = 0;
  const sample = [];

  for (const d of snap.docs) {
    const data = d.data();
    const baslik = normalize(data.baslik || '');
    const transcript = normalize(data.transcript || '');
    const mevcut = new Set(data.kategoriler || []);
    const eklenenler = [];

    for (const [kategori, regex] of Object.entries(KEYWORD_KATEGORI)) {
      if (mevcut.has(kategori)) continue;
      const baslikMention = countMatches(baslik, regex);
      const transcriptMention = countMatches(transcript, regex);
      const eklenir = baslikMention > 0 || transcriptMention >= TRANSCRIPT_MIN_MENTION;
      if (eklenir) {
        eklenenler.push({ kategori, baslikMention, transcriptMention });
        stats[kategori] = (stats[kategori] || 0) + 1;
      }
    }

    if (eklenenler.length === 0) continue;

    const yeniKategoriler = [...mevcut, ...eklenenler.map(e => e.kategori)];

    if (sample.length < 12) {
      sample.push({
        id: d.id,
        baslik: data.baslik,
        eski: [...mevcut].join(', '),
        eklenenler: eklenenler.map(e => `${e.kategori}(${e.baslikMention > 0 ? 'T' : ''}${e.transcriptMention > 0 ? `${e.transcriptMention}` : ''})`).join(', '),
      });
    }

    if (!DRY_RUN) {
      batch.update(d.ref, {
        kategoriler: yeniKategoriler,
        guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
      });
      batchCount++;
      if (batchCount >= 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
    toplamGuncel++;
  }
  if (!DRY_RUN && batchCount > 0) await batch.commit();

  console.log('\n========================================');
  console.log(`✓ tamamlandı (DRY=${DRY_RUN})`);
  console.log(`  Toplam etkilenen video: ${toplamGuncel}`);
  console.log(`  Kategori bazlı eklemeler:`);
  for (const [k, c] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${c.toString().padStart(4)} → ${k}`);
  }
  console.log('========================================');
  console.log('\n(T = title match, sayı = transcript mention sayısı)');
  console.log('Örnekler:');
  for (const s of sample) {
    console.log(`  ${s.id} | ${(s.baslik || '').slice(0, 55)}`);
    console.log(`    eski: [${s.eski || '(boş)'}]`);
    console.log(`    ekle: ${s.eklenenler}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });

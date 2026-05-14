// scripts/exclude-2019-2020-kyani-batch.mjs
// ─────────────────────────────────────────────────────────────────────────
// 2019-2020 dönemi Kyani içerikleri — başlık pattern'leri ile.
// Tarih kontrolü: < 2021-01-01 olmalı (yanlışlıkla yeni Amare içeriği
// kaldırılmasın diye).
//
// Çalıştırma:
//   node exclude-2019-2020-kyani-batch.mjs --dry-run
//   node exclude-2019-2020-kyani-batch.mjs
// ─────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import admin from 'firebase-admin';

const DRY_RUN = process.argv.includes('--dry-run');
const CUTOFF = '2021-01-01';

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

const TR_LOWER = { 'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'I': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
function normalize(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFC')
    .replace(/[ÇĞİIÖŞÜçğıöşü]/g, c => TR_LOWER[c.toUpperCase()] || c.toLowerCase())
    .toLowerCase();
}

// Kullanıcının kaldırılmasını istediği 7 başlık için pattern'ler
const PATTERNS = [
  { pattern: /\bdevrim[-\s]?\d/,                     name: 'Devrim-XX (2020 serisi)' },
  { pattern: /evden\s+calisma\s+devrimi/,            name: 'Evden Çalışma Devrimi' },
  { pattern: /devrimsel\s+online\s+calisma/,         name: 'Devrimsel Online Çalışma Sistemi' },
  { pattern: /nedenleri\s+ortaya\s+cikarmak/,        name: 'Nedenleri Ortaya Çıkarmak ve Kariyer Planı' },
  { pattern: /90\s+gunluk\s+oyun\s+plani/,           name: '90 Günlük Oyun Planı' },
  { pattern: /urun\s+sorulari/,                       name: 'Ürün Soruları (Ziya)' },
  { pattern: /tuketici\s+agi\s+kurmak/,              name: 'Tüketici Ağı Kurmak (Ziya)' },
];

async function main() {
  console.log(`[exclude-2019-2020] başladı | DRY=${DRY_RUN} | tarih < ${CUTOFF}`);

  const snap = await db.collection('kayitli_egitimler')
    .where('kayeneFiltrelendi', '==', false)
    .get();
  console.log(`[firestore] ${snap.size} aktif doc`);

  const hedefler = [];
  for (const d of snap.docs) {
    const data = d.data();
    if (!data.tarih || data.tarih >= CUTOFF) continue; // sadece 2020 ve öncesi
    const baslik = normalize(data.baslik || '');
    const baslikOrijinal = normalize(data.baslikOrijinal || '');
    const combined = `${baslik} ${baslikOrijinal}`;

    for (const { pattern, name } of PATTERNS) {
      if (pattern.test(combined)) {
        hedefler.push({
          ref: d.ref,
          id: d.id,
          vimeoId: data.vimeoId,
          baslik: data.baslik,
          tarih: data.tarih,
          matchedPattern: name,
        });
        break; // bir pattern eşleşince yeter
      }
    }
  }

  console.log(`\n[hedef] ${hedefler.length} video dışlanacak:`);
  hedefler.forEach((h, i) => {
    console.log(`  ${i + 1}. (${h.vimeoId}) ${h.tarih} — ${h.baslik}`);
    console.log(`     ↳ ${h.matchedPattern}`);
  });

  if (DRY_RUN) {
    console.log('\n[DRY-RUN] hiçbir şey yazılmadı.');
    return;
  }

  if (hedefler.length === 0) {
    console.log('\n(hedef yok)');
    return;
  }

  let batch = db.batch();
  let batchCount = 0;
  for (const h of hedefler) {
    batch.update(h.ref, {
      kayeneFiltrelendi: true,
      filtreliSebep: `2019-2020 Kyani dönemi: ${h.matchedPattern}`,
      guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
    });
    batchCount++;
    if (batchCount >= 400) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }
  if (batchCount > 0) await batch.commit();
  console.log(`\n✓ ${hedefler.length} video dışlandı.`);
}

main().catch(err => { console.error(err); process.exit(1); });

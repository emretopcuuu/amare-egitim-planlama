// scripts/exclude-pre2023-kyani.mjs
// ─────────────────────────────────────────────────────────────────────────
// 2022 ve öncesi yüklenmiş + transcript'te kayani/kıyani 3+ kez geçen
// video'ları otomatik dışla (Kyani dönemi içerik).
//
// Çalıştırma:
//   node exclude-pre2023-kyani.mjs              # uygula
//   node exclude-pre2023-kyani.mjs --dry-run    # raporla
// ─────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import admin from 'firebase-admin';

const DRY_RUN = process.argv.includes('--dry-run');
const CUTOFF = '2023-01-01';
const MIN_MENTIONS = 3;

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

function normalize(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
    .replace(/Ş/gi, 's').replace(/Ç/gi, 'c').replace(/Ğ/gi, 'g')
    .replace(/Ö/gi, 'o').replace(/Ü/gi, 'u')
    .toLowerCase();
}

async function main() {
  console.log(`[exclude-pre2023] başladı | DRY=${DRY_RUN} | tarih < ${CUTOFF} | min mention: ${MIN_MENTIONS}`);

  const snap = await db.collection('kayitli_egitimler').where('kayeneFiltrelendi', '==', false).get();
  console.log(`[firestore] ${snap.size} aktif doc`);

  let batch = db.batch();
  let batchCount = 0;
  let excluded = 0;
  let skipped = 0;

  for (const d of snap.docs) {
    const data = d.data();
    if (!data.transcript || !data.tarih) { skipped++; continue; }
    if (data.tarih >= CUTOFF) { skipped++; continue; }

    const norm = normalize(data.transcript);
    const count = (norm.match(/k[ay]i?yan[iy]?|kyani|kayani|kiyani/g) || []).length;
    if (count < MIN_MENTIONS) { skipped++; continue; }

    if (!DRY_RUN) {
      batch.update(d.ref, {
        kayeneFiltrelendi: true,
        filtreliSebep: 'Kyani (transcript, pre-2023)',
        guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
      });
      batchCount++;
      if (batchCount >= 400) {
        await batch.commit();
        console.log(`[commit] ${excluded + 1}`);
        batch = db.batch();
        batchCount = 0;
      }
    }
    excluded++;
  }

  if (!DRY_RUN && batchCount > 0) await batch.commit();

  console.log('\n========================================');
  console.log(`✓ tamamlandı (DRY=${DRY_RUN})`);
  console.log(`  Dışlanan:  ${excluded}`);
  console.log(`  Atlanan:   ${skipped}`);
  console.log('========================================');
}

main().catch(err => { console.error(err); process.exit(1); });

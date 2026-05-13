// scripts/refilter-excluded.mjs
// ─────────────────────────────────────────────────────────────────────────
// Tüm kayitli_egitimler doc'larına dışlama filtresini yeniden uygula.
// Yeni regex'lerle sızmış olan video'ları yakalar, kayeneFiltrelendi=true yapar.
//
// Çalıştırma:
//   node refilter-excluded.mjs              # full update
//   node refilter-excluded.mjs --dry-run    # rapor
// ─────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import admin from 'firebase-admin';

const DRY_RUN = process.argv.includes('--dry-run');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

// Yeni regex'ler (vimeo-ingest-local.mjs ile aynı)
const EXCLUDE_PATTERNS = [
  { name: 'Kayene',         regex: /kayene/i },
  { name: 'Kyani',          regex: /kyani/i }, // boundary yok — KyaniPro, Kyaniyi vs.
  { name: 'Tolga Camsoy',   regex: /tolga\s+cam[sş]oy/i },
  { name: 'Hakan Dalkılıç', regex: /hakan\s+dalk[ıi]l[ıi][çc]/i },
];

function checkExclude(baslik, aciklama) {
  const text = `${baslik || ''} ${aciklama || ''}`;
  for (const p of EXCLUDE_PATTERNS) {
    if (p.regex.test(text)) return p.name;
  }
  return null;
}

async function main() {
  console.log(`[refilter] başladı | DRY=${DRY_RUN}`);

  const snap = await db.collection('kayitli_egitimler').get();
  console.log(`[firestore] ${snap.size} doc bulundu.`);

  let batch = db.batch();
  let batchCount = 0;
  let newlyExcluded = 0;
  let alreadyExcluded = 0;
  let clean = 0;
  const counts = {};
  const sample = [];

  for (const d of snap.docs) {
    const data = d.data();
    const reason = checkExclude(data.baslik, data.aciklama);

    if (reason) {
      counts[reason] = (counts[reason] || 0) + 1;
      if (data.kayeneFiltrelendi === true) {
        alreadyExcluded++;
      } else {
        // Yeni eşleşme — dışla
        if (sample.length < 10) {
          sample.push({ id: d.id, baslik: data.baslik, reason });
        }
        if (!DRY_RUN) {
          batch.update(d.ref, {
            kayeneFiltrelendi: true,
            filtreliSebep: reason,
            guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
          });
          batchCount++;
          if (batchCount >= 400) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
          }
        }
        newlyExcluded++;
      }
    } else {
      clean++;
    }
  }

  if (!DRY_RUN && batchCount > 0) await batch.commit();

  console.log('\n========================================');
  console.log(`✓ refilter tamamlandı (DRY=${DRY_RUN})`);
  console.log(`  Yeni dışlanan:     ${newlyExcluded}`);
  console.log(`  Zaten dışlanmış:   ${alreadyExcluded}`);
  console.log(`  Temiz:             ${clean}`);
  console.log(`  Dağılım:`);
  for (const [k, v] of Object.entries(counts)) {
    console.log(`    - ${k.padEnd(18)} ${v}`);
  }
  console.log('========================================');
  if (sample.length > 0) {
    console.log('\nYeni dışlanan örnekler:');
    for (const s of sample) {
      console.log(`  [${s.reason}] ${s.baslik}`);
    }
  }
}

main().catch(err => {
  console.error('[refilter] hata:', err);
  process.exit(1);
});

// scripts/exclude-gecis-stratejileri.mjs
// ─────────────────────────────────────────────────────────────────────────
// Başlığında "geçiş stratejileri" / "geçiş stratejisi" geçen video'ları
// dışla. Bu içerikler eski Kyani→Amare geçiş sunumlarıdır.
//
// Çalıştırma:
//   node exclude-gecis-stratejileri.mjs --dry-run    # önce raporla
//   node exclude-gecis-stratejileri.mjs              # uygula
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

const TR_LOWER = { 'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'I': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
function normalize(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFC')
    .replace(/[ÇĞİIÖŞÜçğıöşü]/g, c => TR_LOWER[c.toUpperCase()] || c.toLowerCase())
    .toLowerCase();
}

// "geçiş stratejileri", "geçiş stratejisi", "gecis stratejileri", "gecis stratejisi"
// normalize sonrası "gecis strateji" prefix'ini yakalar
const PATTERN = /gecis\s+strateji/;

async function main() {
  console.log(`[exclude-gecis] başladı | DRY=${DRY_RUN}`);

  const snap = await db.collection('kayitli_egitimler')
    .where('kayeneFiltrelendi', '==', false)
    .get();
  console.log(`[firestore] ${snap.size} aktif doc`);

  const hedefler = [];
  for (const d of snap.docs) {
    const data = d.data();
    const baslik = normalize(data.baslik || '');
    const baslikOrijinal = normalize(data.baslikOrijinal || '');
    if (PATTERN.test(baslik) || PATTERN.test(baslikOrijinal)) {
      hedefler.push({
        ref: d.ref,
        id: d.id,
        vimeoId: data.vimeoId,
        baslik: data.baslik,
        tarih: data.tarih,
      });
    }
  }

  console.log(`\n[hedef] ${hedefler.length} video dışlanacak:`);
  hedefler.forEach((h, i) => {
    console.log(`  ${i + 1}. (${h.vimeoId}) ${h.tarih} — ${h.baslik}`);
  });

  if (DRY_RUN) {
    console.log('\n[DRY-RUN] hiçbir şey yazılmadı.');
    return;
  }

  let batch = db.batch();
  for (const h of hedefler) {
    batch.update(h.ref, {
      kayeneFiltrelendi: true,
      filtreliSebep: 'Geçiş Stratejileri (eski Kyani dönemi geçiş içerikleri)',
      guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  if (hedefler.length > 0) {
    await batch.commit();
    console.log(`\n✓ ${hedefler.length} video dışlandı.`);
  } else {
    console.log('\n(hedef yok)');
  }
}

main().catch(err => { console.error(err); process.exit(1); });

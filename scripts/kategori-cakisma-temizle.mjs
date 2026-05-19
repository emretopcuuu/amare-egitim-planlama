// scripts/kategori-cakisma-temizle.mjs
// ─────────────────────────────────────────────────────────────────────────
// Mantıksız çoklu kategori atamalarını temizle.
// Kural: Belirli ikili kombinasyonlar mantıksız → biri silinir.
//
//   "Kazanç Planı" + "Ürün Eğitimi" → "Ürün Eğitimi" sil
//   "Kazanç Planı" + "Sağlık"       → "Sağlık" sil
//   "Backoffice"   + "Ürün Eğitimi" → "Ürün Eğitimi" sil
//   "Sağlık"       + "Davet"        → "Davet" sil
//   "Sağlık"       + "Kapanış"      → "Kapanış" sil
//   "Sağlık"       + "Liderlik"     → "Liderlik" sil
//
// Çalıştırma:
//   node kategori-cakisma-temizle.mjs           # dry-run
//   node kategori-cakisma-temizle.mjs --apply   # uygula
// ─────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import admin from 'firebase-admin';

const APPLY = process.argv.includes('--apply');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

// Kural: [hangi kategori varsa, hangi kategori silinmeli]
const TEMIZLEME_KURALLARI = [
  { eger: 'Kazanç Planı', sil: 'Ürün Eğitimi' },
  { eger: 'Kazanç Planı', sil: 'Sağlık' },
  { eger: 'Backoffice', sil: 'Ürün Eğitimi' },
  { eger: 'Sağlık', sil: 'Davet' },
  { eger: 'Sağlık', sil: 'Kapanış' },
  { eger: 'Sağlık', sil: 'Liderlik' },
];

async function main() {
  console.log(`[temizle] başlıyor | APPLY=${APPLY}\n`);

  const snap = await db.collection('kayitli_egitimler')
    .where('kayeneFiltrelendi', '==', false)
    .get();

  console.log(`${snap.size} video taranıyor...\n`);

  const duzeltmeler = [];

  for (const doc of snap.docs) {
    const d = doc.data();
    const kats = (d.kategoriler || []).slice();
    if (kats.length < 2) continue;

    let yeniKats = kats.slice();
    let degisti = false;
    const silinenler = [];

    for (const { eger, sil } of TEMIZLEME_KURALLARI) {
      if (yeniKats.includes(eger) && yeniKats.includes(sil)) {
        yeniKats = yeniKats.filter(k => k !== sil);
        silinenler.push(`${sil} (çakışan: ${eger})`);
        degisti = true;
      }
    }

    if (degisti && yeniKats.length > 0) {
      duzeltmeler.push({
        doc,
        d,
        oncekiKats: kats,
        yeniKats,
        silinenler,
      });
    }
  }

  console.log(`📊 ${duzeltmeler.length} video düzeltme gerektiriyor:\n`);

  duzeltmeler.forEach(({ d, oncekiKats, yeniKats, silinenler }, i) => {
    console.log(`${i + 1}. ${d.baslik}`);
    console.log(`   vimeoId: ${d.vimeoId}`);
    console.log(`   Önceki: [${oncekiKats.join(', ')}]`);
    console.log(`   Yeni:   [${yeniKats.join(', ')}]`);
    console.log(`   Silinen: ${silinenler.join(', ')}\n`);
  });

  if (!APPLY) {
    console.log('\n⚠️  DRY-RUN. Uygulamak için: --apply');
    return;
  }

  console.log('\n🔧 Güncellemeler...');
  let ok = 0;
  for (const { doc, d, yeniKats } of duzeltmeler) {
    try {
      await doc.ref.update({
        kategoriler: yeniKats,
        kategoriKaynagi: 'manuel_cakisma_temizleme',
        kategoriTemizlemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
        guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
      });
      ok++;
      console.log(`   ✓ ${d.baslik.slice(0, 60)}`);
    } catch (e) {
      console.warn(`   ✗ ${d.vimeoId}: ${e.message}`);
    }
  }
  console.log(`\n✅ ${ok}/${duzeltmeler.length} güncellendi.`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});

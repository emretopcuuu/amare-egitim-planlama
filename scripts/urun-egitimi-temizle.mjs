// scripts/urun-egitimi-temizle.mjs
// ─────────────────────────────────────────────────────────────────────────
// "Ürün Eğitimi" kategorisinde olan ama aslında orada olmaması gereken
// videoları yakala — başlık pattern'ine göre kural tabanlı.
//
//   "Hukuki" / "Yasal" / "Av." / "Avukat" → "Diğer"
//   "Akademi Tanıtım" / "Akademi Tanitim" → "Amare İş Sunumu"
//   "Backoffice" başlıkta varsa → "Backoffice" (eski temizlikten kaçmış olabilir)
//
// Çalıştırma:
//   node urun-egitimi-temizle.mjs           # dry-run
//   node urun-egitimi-temizle.mjs --apply   # uygula
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

// Başlık pattern → doğru kategoriler eşlemesi
const KURALLAR = [
  {
    pattern: /(hukuk[ıi]|yasal|av\.[\s_]|avukat)/i,
    yeniKategoriler: ['Diğer'],
    aciklama: 'Hukuki içerik',
  },
  {
    pattern: /akademi[\s_]*tanı?t[ıi]m/i,
    yeniKategoriler: ['Amare İş Sunumu'],
    aciklama: 'Akademi tanıtımı',
  },
  {
    pattern: /backoffice/i,
    yeniKategoriler: ['Backoffice'],
    aciklama: 'Backoffice',
  },
];

async function main() {
  console.log(`[urun-temizle] başlıyor | APPLY=${APPLY}\n`);

  // Ürün Eğitimi kategorisinde olan videolar
  const snap = await db.collection('kayitli_egitimler')
    .where('kayeneFiltrelendi', '==', false)
    .where('kategoriler', 'array-contains', 'Ürün Eğitimi')
    .get();

  console.log(`Ürün Eğitimi kategorisinde ${snap.size} video taranıyor...\n`);

  const duzeltmeler = [];

  for (const doc of snap.docs) {
    const d = doc.data();
    const baslik = d.baslik || '';

    for (const { pattern, yeniKategoriler, aciklama } of KURALLAR) {
      if (pattern.test(baslik)) {
        duzeltmeler.push({
          doc,
          d,
          oncekiKats: d.kategoriler || [],
          yeniKats: yeniKategoriler,
          aciklama,
        });
        break; // ilk eşleşen kural yeterli
      }
    }
  }

  console.log(`📊 ${duzeltmeler.length} video düzeltme gerektiriyor:\n`);

  duzeltmeler.forEach(({ d, oncekiKats, yeniKats, aciklama }, i) => {
    console.log(`${i + 1}. ${d.baslik}`);
    console.log(`   vimeoId: ${d.vimeoId}`);
    console.log(`   Önceki: [${oncekiKats.join(', ')}]`);
    console.log(`   Yeni:   [${yeniKats.join(', ')}]`);
    console.log(`   Sebep:  ${aciklama}\n`);
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
        kategoriKaynagi: 'manuel_pattern_duzeltme',
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

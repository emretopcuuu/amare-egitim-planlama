// scripts/kazanc-plani-duzelt.mjs
// ─────────────────────────────────────────────────────────────────────────
// Tek seferlik düzeltme:
//   Başlığında "Kazanç Planı" geçen ama kategorisi yanlış ayarlanmış
//   (Ürün Eğitimi, Finansal Özgürlük vs) videoları topla, Kazanç Planı'na ata.
//
// Çalıştırma:
//   node scripts/kazanc-plani-duzelt.mjs               # dry-run (yazma)
//   node scripts/kazanc-plani-duzelt.mjs --apply       # gerçekten güncelle
//
// FERDİ KIMIŞ feedback'i sonrası: Kayıtlı Eğitimler > Ürün Eğitimi filtresinde
// 4 video çıkıyor ama 3'ü aslında Kazanç Planı.
// ─────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import admin from 'firebase-admin';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

// "Kazanç Planı" anahtar kelimeleri — başlık/açıklamada arayacağız
const KAZANC_PLANI_KELIMELERI = [
  /kazan[çc][\s\-_]*plan[ıi]/i,
  /compensation[\s\-_]*plan/i,
  /komisyon[\s\-_]*plan/i,
];

function isKazancPlani(baslik, aciklama) {
  const text = `${baslik || ''} ${aciklama || ''}`;
  return KAZANC_PLANI_KELIMELERI.some(re => re.test(text));
}

async function main() {
  console.log(`[kazanc-duzelt] başlıyor | APPLY=${APPLY}\n`);

  // Tüm kayıtlı eğitimleri tara (kayene değil)
  const snap = await db.collection('kayitli_egitimler')
    .where('kayeneFiltrelendi', '==', false)
    .get();

  console.log(`[kazanc-duzelt] ${snap.size} video taranıyor...\n`);

  const dogru = [];      // zaten doğru kategoride
  const yanlis = [];     // Kazanç Planı içerikli ama kategori yanlış
  const ilgisiz = [];    // Kazanç Planı değil

  for (const doc of snap.docs) {
    const d = doc.data();
    if (!isKazancPlani(d.baslik, d.aciklama)) {
      ilgisiz.push(d);
      continue;
    }
    // Bu bir Kazanç Planı videosu
    const kats = d.kategoriler || [];
    // Eşit problemli ikinci kategoriler — Kazanç Planı içerikli videolarda olmamalı
    const yanlisIkinciler = ['Ürün Eğitimi', 'Sağlık'];
    const yanlisKategori = kats.find(k => yanlisIkinciler.includes(k));

    if (kats.length === 1 && kats[0] === 'Kazanç Planı') {
      dogru.push(d);
    } else if (yanlisKategori) {
      // Hem Kazanç Planı hem yanlış kategori (örn Ürün Eğitimi) var
      yanlis.push({ doc, d, oncekiKategoriler: kats, sorun: `${yanlisKategori} silinecek` });
    } else if (!kats.includes('Kazanç Planı')) {
      // Sadece yanlış kategoride
      yanlis.push({ doc, d, oncekiKategoriler: kats, sorun: 'Kazanç Planı eklenecek' });
    } else {
      // Kazanç Planı + Liderlik gibi makul ikinci kategori → bırak
      dogru.push(d);
    }
  }

  console.log(`📊 SONUÇ:`);
  console.log(`   Toplam taranan: ${snap.size}`);
  console.log(`   Kazanç Planı içerikli: ${dogru.length + yanlis.length}`);
  console.log(`   ✓ Doğru kategoride: ${dogru.length}`);
  console.log(`   ✗ YANLIŞ kategoride: ${yanlis.length}\n`);

  if (yanlis.length === 0) {
    console.log('✅ Düzeltilecek video yok 🎉');
    return;
  }

  console.log('YANLIŞ KATEGORİZE EDİLMİŞ VİDEOLAR:\n');
  yanlis.forEach(({ d, oncekiKategoriler, sorun }, i) => {
    console.log(`${i + 1}. ${d.baslik}`);
    console.log(`   vimeoId: ${d.vimeoId}`);
    console.log(`   Önceki: [${oncekiKategoriler.join(', ') || 'boş'}]`);
    console.log(`   Sorun:  ${sorun}`);
    console.log(`   Yeni:   [Kazanç Planı]\n`);
  });

  if (!APPLY) {
    console.log('\n⚠️  DRY-RUN — değişiklik yapılmadı. Uygulamak için: --apply');
    return;
  }

  console.log('\n🔧 Güncellemeler yapılıyor...');
  let basarili = 0;
  for (const { doc, d } of yanlis) {
    try {
      await doc.ref.update({
        kategoriler: ['Kazanç Planı'],
        kategoriKaynagi: 'manuel_duzeltme',
        kategoriDuzeltmeTarihi: admin.firestore.FieldValue.serverTimestamp(),
        kategoriDuzeltmeNeden: 'kazanc_plani_yanlis_atama',
        guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
      });
      basarili++;
      console.log(`   ✓ ${d.baslik.slice(0, 60)}`);
    } catch (e) {
      console.warn(`   ✗ ${d.vimeoId}: ${e.message}`);
    }
  }
  console.log(`\n✅ ${basarili}/${yanlis.length} video güncellendi.`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});

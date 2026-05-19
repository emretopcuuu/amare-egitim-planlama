// scripts/kategori-tutarsizlik-tara.mjs
// ─────────────────────────────────────────────────────────────────────────
// Tüm kayıtlı eğitimlerde kategori tutarsızlığını tara.
// Hangi kategori kombinasyonları ne kadar var? — frekans raporu.
// Mantıksız kombinasyonları flag'le.
// ─────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

// Birbiriyle mantıksız çiftler — biri varsa diğeri olmamalı
const MANTIKSIZ_CIFTLER = [
  ['Kazanç Planı', 'Ürün Eğitimi'],
  ['Kazanç Planı', 'Sağlık'],
  ['Ürün Eğitimi', 'Davet'],
  ['Ürün Eğitimi', 'Liderlik'],
  ['Sağlık', 'Davet'],
  ['Sağlık', 'Kapanış'],
  ['Sağlık', 'Liderlik'],
  ['Backoffice', 'Sağlık'],
  ['Backoffice', 'Liderlik'],
];

async function main() {
  console.log('[tutarsizlik-tara] başlıyor...\n');

  const snap = await db.collection('kayitli_egitimler')
    .where('kayeneFiltrelendi', '==', false)
    .get();

  console.log(`${snap.size} video taranıyor...\n`);

  // Kategori frekansı
  const tek = new Map();      // tek kategorili videolar
  const kombo = new Map();    // ikili kombinasyonlar
  const sorunlular = [];

  for (const doc of snap.docs) {
    const d = doc.data();
    const kats = (d.kategoriler || []).slice().sort();

    if (kats.length === 0) continue;

    if (kats.length === 1) {
      tek.set(kats[0], (tek.get(kats[0]) || 0) + 1);
    } else {
      const key = kats.join(' + ');
      kombo.set(key, (kombo.get(key) || 0) + 1);

      // Mantıksız çift kontrolü
      for (const [a, b] of MANTIKSIZ_CIFTLER) {
        if (kats.includes(a) && kats.includes(b)) {
          sorunlular.push({
            vimeoId: d.vimeoId,
            baslik: d.baslik,
            kategoriler: kats,
            sorun: `${a} + ${b} mantıksız`,
          });
        }
      }
    }
  }

  console.log('═══ TEK KATEGORİLİ ═══');
  [...tek.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) => {
    console.log(`  ${n.toString().padStart(4)}  ${k}`);
  });

  console.log('\n═══ İKİLİ KOMBİNASYONLAR (top 20) ═══');
  [...kombo.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([k, n]) => {
    console.log(`  ${n.toString().padStart(4)}  ${k}`);
  });

  console.log(`\n═══ MANTIKSIZ KOMBİNASYONLAR (${sorunlular.length} video) ═══`);
  sorunlular.slice(0, 20).forEach((s, i) => {
    console.log(`${i + 1}. [${s.kategoriler.join(', ')}]`);
    console.log(`   ${s.baslik} (${s.vimeoId})`);
    console.log(`   → ${s.sorun}\n`);
  });
  if (sorunlular.length > 20) {
    console.log(`... ve ${sorunlular.length - 20} daha`);
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});

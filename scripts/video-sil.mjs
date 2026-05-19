// scripts/video-sil.mjs
// ─────────────────────────────────────────────────────────────────────────
// Belirli bir vimeoId'ye sahip videoyu Firestore'dan tamamen sil.
//
// Çalıştırma:
//   node video-sil.mjs <vimeoId>            # dry-run (önizleme)
//   node video-sil.mjs <vimeoId> --apply    # gerçekten sil
// ─────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import admin from 'firebase-admin';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const vimeoId = args.find(a => /^\d+$/.test(a));

if (!vimeoId) {
  console.error('Kullanım: node video-sil.mjs <vimeoId> [--apply]');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

async function main() {
  const ref = db.collection('kayitli_egitimler').doc(vimeoId);
  const snap = await ref.get();
  if (!snap.exists) {
    console.error(`✗ vimeoId=${vimeoId} bulunamadı`);
    process.exit(1);
  }
  const d = snap.data();
  console.log(`\n📹 Hedef video:`);
  console.log(`   vimeoId: ${vimeoId}`);
  console.log(`   Başlık:  ${d.baslik}`);
  console.log(`   Tarih:   ${d.tarih || '-'}`);
  console.log(`   Kategori: [${(d.kategoriler || []).join(', ')}]`);
  console.log(`   Eğitmenler: [${(d.egitmenler || []).join(', ')}]`);

  if (!APPLY) {
    console.log('\n⚠️  DRY-RUN. Silmek için: --apply');
    return;
  }

  // 1. Kara listeye ekle — vimeo-ingest tekrar eklemesin
  await db.collection('silinen_egitimler').doc(vimeoId).set({
    vimeoId,
    baslik: d.baslik || '',
    silmeTarihi: admin.firestore.FieldValue.serverTimestamp(),
    silenAdmin: 'cli', // CLI'den silindi
    silinenKategoriler: d.kategoriler || [],
    silinenEgitmenler: d.egitmenler || [],
  });
  console.log(`📋 Kara listeye eklendi: silinen_egitimler/${vimeoId}`);

  // 2. Asıl kayıt sil
  await ref.delete();
  console.log(`✅ Silindi: ${d.baslik}`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});

// Tüm konuşmacı fotoları için cacheControl'u immutable'dan kurtar
// + metageneration arttır → browser revalidate eder
import 'dotenv/config';
import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
  storageBucket: 'amare-egitim-planlama.firebasestorage.app',
});

const bucket = admin.storage().bucket();
const [files] = await bucket.getFiles({ prefix: 'konusmaci-fotolari/' });
console.log(`${files.length} foto bulundu, metadata güncelleniyor...`);

let basarili = 0, hata = 0;
for (const f of files) {
  try {
    await f.setMetadata({
      cacheControl: 'public, max-age=3600', // 1 saatlik — eski immutable yerine
      contentDisposition: 'inline',
    });
    basarili++;
    if (basarili % 20 === 0) console.log(`  ${basarili}/${files.length}...`);
  } catch (e) {
    hata++;
    console.log(`✗ ${f.name}: ${e.message}`);
  }
}

console.log(`\n✓ ${basarili} foto güncellendi, ${hata} hata`);
console.log('Browser cache otomatik invalidate olur (ETag değişti).');
process.exit(0);

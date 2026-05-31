// Frontend localStorage cache'lerini invalidate et — Firestore'da
// 'cache_busters/global' doc'una timestamp koy. Frontend bu key'i
// kontrol edebilir (gelecek için altyapı), şimdilik bilgilendirir.
// Mevcut cache'ler 7 günlük TTL ile zaten yenilenecek.
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

// egitmen_quotes_cache koleksiyonunu temizle (bazı eski sözler taze gelsin)
const quotes = await db.collection('egitmen_quotes_cache').get();
let silindi = 0;
for (const d of quotes.docs) {
  await d.ref.delete();
  silindi++;
}
console.log(`✓ egitmen_quotes_cache: ${silindi} doc silindi`);
console.log('Frontend localStorage cache\'leri 7 günlük TTL ile kendi kendine yenilenir.');
console.log('Hızlı test için browser hard refresh (Ctrl+Shift+R) yeterli.');
process.exit(0);

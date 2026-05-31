// AI öneri cache'lerini temizle — yeni prompt'la üretilsin
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

const usersSnap = await db.collection('users').get();
let silindi = 0, kontrol = 0;
for (const u of usersSnap.docs) {
  kontrol++;
  const ref = db.doc(`users/${u.id}/ai_cache/oneri`);
  const s = await ref.get();
  if (s.exists) {
    await ref.delete();
    silindi++;
  }
}
console.log(`✓ ${kontrol} kullanıcı tarandı, ${silindi} cache silindi`);
process.exit(0);

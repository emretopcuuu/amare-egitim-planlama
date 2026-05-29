// Belirli video transcript'inde anahtar kelime ara
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

const coreId = 'tunc_tuncer';
const arananBaslik = 'Produkt';

const snap = await db.collection('kayitli_egitimler')
  .where('egitmenler', 'array-contains', coreId)
  .get();

for (const doc of snap.docs) {
  if (!doc.data().baslik?.includes(arananBaslik)) continue;
  const chunks = doc.data().transcriptChunks || [];
  console.log(`📹 ${doc.data().baslik} (${doc.id})\n`);
  // 169s civarındaki chunk'ları göster
  chunks.forEach(c => {
    const t = c.start || 0;
    if (t >= 150 && t <= 200) {
      console.log(`  [${Math.floor(t)}s] ${c.text}`);
    }
  });
  break;
}
process.exit(0);

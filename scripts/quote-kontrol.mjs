// Hızlı quote kalite kontrolü
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

const coreId = process.argv[2] || 'tunc_tuncer';
const snap = await db.collection('kayitli_egitimler')
  .where('egitmenler', 'array-contains', coreId)
  .where('kayeneFiltrelendi', '==', false)
  .get();

for (const doc of snap.docs) {
  const aiSnap = await db.doc(`kayitli_egitimler/${doc.id}/ai_analiz/main`).get();
  if (!aiSnap.exists) continue;
  const ai = aiSnap.data();
  console.log(`\n📹 ${doc.data().baslik?.slice(0, 70)}`);
  console.log(`   v${ai.promptVersion} | ${ai.ahaMoments?.length || 0} aha`);
  (ai.ahaMoments || []).forEach((a, i) => {
    console.log(`   ${i + 1}. [${Math.floor(a.start || 0)}s] "${a.text}"`);
    if (a.etki) console.log(`      → ${a.etki}`);
  });
}
process.exit(0);

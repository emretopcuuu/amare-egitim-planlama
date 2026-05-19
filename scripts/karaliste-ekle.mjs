// scripts/karaliste-ekle.mjs
// ─────────────────────────────────────────────────────────────────────────
// Önceden silinmiş videoları retroaktif olarak kara listeye ekle.
// İlk video-sil.mjs çağrılarından önce silinenler için.
//
//   node karaliste-ekle.mjs <vimeoId> "<başlık>"
// ─────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import admin from 'firebase-admin';

const args = process.argv.slice(2);
const vimeoId = args[0];
const baslik = args.slice(1).join(' ');

if (!vimeoId) {
  console.error('Kullanım: node karaliste-ekle.mjs <vimeoId> "<başlık>"');
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
  await db.collection('silinen_egitimler').doc(vimeoId).set({
    vimeoId,
    baslik: baslik || '(retroaktif)',
    silmeTarihi: admin.firestore.FieldValue.serverTimestamp(),
    silenAdmin: 'cli-retroaktif',
  });
  console.log(`✅ Kara listeye eklendi: ${vimeoId} — ${baslik}`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });

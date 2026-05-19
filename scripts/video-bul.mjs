// scripts/video-bul.mjs
// Başlığa göre Firestore'da video ara
//   node video-bul.mjs "uttwiler"
import 'dotenv/config';
import admin from 'firebase-admin';

const q = process.argv[2];
if (!q) { console.error('Kullanım: node video-bul.mjs "<arama>"'); process.exit(1); }

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();

const snap = await db.collection('kayitli_egitimler').get();
const re = new RegExp(q, 'i');
const hits = [];
snap.forEach(d => {
  const data = d.data();
  if (re.test(data.baslik || '') || re.test(data.aciklama || '')) {
    hits.push({ id: d.id, baslik: data.baslik, tarih: data.tarih, kategoriler: data.kategoriler });
  }
});
console.log(`${hits.length} sonuç:\n`);
hits.forEach((h, i) => {
  console.log(`${i+1}. ${h.baslik}`);
  console.log(`   vimeoId: ${h.id}`);
  console.log(`   tarih:   ${h.tarih}`);
  console.log(`   kats:    [${(h.kategoriler||[]).join(', ')}]\n`);
});
process.exit(0);

// KVKK: konusmacilar public doc'undaki email'i admin-only konusmaci_iletisim'e TAŞI + public doc'tan SİL.
// Veri kaybı yok — email admin-only koleksiyonda saklanır (geri alınabilir).
// Varsayılan DRY-RUN. Canlı için:  node konusmaci-email-gizle.mjs --apply
import 'dotenv/config';
import admin from 'firebase-admin';

const APPLY = process.argv.includes('--apply');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});
const db = admin.firestore();
const mask = (e) => { const [u, d] = String(e).split('@'); return `${u.slice(0,2)}***@${d || ''}`; };

const snap = await db.collection('konusmacilar').get();
const hedefler = [];
snap.forEach(d => {
  const email = d.data().email;
  if (typeof email === 'string' && email.trim()) hedefler.push({ id: d.id, ad: d.data().ad || '', email: email.trim() });
});

console.log(`${APPLY ? '>>> CANLI UYGULAMA' : '--- DRY-RUN (yazma yok)'} | ${hedefler.length} doc'ta email taşınacak\n`);
hedefler.forEach(h => console.log(`  ${h.id} | ${h.ad} | ${mask(h.email)}`));

if (!APPLY) { console.log('\nDRY-RUN bitti. Canlıya almak için: node konusmaci-email-gizle.mjs --apply'); process.exit(0); }

let tasinan = 0;
for (let i = 0; i < hedefler.length; i += 200) {
  const batch = db.batch();
  for (const h of hedefler.slice(i, i + 200)) {
    // 1) email'i admin-only koleksiyona taşı (idempotent: merge)
    batch.set(db.collection('konusmaci_iletisim').doc(h.id),
      { email: h.email, ad: h.ad, kaynakDocId: h.id, tasindi: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true });
    // 2) public doc'tan email alanını sil
    batch.update(db.collection('konusmacilar').doc(h.id),
      { email: admin.firestore.FieldValue.delete() });
    tasinan++;
  }
  await batch.commit();
  console.log(`  batch commit: ${Math.min(i + 200, hedefler.length)}/${hedefler.length}`);
}
console.log(`\n>>> TAMAM: ${tasinan} email taşındı + public doc'lardan silindi.`);
console.log('Doğrulama için: node _konusmaci-pii-tara.mjs → email DOLU olan: 0 çıkmalı.');
process.exit(0);

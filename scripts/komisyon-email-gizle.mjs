// KVKK: komisyonlar public doc'undaki adminEmails + uyeler[].email/telefon'u
// admin-only komisyon_iletisim'e TAŞI + public doc'tan SİL. Veri kaybı yok (arşivlenir).
// Varsayılan DRY-RUN.  Canlı için:  node komisyon-email-gizle.mjs --apply
import 'dotenv/config';
import admin from 'firebase-admin';

const APPLY = process.argv.includes('--apply');
admin.initializeApp({ credential: admin.credential.cert({
  projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
})});
const db = admin.firestore();

const snap = await db.collection('komisyonlar').get();
const isler = [];
snap.forEach(d => {
  const x = d.data();
  const adminEmails = Array.isArray(x.adminEmails) ? x.adminEmails : [];
  const uyeler = Array.isArray(x.uyeler) ? x.uyeler : [];
  const uyeIletisim = uyeler
    .map((u, idx) => ({ idx, ad: u?.ad || '', email: u?.email || '', telefon: u?.telefon || '' }))
    .filter(u => u.email || u.telefon);
  const temizUyeler = uyeler.map(({ email, telefon, ...rest }) => rest); // email+telefon çıkar
  const dokunulacak = adminEmails.length > 0 || uyeIletisim.length > 0;
  if (dokunulacak) isler.push({ id: d.id, adminEmails, uyeIletisim, temizUyeler });
});

console.log(`${APPLY ? '>>> CANLI UYGULAMA' : '--- DRY-RUN (yazma yok)'} | ${isler.length}/${snap.size} komisyon dokunulacak\n`);
isler.forEach(j => console.log(`  ${j.id.padEnd(20)} | adminEmails:${j.adminEmails.length} taşınır sil | uye iletişim:${j.uyeIletisim.length} taşınır sil`));

if (!APPLY) { console.log('\nDRY-RUN bitti. Canlı: node komisyon-email-gizle.mjs --apply'); process.exit(0); }

for (const j of isler) {
  const batch = db.batch();
  batch.set(db.collection('komisyon_iletisim').doc(j.id),
    { adminEmails: j.adminEmails, uyeIletisim: j.uyeIletisim, kaynakDocId: j.id,
      tasindi: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  batch.update(db.collection('komisyonlar').doc(j.id),
    { adminEmails: admin.firestore.FieldValue.delete(), uyeler: j.temizUyeler });
  await batch.commit();
  console.log(`  ✓ ${j.id}`);
}
console.log(`\n>>> TAMAM: ${isler.length} komisyon işlendi. Doğrulama: public REST'te "email"/"adminEmails" = 0 olmalı.`);
process.exit(0);

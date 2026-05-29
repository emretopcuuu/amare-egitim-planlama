// Tek quote'u el ile düzelt
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

const vimeoId = '839715235';
const ref = db.doc(`kayitli_egitimler/${vimeoId}/ai_analiz/main`);
const snap = await ref.get();
if (!snap.exists) { console.error('Yok'); process.exit(1); }

const data = snap.data();
const ahaList = [...(data.ahaMoments || [])];

// 1. quote'u düzelt: "8 insandan 10'u" -> "10 insandan 8'i"
const yeni = [];
for (const a of ahaList) {
  if (a.text && a.text.includes("8 insandan 10'u")) {
    yeni.push({
      ...a,
      text: "10 insandan 8'i yaştan değil, hastalıktan ölüyor. Doğal yaşamımızdan uzaklaştığımız için bazı sorunlar yaşıyoruz.",
      etki: a.etki,
    });
    console.log('✓ Düzeltildi: 8 insandan 10\'u -> 10 insandan 8\'i');
  } else if (a.text && (a.text.includes('Kyäni') || a.text.includes('HL5'))) {
    // Marka adı içerenleri çıkar
    console.log(`✗ Çıkarıldı (marka): "${a.text.slice(0, 50)}..."`);
    continue;
  } else {
    yeni.push(a);
  }
}

await ref.update({ ahaMoments: yeni });
console.log(`\n✓ ${vimeoId}: ${ahaList.length} → ${yeni.length} aha`);

// Diğer Tunç Tuncer videolarındaki marka leak'lerini de temizle
const baskaVideolar = ['839715235']; // başka ID'ler eklenebilir
// HL5 quote'ları içeren videoları da check edelim
const tuncSnap = await db.collection('kayitli_egitimler')
  .where('egitmenler', 'array-contains', 'tunc_tuncer')
  .where('kayeneFiltrelendi', '==', false)
  .get();

for (const doc of tuncSnap.docs) {
  if (doc.id === vimeoId) continue;
  const aiRef = db.doc(`kayitli_egitimler/${doc.id}/ai_analiz/main`);
  const aiSnap = await aiRef.get();
  if (!aiSnap.exists) continue;
  const ai = aiSnap.data();
  const ahaY = (ai.ahaMoments || []).filter(a => {
    if (a.text && /(HL5|Kyäni|Kyani|Amare|OneTeam|On Shot)/i.test(a.text)) {
      console.log(`✗ ${doc.id}: "${a.text.slice(0, 50)}..." (marka)`);
      return false;
    }
    return true;
  });
  if (ahaY.length !== (ai.ahaMoments || []).length) {
    await aiRef.update({ ahaMoments: ahaY });
    console.log(`  ${doc.id}: ${ai.ahaMoments.length} → ${ahaY.length}`);
  }
}

// Cache temizle
const cacheSnap = await db.collection('egitmen_quotes_cache').get();
let silindi = 0;
for (const c of cacheSnap.docs) {
  if (c.id === 'tunc_tuncer' || c.id.startsWith('tunc_tuncer__')) {
    await c.ref.delete();
    silindi++;
  }
}
console.log(`\n🧹 ${silindi} cache silindi`);
process.exit(0);

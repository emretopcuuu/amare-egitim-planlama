// fetch-davet-transkriptler.mjs
// Firestore'dan "davet" konulu video transkriptlerini çek
// kayitli_egitimler koleksiyonu → baslik veya transcript "davet" geçenler
// Çıktı: ../transkriptler/davet-stratejileri/[vimeoId]_[slug].txt

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'transkriptler', 'davet-stratejileri');

const firebaseConfig = {
  apiKey: 'AIzaSyBEtQlumVPsS8paJ4rUnsSid_P6WW-1qUY',
  authDomain: 'amare-egitim-planlama.firebaseapp.com',
  projectId: 'amare-egitim-planlama',
  storageBucket: 'amare-egitim-planlama.firebasestorage.app',
  messagingSenderId: '473830927218',
  appId: '1:473830927218:web:6e75bd232bf0be28994beb',
};

const TR_LOWER = { 'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'I': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
function normalize(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFC')
    .replace(/[ÇĞİIÖŞÜçğıöşü]/g, c => TR_LOWER[c.toUpperCase()] || c.toLowerCase())
    .toLowerCase();
}

function slugify(s) {
  return normalize(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
}

const KEYWORDS = ['davet', 'davetiye', 'invite', 'invitation'];

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('Firestore baglantisi kuruluyor...');
const snap = await getDocs(
  query(collection(db, 'kayitli_egitimler'), where('transcriptVar', '==', true))
);
console.log(`Toplam transkriptli video: ${snap.size}`);

const matches = [];
for (const doc of snap.docs) {
  const d = doc.data();
  const baslik = d.baslik || '';
  const transcript = d.transcript || '';
  const haystack = normalize(baslik + ' ' + transcript);
  const matchedKeyword = KEYWORDS.find(k => haystack.includes(k));
  if (matchedKeyword) {
    const baslikteVar = KEYWORDS.some(k => normalize(baslik).includes(k));
    matches.push({
      id: doc.id,
      baslik,
      sure: d.sure || 0,
      transcript,
      matchedKeyword,
      baslikteMatch: baslikteVar,
    });
  }
}

console.log(`\n"davet" geçen video sayisi: ${matches.length}`);
console.log(`  - Baslikta da gecen: ${matches.filter(m => m.baslikteMatch).length}`);
console.log(`  - Sadece transkriptte: ${matches.filter(m => !m.baslikteMatch).length}`);

mkdirSync(OUT_DIR, { recursive: true });

// Önce başlıkta geçenleri yaz (en odaklı kaynaklar)
const baslikteVar = matches.filter(m => m.baslikteMatch).sort((a, b) => b.sure - a.sure);
const sadeceTranskript = matches.filter(m => !m.baslikteMatch);

console.log('\n=== BASLIKTA "DAVET" GECEN VIDEOLAR ===');
for (const m of baslikteVar) {
  const dakika = Math.round(m.sure / 60);
  console.log(`  [${m.id}] ${dakika}dk — ${m.baslik}`);
  const fname = `${m.id}_${slugify(m.baslik)}.txt`;
  const content = `# ${m.baslik}\n# Vimeo ID: ${m.id}\n# Sure: ${m.sure}sn (${dakika} dk)\n# Eslesen: ${m.matchedKeyword} (basliklta + metin)\n\n${m.transcript}`;
  writeFileSync(join(OUT_DIR, fname), content, 'utf8');
}

console.log('\n=== SADECE TRANSKRIPTTE GECEN VIDEOLAR (ozet) ===');
const ozet = sadeceTranskript.slice(0, 20).sort((a, b) => b.sure - a.sure);
for (const m of ozet) {
  const dakika = Math.round(m.sure / 60);
  console.log(`  [${m.id}] ${dakika}dk — ${m.baslik}`);
}
if (sadeceTranskript.length > 20) {
  console.log(`  ... ve ${sadeceTranskript.length - 20} video daha`);
}

// Index dosyası
const indexContent = [
  '# Davet Stratejileri — Transkript Index',
  `# Toplam eslesen: ${matches.length}`,
  `# Baslikla eslesen (dosya kaydedildi): ${baslikteVar.length}`,
  `# Sadece transkript eslesmesi: ${sadeceTranskript.length}`,
  '',
  '## Baslikla eslesen videolar (kaydedildi)',
  ...baslikteVar.map(m => `- [${m.id}] ${Math.round(m.sure / 60)}dk — ${m.baslik}`),
  '',
  '## Sadece transkript eslesmesi (kaydedilmedi, gerekirse ek)',
  ...sadeceTranskript.map(m => `- [${m.id}] ${Math.round(m.sure / 60)}dk — ${m.baslik}`),
].join('\n');
writeFileSync(join(OUT_DIR, '_INDEX.md'), indexContent, 'utf8');

console.log(`\nDosyalar: ${OUT_DIR}`);
console.log('Bitti.');
process.exit(0);

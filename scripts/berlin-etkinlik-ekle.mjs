// Berlin AMARE Wellness Experience etkinliğini takvime ekler (2026-07-12 talebi).
// Deterministik doc ID → tekrar çalıştırmak güvenli (üzerine yazar, mükerrer üretmez).
import 'dotenv/config';
import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});

const DOC_ID = 'berlin-wellness-2026-09';
const veri = {
  egitim: 'AMARE Wellness Experience — Building The Future of Wellness Together',
  tarih: '26.09.2026',
  gun: 'Cumartesi',
  saat: '',
  bitisSaati: '',
  sure: '2 gün',
  egitmen: '',
  yer: 'Colosseum Kino & Event Location, Berlin',
  sehir: 'Berlin',
  hafta: 4,
  kategori: 'Uluslararası Etkinlik',
  aciklama: '26-27 Eylül 2026 · İki gün wellness, ilham ve bağlantı: yeni AMARE, özel lansmanlar, uzman konuşmaları ve topluluk enerjisi. İndirimli bilet cuma gününe kadar geçerli.',
  biletLink: 'https://www.eventbrite.de/e/amare-building-the-future-of-wellness-together-tickets-1992509609880',
  etkinlikTuru: 'Wellness Experience',
  mekanAdi: 'Colosseum Kino & Event Location',
  acikAdres: 'Schönhauser Allee 123, 10437 Berlin, Almanya',
  katilimSayisi: '',
  tamamlandi: false,
};

await admin.firestore().collection('takvim').doc(DOC_ID).set(veri, { merge: true });
const snap = await admin.firestore().collection('takvim').doc(DOC_ID).get();
console.log('YAZILDI:', DOC_ID);
console.log('  egitim :', snap.data().egitim);
console.log('  tarih  :', snap.data().tarih, '| yer:', snap.data().yer);
console.log('  bilet  :', snap.data().biletLink ? 'VAR' : 'YOK');
process.exit(0);

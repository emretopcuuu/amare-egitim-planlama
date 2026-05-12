// /api/ical — Google Calendar / Apple Calendar / Outlook aboneliği için iCal feed
// Firestore'dan takvim verisini çekip RFC 5545 standart ICS dosyası döndürür
// Cache: 5dk (kullanıcı takvim app'i her açılışta yenilesin diye kısa)

import admin from 'firebase-admin';

function initFirebase() {
  if (admin.apps.length) return admin.firestore();
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
  return admin.firestore();
}

const parseTarih = (t) => {
  if (!t) return null;
  const parts = String(t).split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [d, m, y] = parts;
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime()) ? null : dt;
};

const icsDate = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00Z`;
};

const escapeIcs = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

const extractZoomUrl = (yer) => {
  if (!yer) return null;
  const h = yer.match(/https?:\/\/\S+/);
  if (h) return h[0];
  const id = yer.match(/(\d[\d\s]{6,})/);
  if (id) return `https://zoom.us/j/${id[1].replace(/\s/g, '')}`;
  return null;
};

export default async (request) => {
  try {
    const db = initFirebase();

    // Takvim publish kontrolü
    const settingsDoc = await db.collection('settings').doc('takvim').get();
    const yayinlandi = settingsDoc.exists ? settingsDoc.data().yayinlandi !== false : true;
    if (!yayinlandi) {
      return new Response('Takvim henüz yayınlanmadı', { status: 404 });
    }

    // Tüm eğitimleri çek
    const snapshot = await db.collection('takvim').get();
    const egitimler = [];
    snapshot.forEach(doc => egitimler.push({ id: doc.id, ...doc.data() }));

    const now = new Date();
    const events = [];
    egitimler.forEach(e => {
      const d = parseTarih(e.tarih);
      if (!d) return;
      if (!e.saat || !e.saat.includes(':')) return;
      const [saat = 0, dk = 0] = e.saat.split(':').map(Number);
      const baslangic = new Date(d);
      baslangic.setHours(saat, dk, 0, 0);
      let bitis;
      if (e.bitisSaati) {
        const [bS, bD] = e.bitisSaati.split(':').map(Number);
        bitis = new Date(d);
        bitis.setHours(bS, bD, 0, 0);
      } else {
        bitis = new Date(baslangic.getTime() + 60 * 60000);
      }

      const zoomUrl = extractZoomUrl(e.yer);
      const desc = [
        e.egitmen ? `Konuşmacı: ${e.egitmen}` : '',
        e.kategori ? `Kategori: ${e.kategori}` : '',
        zoomUrl || '',
        `Detaylar: https://egitimtakvimi.oneteamglobal.ai/takvim?id=${e.id}`,
      ].filter(Boolean).join('\n');

      events.push([
        'BEGIN:VEVENT',
        `UID:${e.id}@oneteamglobal.ai`,
        `DTSTAMP:${icsDate(now)}`,
        `DTSTART:${icsDate(baslangic)}`,
        `DTEND:${icsDate(bitis)}`,
        `SUMMARY:${escapeIcs(e.egitim || 'Eğitim')}`,
        `DESCRIPTION:${escapeIcs(desc)}`,
        e.yer ? `LOCATION:${escapeIcs(zoomUrl || e.yer)}` : '',
        zoomUrl ? `URL:${zoomUrl}` : '',
        e.kategori ? `CATEGORIES:${escapeIcs(e.kategori)}` : '',
        'BEGIN:VALARM',
        'TRIGGER:-PT15M',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeIcs(e.egitim || 'Eğitim')} - 15dk sonra başlıyor`,
        'END:VALARM',
        'END:VEVENT',
      ].filter(Boolean).join('\r\n'));
    });

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Amare Global//One Team Egitim Takvimi//TR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:One Team Eğitim Takvimi',
      'X-WR-CALDESC:Amare Global - One Team eğitim takvimi otomatik senkronize',
      'X-WR-TIMEZONE:Europe/Istanbul',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n');

    return new Response(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="oneteam-egitim-takvimi.ics"',
        'Cache-Control': 'public, max-age=300', // 5dk cache
      },
    });
  } catch (err) {
    return new Response(`Hata: ${err.message}`, { status: 500 });
  }
};

export const config = {
  path: '/api/ical',
};

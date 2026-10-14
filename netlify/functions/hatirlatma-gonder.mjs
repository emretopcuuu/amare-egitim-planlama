import admin from 'firebase-admin';
import { Resend } from 'resend';
import { metinTemizle } from './_metinTemizle.mjs';

// Netlify scheduled function — her 5 dakikada çalışır
export const config = { schedule: "*/5 * * * *" };

// Firebase Admin init (singleton)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const resend = new Resend(process.env.RESEND_API_KEY);

// ── Telefon/tarayıcı bildirimi (ikinci kanal) ──
// E-posta tek kanaldı; kişi e-postaya bakmıyorsa eğitimi kaçırıyordu.
// Abonelik `web_push_aboneleri` koleksiyonunda, egitimId ile tutuluyor.
// web-push veya VAPID yoksa bu blok sessizce devre dışı kalır, e-posta akışı
// hiçbir şekilde etkilenmez.
let webpush = null;
try {
  const m = await import('web-push');
  webpush = m.default || m;
} catch { /* paket yok: yalnız e-posta */ }

const VAPID_PUBLIC = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const PUSH_HAZIR = !!(webpush && VAPID_PUBLIC && VAPID_PRIVATE);
if (PUSH_HAZIR) {
  try {
    webpush.setVapidDetails('mailto:noreply@oneteamglobal.ai', VAPID_PUBLIC, VAPID_PRIVATE);
  } catch { /* yoksay */ }
}

// Bir eğitimin push abonelerine bildirim gönderir. Hata fırlatmaz.
const pushGonder = async (egitimId, baslik, govde, link) => {
  if (!PUSH_HAZIR || !egitimId) return 0;
  let n = 0;
  try {
    const snap = await db.collection('web_push_aboneleri')
      .where('egitimId', '==', egitimId)
      .where('aktif', '==', true)
      .get();
    const yuk = JSON.stringify({ title: baslik, body: govde, url: link });
    for (const d of snap.docs) {
      const a = d.data();
      try {
        await webpush.sendNotification({ endpoint: a.endpoint, keys: a.keys }, yuk);
        n++;
      } catch (e) {
        // 404/410 = abonelik ölmüş; bir daha denememek için pasifle.
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await d.ref.update({ aktif: false }).catch(() => {});
        }
      }
    }
  } catch (e) {
    console.error('push gönderilemedi:', e.message);
  }
  return n;
};

const LANG_TEXTS = {
  tr: {
    reminder: 'One Team Eğitim Hatırlatması',
    date: 'Tarih',
    time: 'Saat',
    speaker: 'Eğitmen',
    platform: 'Platform',
    joinMeeting: 'Toplantıya Katıl',
    footer: 'Bu hatırlatma talebiniz üzerine gönderilmiştir.',
    viewCalendar: 'Eğitim Takvimini Görüntüle',
    system: 'One Team Eğitim Yönetim Sistemi',
    subject: (name, date, time) => `Hatırlatma: ${name} — ${date} ${time}`,
  },
  en: {
    reminder: 'One Team Training Reminder',
    date: 'Date',
    time: 'Time',
    speaker: 'Trainer',
    platform: 'Platform',
    joinMeeting: 'Join Meeting',
    footer: 'This reminder was sent at your request.',
    viewCalendar: 'View Training Calendar',
    system: 'One Team Training Management System',
    subject: (name, date, time) => `Reminder: ${name} — ${date} ${time}`,
  },
  de: {
    reminder: 'One Team Schulungserinnerung',
    date: 'Datum',
    time: 'Uhrzeit',
    speaker: 'Trainer',
    platform: 'Plattform',
    joinMeeting: 'An Meeting teilnehmen',
    footer: 'Diese Erinnerung wurde auf Ihre Anfrage gesendet.',
    viewCalendar: 'Schulungskalender ansehen',
    system: 'One Team Schulungsverwaltungssystem',
    subject: (name, date, time) => `Erinnerung: ${name} — ${date} ${time}`,
  },
};

export default async () => {
  try {
    const simdi = admin.firestore.Timestamp.now();

    // Gönderilmemiş ve zamanı gelmiş hatırlatmaları bul
    const snapshot = await db.collection('hatirlatmalar')
      .where('gonderildi', '==', false)
      .where('gonderilecekZaman', '<=', simdi)
      .limit(50)
      .get();

    if (snapshot.empty) {
      console.log('Gönderilecek hatırlatma yok.');
      return new Response('OK - no reminders to send');
    }

    console.log(`${snapshot.size} hatırlatma gönderilecek...`);

    let gonderilen = 0;
    let hatali = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      try {
        const txt = LANG_TEXTS[data.dil] || LANG_TEXTS.tr;

        const zoomButton = data.zoomLink
          ? `<a href="${data.zoomLink}" style="display:inline-block;background:#2563EB;color:#fff;padding:14px 32px;border-radius:12px;font-weight:bold;font-size:16px;text-decoration:none;margin-top:16px;">${txt.joinMeeting}</a>`
          : '';

        const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f0ff;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
  <div style="background:linear-gradient(135deg,#6B21A8,#4F46E5);padding:32px 28px;color:#fff;text-align:center;">
    <div style="font-size:12px;letter-spacing:2px;opacity:0.7;text-transform:uppercase;">${txt.reminder}</div>
    <h1 style="font-size:24px;margin:12px 0 0;font-weight:800;">${data.egitimAdi}</h1>
  </div>
  <div style="padding:28px;">
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:8px 0;color:#6B7280;font-size:14px;">📅 ${txt.date}</td><td style="padding:8px 0;font-weight:700;font-size:14px;">${data.tarih}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;font-size:14px;">🕐 ${txt.time}</td><td style="padding:8px 0;font-weight:700;font-size:14px;">${data.saat}${data.bitisSaati ? ' – ' + data.bitisSaati : ''}</td></tr>
      ${data.egitmen ? `<tr><td style="padding:8px 0;color:#6B7280;font-size:14px;">🎤 ${txt.speaker}</td><td style="padding:8px 0;font-weight:700;font-size:14px;">${data.egitmen}</td></tr>` : ''}
      <tr><td style="padding:8px 0;color:#6B7280;font-size:14px;">📍 ${txt.platform}</td><td style="padding:8px 0;font-weight:700;font-size:14px;">${data.yer || 'Zoom'}</td></tr>
    </table>
    <div style="text-align:center;margin-top:20px;">
      ${zoomButton}
    </div>
    <p style="text-align:center;color:#9CA3AF;font-size:12px;margin-top:24px;">
      ${txt.footer}<br/>
      <a href="https://egitimtakvimi.oneteamglobal.ai/takvim" style="color:#7C3AED;">${txt.viewCalendar}</a>
    </p>
  </div>
  <div style="background:#F5F3FF;padding:16px 28px;text-align:center;border-top:2px solid #E9D5FF;">
    <span style="color:#7C3AED;font-weight:700;font-size:12px;">${txt.system}</span>
  </div>
</div>
</body>
</html>`;

        await resend.emails.send({
          from: 'One Team Eğitim <noreply@oneteamglobal.ai>',
          to: data.email,
          subject: metinTemizle(txt.subject(data.egitimAdi, data.tarih, data.saat)),
          html: metinTemizle(html),
        });

        // İkinci kanal: telefon bildirimi. E-posta zaten gitti; buradaki hata
        // kaydı "gönderildi" işaretlemesini engellemez.
        const pushAdedi = await pushGonder(
          data.egitimId,
          metinTemizle(data.egitimAdi || 'One Team Eğitimi'),
          metinTemizle(`${data.tarih || ''} ${data.saat || ''} başlıyor`.trim()),
          data.egitimId ? `https://egitimtakvimi.oneteamglobal.ai/e/${data.egitimId}` : 'https://egitimtakvimi.oneteamglobal.ai/takvim',
        );

        await doc.ref.update({
          gonderildi: true,
          gonderildiZaman: admin.firestore.Timestamp.now(),
          pushGonderilen: pushAdedi,
        });

        gonderilen++;
        console.log(`✅ Gönderildi: ${data.email} → ${data.egitimAdi}`);
      } catch (err) {
        hatali++;
        console.error(`❌ Hata: ${data.email} → ${err.message}`);
      }
    }

    console.log(`Toplam: ${gonderilen} gönderildi, ${hatali} hatalı`);
    return new Response(`OK - sent: ${gonderilen}, failed: ${hatali}`);
  } catch (err) {
    console.error('Scheduled function hatası:', err);
    return new Response('Error: ' + err.message, { status: 500 });
  }
};

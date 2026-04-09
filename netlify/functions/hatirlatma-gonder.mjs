import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { Resend } from 'resend';

// Netlify scheduled function — her 5 dakikada çalışır
export const config = { schedule: "*/5 * * * *" };

// Firebase Admin init (singleton)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
const resend = new Resend(process.env.RESEND_API_KEY);

export default async () => {
  try {
    const simdi = Timestamp.now();

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
        const zoomButton = data.zoomLink
          ? `<a href="${data.zoomLink}" style="display:inline-block;background:#2563EB;color:#fff;padding:14px 32px;border-radius:12px;font-weight:bold;font-size:16px;text-decoration:none;margin-top:16px;">Toplantıya Katıl</a>`
          : '';

        const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f0ff;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
  <div style="background:linear-gradient(135deg,#6B21A8,#4F46E5);padding:32px 28px;color:#fff;text-align:center;">
    <div style="font-size:12px;letter-spacing:2px;opacity:0.7;text-transform:uppercase;">One Team Eğitim Hatırlatması</div>
    <h1 style="font-size:24px;margin:12px 0 0;font-weight:800;">${data.egitimAdi}</h1>
  </div>
  <div style="padding:28px;">
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:8px 0;color:#6B7280;font-size:14px;">📅 Tarih</td><td style="padding:8px 0;font-weight:700;font-size:14px;">${data.tarih}</td></tr>
      <tr><td style="padding:8px 0;color:#6B7280;font-size:14px;">🕐 Saat</td><td style="padding:8px 0;font-weight:700;font-size:14px;">${data.saat}${data.bitisSaati ? ' – ' + data.bitisSaati : ''}</td></tr>
      ${data.egitmen ? `<tr><td style="padding:8px 0;color:#6B7280;font-size:14px;">🎤 Konuşmacı</td><td style="padding:8px 0;font-weight:700;font-size:14px;">${data.egitmen}</td></tr>` : ''}
      <tr><td style="padding:8px 0;color:#6B7280;font-size:14px;">📍 Platform</td><td style="padding:8px 0;font-weight:700;font-size:14px;">${data.yer || 'Zoom'}</td></tr>
    </table>
    <div style="text-align:center;margin-top:20px;">
      ${zoomButton}
    </div>
    <p style="text-align:center;color:#9CA3AF;font-size:12px;margin-top:24px;">
      Bu hatırlatma talebiniz üzerine gönderilmiştir.<br/>
      <a href="https://egitimtakvimi.oneteamglobal.ai/takvim" style="color:#7C3AED;">Eğitim Takvimini Görüntüle</a>
    </p>
  </div>
  <div style="background:#F5F3FF;padding:16px 28px;text-align:center;border-top:2px solid #E9D5FF;">
    <span style="color:#7C3AED;font-weight:700;font-size:12px;">One Team Eğitim Yönetim Sistemi</span>
  </div>
</div>
</body>
</html>`;

        await resend.emails.send({
          from: 'One Team <onboarding@resend.dev>',
          to: data.email,
          subject: `Hatırlatma: ${data.egitimAdi} — ${data.tarih} ${data.saat}`,
          html,
        });

        await doc.ref.update({
          gonderildi: true,
          gonderildiZaman: Timestamp.now(),
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

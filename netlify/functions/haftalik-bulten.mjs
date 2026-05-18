// Pazartesi 09:00 Europe/Istanbul'da bu haftaki eğitim özetini abonelere email gönderir
// Schedule: "0 6 * * 1" UTC = 09:00 Istanbul (Pazartesi)

import admin from 'firebase-admin';
import { Resend } from 'resend';
import { metinTemizle } from './_metinTemizle.mjs';

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

const escapeHtml = (s) => String(s || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const extractZoomUrl = (yer) => {
  if (!yer) return null;
  const h = yer.match(/https?:\/\/\S+/);
  if (h) return h[0];
  const id = yer.match(/(\d[\d\s]{6,})/);
  if (id) return `https://zoom.us/j/${id[1].replace(/\s/g, '')}`;
  return null;
};

const KATEGORI_EMOJI = {
  'Liderlik': '👑', 'Satış': '💼', 'Motivasyon': '🔥', 'Sağlık': '🩺',
  'Finansal Özgürlük': '💰', 'Kişisel Gelişim': '🌱', 'Vizyon Günü': '✨',
  'Panel': '🎤', 'Diğer': '📌',
};

const renderEmailHtml = (egitimler, aboneAd) => {
  const items = egitimler.map(e => {
    const tarih = parseTarih(e.tarih);
    const gun = tarih ? tarih.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }) : e.tarih;
    const zoomUrl = extractZoomUrl(e.yer);
    const detayUrl = `https://egitimtakvimi.oneteamglobal.ai/e/${e.id}`;
    const emoji = KATEGORI_EMOJI[e.kategori] || '📌';
    return `
    <tr>
      <td style="padding: 16px 0; border-bottom: 1px solid #e5e7eb;">
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td>
              <div style="font-size: 11px; color: #9333ea; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${emoji} ${escapeHtml(e.kategori || 'Eğitim')}</div>
              <div style="font-size: 18px; font-weight: 700; color: #1f2937; margin: 4px 0;"><a href="${detayUrl}" style="color: #1f2937; text-decoration: none;">${escapeHtml(e.egitim)}</a></div>
              <div style="font-size: 14px; color: #6b7280; margin-bottom: 6px;">📅 ${gun}${e.saat ? ` • ⏰ ${e.saat}${e.bitisSaati ? `-${e.bitisSaati}` : ''}` : ''}</div>
              ${e.egitmen ? `<div style="font-size: 13px; color: #6b7280;">🎤 ${escapeHtml(e.egitmen)}</div>` : ''}
              <div style="margin-top: 10px;">
                ${zoomUrl ? `<a href="${zoomUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 8px 14px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600; margin-right: 6px;">📡 Zoom'a Katıl</a>` : ''}
                <a href="${detayUrl}" style="display: inline-block; background: #f3f4f6; color: #374151; padding: 8px 14px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600;">Detaylar →</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Bu Haftanın Eğitimleri</title></head>
<body style="margin:0; padding:0; background:#f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;">
<table cellpadding="0" cellspacing="0" width="100%" style="background:#f3f4f6; padding:20px 0;">
  <tr><td align="center">
    <table cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; background:white; border-radius:16px; overflow:hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <tr><td style="background:linear-gradient(135deg, #5F2756 0%, #3D1734 100%); padding:30px 24px; text-align:center;">
        <div style="color:#F5D77A; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px;">One Team — Haftalık Bülten</div>
        <h1 style="color:white; margin:8px 0 0; font-size:24px; font-weight:800;">Bu Haftanın Eğitimleri</h1>
        <p style="color:#d4a8d4; margin:6px 0 0; font-size:14px;">${aboneAd ? `Merhaba ${escapeHtml(aboneAd)}, ` : ''}Bu hafta ${egitimler.length} eğitim seni bekliyor</p>
      </td></tr>
      <tr><td style="padding:24px;">
        <table cellpadding="0" cellspacing="0" width="100%">${items}</table>
      </td></tr>
      <tr><td style="padding:24px; background:#fafafa; text-align:center; font-size:12px; color:#6b7280;">
        <a href="https://egitimtakvimi.oneteamglobal.ai/takvim" style="color:#9333ea; font-weight:600; text-decoration:none;">Tüm takvimi gör →</a>
        <div style="margin-top:12px;">Amare Global · One Team</div>
        <div style="margin-top:6px; font-size:11px;">Bu emaili istemiyor musun? <a href="https://egitimtakvimi.oneteamglobal.ai/?bulten-iptal=1" style="color:#9333ea;">Aboneliği iptal et</a></div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
};

export default async () => {
  try {
    const db = initFirebase();
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Bu haftanın eğitimlerini çek (bugünden 7 gün sonraya kadar)
    const bugun = new Date();
    bugun.setHours(0, 0, 0, 0);
    const limit = new Date(bugun);
    limit.setDate(bugun.getDate() + 7);

    const snap = await db.collection('takvim').get();
    const egitimler = [];
    snap.forEach(doc => {
      const e = { id: doc.id, ...doc.data() };
      const d = parseTarih(e.tarih);
      if (d && d >= bugun && d < limit) egitimler.push({ ...e, _d: d });
    });
    egitimler.sort((a, b) => a._d - b._d || (a.saat || '').localeCompare(b.saat || ''));

    if (egitimler.length === 0) {
      return new Response(JSON.stringify({ ok: true, msg: 'Bu hafta eğitim yok, gönderim yapılmadı' }), { status: 200 });
    }

    // Aboneleri çek
    const aboneSnap = await db.collection('bulten_aboneleri').where('aktif', '==', true).get();
    const aboneler = [];
    aboneSnap.forEach(doc => aboneler.push({ id: doc.id, ...doc.data() }));

    if (aboneler.length === 0) {
      return new Response(JSON.stringify({ ok: true, msg: 'Abone yok' }), { status: 200 });
    }

    let basarili = 0, hata = 0;
    for (const abone of aboneler) {
      try {
        const htmlRaw = renderEmailHtml(egitimler, abone.ad);
        await resend.emails.send({
          from: 'One Team Eğitim <bulten@egitimtakvimi.oneteamglobal.ai>',
          to: abone.email,
          subject: metinTemizle(`📅 Bu hafta ${egitimler.length} One Team eğitimi`),
          html: metinTemizle(htmlRaw),
        });
        basarili++;
      } catch (err) {
        hata++;
        console.error('[bulten]', abone.email, err.message);
      }
    }

    return new Response(JSON.stringify({ ok: true, egitimler: egitimler.length, basarili, hata, toplamAbone: aboneler.length }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500 });
  }
};

// Pazartesi 06:00 UTC = 09:00 Europe/Istanbul
export const config = {
  schedule: '0 6 * * 1',
};

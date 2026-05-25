// netlify/functions/admin-onay-mail-backfill.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST /.netlify/functions/admin-onay-mail-backfill
//   Auth: admin Bearer token
//
// Daha önce onaylanmış ama bildirim emaili gönderilmemiş tüm
// email_duzeltme_talepleri kayıtlarına bilgilendirme maili gönderir.
// onayMailGonderildi: true flag'i ile bir daha tekrarlamaz.
//
// Response: { toplam, gonderilen, atlanan, hatali, detay: [...] }
// ─────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';
import { Resend } from 'resend';
import { isAdminToken } from './_adminEmails.mjs';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonRes(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function buildMailHtml(talep) {
  const ad = talep.ad || 'Değerli Üyemiz';
  const ilkAd = ad.split(' ')[0];
  const email = talep.yeniEmail || '';
  return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"><title>Email Güncellendi</title></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f5f3ff;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(76,29,149,0.15);">
        <tr><td style="background:linear-gradient(135deg,#7c3aed 0%,#5b21b6 100%);padding:32px 24px;text-align:center;">
          <div style="display:inline-block;width:56px;height:56px;background:rgba(251,191,36,0.2);border:2px solid rgba(251,191,36,0.4);border-radius:16px;margin-bottom:16px;line-height:56px;font-size:28px;">✓</div>
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Email Adresiniz Güncellendi</h1>
          <p style="margin:8px 0 0;color:#e9d5ff;font-size:14px;">One Team Eğitim Sistemi</p>
        </td></tr>
        <tr><td style="padding:32px 24px;">
          <p style="margin:0 0 16px;color:#1f2937;font-size:16px;line-height:1.6;">
            Merhaba <strong>${ilkAd}</strong>,
          </p>
          <p style="margin:0 0 16px;color:#1f2937;font-size:15px;line-height:1.6;">
            Daha önce gönderdiğiniz email düzeltme talebiniz onaylandı. Amare kaydınızdaki email adresi başarıyla güncellendi:
          </p>
          <div style="background:#faf5ff;border-left:4px solid #7c3aed;padding:16px;border-radius:8px;margin:16px 0;">
            <div style="font-size:13px;color:#6b21a8;font-weight:600;margin-bottom:4px;">YENİ EMAIL ADRESİNİZ</div>
            <div style="font-size:16px;color:#1f2937;font-weight:700;">${email}</div>
          </div>
          <p style="margin:16px 0;color:#374151;font-size:15px;line-height:1.6;">
            Artık <a href="https://egitimtakvimi.oneteamglobal.ai" style="color:#7c3aed;font-weight:600;text-decoration:none;">egitimtakvimi.oneteamglobal.ai</a> adresinden bu email adresinizle giriş yapabilirsiniz.
          </p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:24px auto;">
            <tr><td style="background:#f59e0b;border-radius:12px;">
              <a href="https://egitimtakvimi.oneteamglobal.ai" style="display:inline-block;padding:14px 28px;color:#1f2937;font-weight:700;font-size:15px;text-decoration:none;">
                Giriş Yap →
              </a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;color:#6b7280;font-size:13px;line-height:1.5;text-align:center;">
            Bu işlem sizin tarafınızdan yapılmadıysa lütfen sponsorunuza veya OneTeam yetkilisine bildirin.
          </p>
        </td></tr>
        <tr><td style="background:#faf5ff;padding:20px 24px;text-align:center;border-top:1px solid #e9d5ff;">
          <p style="margin:0;color:#6b7280;font-size:12px;">
            © 2026 OneTeam · <a href="https://egitimtakvimi.oneteamglobal.ai" style="color:#7c3aed;text-decoration:none;">egitimtakvimi.oneteamglobal.ai</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return jsonRes({ error: 'POST only' }, 405);

  try {
    const auth = req.headers.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return jsonRes({ error: 'Token gerekli' }, 401);
    let decoded;
    try { decoded = await admin.auth().verifyIdToken(m[1]); }
    catch { return jsonRes({ error: 'Geçersiz token' }, 401); }
    if (!isAdminToken(decoded)) return jsonRes({ error: 'Admin yetkisi yok' }, 403);

    if (!resend) return jsonRes({ error: 'RESEND_API_KEY eksik' }, 500);

    // Body'den talepId al — varsa sadece o talebi gönder, yoksa hepsi
    let body = {};
    try { body = await req.json(); } catch {}
    const talepId = body.talepId ? String(body.talepId).trim() : null;
    const tekrarGonder = !!body.tekrarGonder; // true ise onayMailGonderildi olsa bile gönder

    const hedefler = [];
    let toplamSayi = 0;

    if (talepId) {
      // Tekil mod
      const docRef = admin.firestore().collection('email_duzeltme_talepleri').doc(talepId);
      const docSnap = await docRef.get();
      if (!docSnap.exists) return jsonRes({ error: 'Talep bulunamadı' }, 404);
      const data = docSnap.data();
      toplamSayi = 1;
      if (data.durum !== 'onaylandi') return jsonRes({ error: 'Talep henüz onaylanmamış' }, 400);
      if (!data.yeniEmail || !data.yeniEmail.includes('@')) return jsonRes({ error: 'Geçersiz email' }, 400);
      if (data.onayMailGonderildi === true && !tekrarGonder) {
        return jsonRes({ error: 'Bu talebe zaten mail gönderildi. Tekrar göndermek için tekrarGonder:true ekle.' }, 400);
      }
      hedefler.push({ id: docSnap.id, ref: docRef, ...data });
    } else {
      // Bulk mod — tüm onaylanmış ama mail gönderilmemiş
      const snap = await admin.firestore()
        .collection('email_duzeltme_talepleri')
        .where('durum', '==', 'onaylandi')
        .get();
      toplamSayi = snap.size;
      snap.forEach(d => {
        const data = d.data();
        if (data.onayMailGonderildi === true) return;
        if (!data.yeniEmail || !data.yeniEmail.includes('@')) return;
        hedefler.push({ id: d.id, ref: d.ref, ...data });
      });
    }

    let gonderilen = 0;
    let hatali = 0;
    const detay = [];

    for (const t of hedefler) {
      try {
        await resend.emails.send({
          from: 'One Team Eğitim <noreply@oneteamglobal.ai>',
          to: t.yeniEmail,
          subject: '✓ Email adresiniz güncellendi — One Team',
          html: buildMailHtml(t),
        });
        await t.ref.update({
          onayMailGonderildi: true,
          onayMailBackfillTarihi: admin.firestore.FieldValue.serverTimestamp(),
        });
        gonderilen++;
        detay.push({ ad: t.ad, email: t.yeniEmail, durum: 'gonderildi' });
        // Resend rate limit dostu kısa gecikme
        await new Promise(r => setTimeout(r, 300));
      } catch (e) {
        hatali++;
        await t.ref.update({
          onayMailGonderildi: false,
          onayMailHata: e.message.slice(0, 200),
        });
        detay.push({ ad: t.ad, email: t.yeniEmail, durum: 'hata', hata: e.message.slice(0, 80) });
      }
    }

    return jsonRes({
      ok: true,
      toplam: toplamSayi,
      hedef: hedefler.length,
      gonderilen,
      hatali,
      atlanan: toplamSayi - hedefler.length,
      detay,
    });
  } catch (err) {
    console.error('[admin-onay-mail-backfill] hata:', err.message);
    return jsonRes({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }, 500);
  }
};

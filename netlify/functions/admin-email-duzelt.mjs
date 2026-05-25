// netlify/functions/admin-email-duzelt.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST /.netlify/functions/admin-email-duzelt
//   Auth: admin Bearer token
//   Body: { talepId, aksiyon: 'onayla' | 'reddet' }
//
// Email düzeltme talebini admin onaylar veya reddeder.
// Onay → amare_raw_members.email Supabase'de update edilir (service_role).
// Red → durum sadece güncellenir.
// ─────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';
import { Resend } from 'resend';
import { isAdminToken } from './_adminEmails.mjs';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yvpstkbwglefxukfpgyd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return jsonRes({ error: 'POST only' }, 405);

  try {
    // Admin auth
    const auth = req.headers.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return jsonRes({ error: 'Token gerekli' }, 401);
    let decoded;
    try { decoded = await admin.auth().verifyIdToken(m[1]); }
    catch { return jsonRes({ error: 'Geçersiz token' }, 401); }
    if (!isAdminToken(decoded)) return jsonRes({ error: 'Admin yetkisi yok' }, 403);

    const body = await req.json();
    const talepId = String(body.talepId || '').trim();
    const aksiyon = String(body.aksiyon || '').trim();

    if (!talepId) return jsonRes({ error: 'talepId gerekli' }, 400);
    if (!['onayla', 'reddet'].includes(aksiyon)) {
      return jsonRes({ error: 'aksiyon "onayla" veya "reddet" olmalı' }, 400);
    }

    const talepRef = admin.firestore().doc(`email_duzeltme_talepleri/${talepId}`);
    const talepSnap = await talepRef.get();
    if (!talepSnap.exists) return jsonRes({ error: 'Talep bulunamadı' }, 404);
    const talep = talepSnap.data();
    if (talep.durum !== 'beklemede') {
      return jsonRes({ error: `Talep zaten ${talep.durum} durumunda` }, 400);
    }

    if (aksiyon === 'reddet') {
      await talepRef.update({
        durum: 'reddedildi',
        islemTarihi: admin.firestore.FieldValue.serverTimestamp(),
        islemYapan: decoded.email,
      });
      return jsonRes({ ok: true, durum: 'reddedildi' });
    }

    // ONAYLAMA: Supabase'i güncelle
    if (!SUPABASE_SERVICE_KEY) {
      return jsonRes({
        error: 'SUPABASE_SERVICE_ROLE_KEY environment variable eksik. Netlify > Site Settings > Environment Variables ekle.',
      }, 500);
    }

    // lookup amareId veya phone olabilir. amareId numerik string ise direkt kullan
    const lookup = String(talep.lookup || '').trim();
    let amareId = null;
    let updateField = null;

    if (/^\d{6,10}$/.test(lookup)) {
      // Amare ID format (6-10 rakam)
      amareId = lookup;
      updateField = `amare_id=eq.${amareId}`;
    } else if (/^\+?\d[\d\s-]{6,}\d$/.test(lookup)) {
      // Telefon format
      const phoneNorm = lookup.replace(/[\s-]/g, '');
      // Birden fazla format dene
      updateField = `phone=in.(${phoneNorm},${phoneNorm.replace(/^\+?90/, '0')},${phoneNorm.replace(/^0/, '+90')})`;
    } else {
      // Email lookup'i (eski/bozuk)
      updateField = `email=eq.${encodeURIComponent(lookup)}`;
    }

    // Supabase PATCH (service_role bypass RLS)
    const url = `${SUPABASE_URL}/rest/v1/amare_raw_members?${updateField}`;
    const patchRes = await fetch(url, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ email: talep.yeniEmail }),
    });

    if (!patchRes.ok) {
      const err = await patchRes.text();
      throw new Error(`Supabase PATCH ${patchRes.status}: ${err.slice(0, 200)}`);
    }
    const guncellenenler = await patchRes.json();

    await talepRef.update({
      durum: 'onaylandi',
      islemTarihi: admin.firestore.FieldValue.serverTimestamp(),
      islemYapan: decoded.email,
      guncellenenKayitSayisi: guncellenenler.length,
      guncellenenAmareIds: guncellenenler.map(g => g.amare_id),
    });

    // Onay bildirim emaili — kullanıcının yeni email'ine gönder
    let mailGonderildi = false;
    if (resend && talep.yeniEmail && guncellenenler.length > 0) {
      try {
        const ad = talep.ad || 'Değerli Üyemiz';
        const ilkAd = ad.split(' ')[0];
        const html = `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"><title>Email Güncellendi</title></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f5f3ff;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(76,29,149,0.15);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#7c3aed 0%,#5b21b6 100%);padding:32px 24px;text-align:center;">
          <div style="display:inline-block;width:56px;height:56px;background:rgba(251,191,36,0.2);border:2px solid rgba(251,191,36,0.4);border-radius:16px;margin-bottom:16px;line-height:56px;font-size:28px;">✓</div>
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Email Adresiniz Güncellendi</h1>
          <p style="margin:8px 0 0;color:#e9d5ff;font-size:14px;">One Team Eğitim Sistemi</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px 24px;">
          <p style="margin:0 0 16px;color:#1f2937;font-size:16px;line-height:1.6;">
            Merhaba <strong>${ilkAd}</strong>,
          </p>
          <p style="margin:0 0 16px;color:#1f2937;font-size:15px;line-height:1.6;">
            Email düzeltme talebiniz onaylandı. Amare kaydınızdaki email adresi başarıyla güncellendi:
          </p>
          <div style="background:#faf5ff;border-left:4px solid #7c3aed;padding:16px;border-radius:8px;margin:16px 0;">
            <div style="font-size:13px;color:#6b21a8;font-weight:600;margin-bottom:4px;">YENİ EMAIL ADRESİNİZ</div>
            <div style="font-size:16px;color:#1f2937;font-weight:700;">${talep.yeniEmail}</div>
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
        <!-- Footer -->
        <tr><td style="background:#faf5ff;padding:20px 24px;text-align:center;border-top:1px solid #e9d5ff;">
          <p style="margin:0;color:#6b7280;font-size:12px;">
            © 2026 OneTeam · <a href="https://egitimtakvimi.oneteamglobal.ai" style="color:#7c3aed;text-decoration:none;">egitimtakvimi.oneteamglobal.ai</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

        await resend.emails.send({
          from: 'One Team Eğitim <noreply@oneteamglobal.ai>',
          to: talep.yeniEmail,
          subject: '✓ Email adresiniz güncellendi — One Team',
          html,
        });
        mailGonderildi = true;
        await talepRef.update({ onayMailGonderildi: true });
      } catch (e) {
        console.warn('[admin-email-duzelt] mail gönderim hatası:', e.message);
        await talepRef.update({ onayMailGonderildi: false, onayMailHata: e.message.slice(0, 200) });
      }
    }

    return jsonRes({
      ok: true,
      durum: 'onaylandi',
      guncellenenler: guncellenenler.length,
      mailGonderildi,
      detay: guncellenenler.map(g => ({ amare_id: g.amare_id, full_name: g.full_name, email: g.email })),
    });

  } catch (err) {
    console.error('[admin-email-duzelt] hata:', err.message);
    return jsonRes({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }, 500);
  }
};

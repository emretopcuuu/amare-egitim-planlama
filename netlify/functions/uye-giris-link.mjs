// netlify/functions/uye-giris-link.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST { lookup: "email | telefon | amare_id" }
//
// 1. Supabase RPC `amare_uye_lookup` ile üye doğrula
// 2. Firebase Admin: generateSignInWithEmailLink (magic link)
// 3. Resend ile branded email yolla
// 4. Response: { sent: true, emailMask: "a***@g***.com", ad: "Ahmet" }
//
// Güvenlik:
//   - Supabase RPC `SECURITY DEFINER` ile çalışır, tabloya direkt erişim yok
//   - Email response'ta maskeli — tam adres asla dönmez
//   - Firebase token 1 saat geçerli, tek kullanımlık
// ─────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';
import { Resend } from 'resend';
import { rateLimitCheck, rateLimitResponse } from './_rateLimit.mjs';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const resend = new Resend(process.env.RESEND_API_KEY);
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// E-posta maskele: "ahmet@gmail.com" → "ah***@g***.com"
function maskEmail(email) {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  const dotIdx = domain.lastIndexOf('.');
  const domainHead = dotIdx > 0 ? domain.slice(0, dotIdx) : domain;
  const tld = dotIdx > 0 ? domain.slice(dotIdx) : '';
  const lh = local.length;
  const localMasked = lh <= 2 ? local[0] + '*' : local.slice(0, Math.min(2, lh - 2)) + '***';
  const dh = domainHead.length;
  const domainMasked = dh <= 1 ? domainHead + '***' : domainHead[0] + '***';
  return `${localMasked}@${domainMasked}${tld}`;
}

// Supabase RPC çağrısı (REST API ile — paket gerek yok)
async function supabaseRpc(fnName, params) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase RPC ${res.status}: ${err.slice(0, 200)}`);
  }
  return res.json();
}

// One Team brand uyumlu email HTML — premium mor tasarım + logo
function emailHtml({ ad, link, lookup }) {
  const onAd = ad ? escapeHtml(ad.split(' ')[0]) : 'Sevgili Üye';
  return `<!doctype html>
<html lang="tr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>One Team — Giriş Linkin</title>
<style>
  @media (prefers-color-scheme: light) {
    .force-dark-bg { background:#1a103d !important; }
  }
  .btn:hover { filter:brightness(1.08); }
</style>
</head>
<body style="margin:0;padding:0;background:#0F0823;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#fff;-webkit-text-size-adjust:100%;">
  <!-- Preheader (inbox preview) -->
  <div style="display:none;font-size:1px;color:#0F0823;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${onAd}, One Team Eğitim Takvimi'ne tek tık giriş linkin hazır. 1 saat geçerli.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="force-dark-bg" style="background:#0F0823;background-image:linear-gradient(180deg,#1a103d 0%,#0F0823 100%);min-height:100vh;">
    <tr><td align="center" style="padding:32px 16px;">

      <!-- Logo header (üst, branded) -->
      <table role="presentation" width="100%" style="max-width:560px;margin-bottom:24px;">
        <tr><td align="center">
          <img src="https://egitimtakvimi.oneteamglobal.ai/logos/oneteam-logo.png"
            alt="One Team"
            width="72" height="72"
            style="display:block;margin:0 auto 12px;border-radius:16px;background:rgba(255,255,255,0.05);padding:6px;" />
          <div style="font-size:11px;color:#A78BFA;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">
            Eğitim Takvimi
          </div>
        </td></tr>
      </table>

      <!-- Ana kart -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:linear-gradient(180deg,rgba(255,255,255,0.07) 0%,rgba(255,255,255,0.03) 100%);border:1px solid rgba(255,255,255,0.12);border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.45);">

        <!-- Üst altın bant -->
        <tr><td style="height:4px;background:linear-gradient(90deg,#FBBF24 0%,#F59E0B 50%,#FBBF24 100%);"></td></tr>

        <!-- Hero başlık -->
        <tr><td style="padding:40px 36px 24px;">
          <div style="font-size:28px;line-height:1.2;font-weight:800;color:#fff;letter-spacing:-0.5px;margin:0 0 12px;">
            Merhaba ${onAd} <span style="display:inline-block;">👋</span>
          </div>
          <p style="margin:0;color:#D1D5DB;font-size:16px;line-height:1.6;">
            Eğitim Takvimi'ne tek tık giriş yapabilirsin.<br>
            <span style="color:#A78BFA;font-weight:600;">Şifre yok. Sadece tıkla.</span>
          </p>
        </td></tr>

        <!-- CTA buton -->
        <tr><td align="center" style="padding:8px 36px 32px;">
          <a href="${link}" class="btn"
            style="display:inline-block;background:linear-gradient(135deg,#FBBF24 0%,#F59E0B 100%);color:#0F0823;text-decoration:none;padding:16px 48px;border-radius:14px;font-weight:800;font-size:17px;letter-spacing:0.3px;box-shadow:0 8px 24px rgba(251,191,36,0.35),inset 0 1px 0 rgba(255,255,255,0.3);">
            Giriş Yap →
          </a>
          <p style="margin:14px 0 0;color:#6B7280;font-size:12px;">
            Butona tıkla, anında giriş yapacaksın
          </p>
        </td></tr>

        <!-- Bilgi şeridi -->
        <tr><td style="padding:24px 36px;border-top:1px solid rgba(255,255,255,0.08);background:rgba(0,0,0,0.15);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:8px 0;color:#D1D5DB;font-size:13px;">
                <span style="color:#FBBF24;font-weight:700;">🔒 Güvenli</span> &nbsp;·&nbsp;
                <span style="color:#A78BFA;">1 saat geçerli</span> &nbsp;·&nbsp;
                <span style="color:#9CA3AF;">Tek kullanımlık</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#9CA3AF;font-size:12px;">
                <span style="opacity:0.7;">Aradığın bilgi:</span>
                <code style="background:rgba(255,255,255,0.08);padding:3px 8px;border-radius:6px;font-size:11px;color:#FBBF24;font-family:'SF Mono',Monaco,monospace;">${escapeHtml(lookup)}</code>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Uyarı -->
        <tr><td style="padding:20px 36px 32px;">
          <div style="background:rgba(251,191,36,0.08);border-left:3px solid #F59E0B;border-radius:6px;padding:12px 14px;">
            <p style="margin:0;color:#FBBF24;font-size:12px;font-weight:600;">⚠️ Sen istemedin mi?</p>
            <p style="margin:4px 0 0;color:#D1D5DB;font-size:12px;line-height:1.5;">
              Bu mail'i sen tetiklemediysen görmezden gel — kimse senin hesabına giremez. Email + link birlikte gerekir.
            </p>
          </div>
        </td></tr>

        <!-- Backup link -->
        <tr><td style="padding:0 36px 28px;">
          <p style="margin:0 0 6px;color:#6B7280;font-size:11px;text-align:center;">
            Bağlantı çalışmıyorsa şunu tarayıcına kopyala:
          </p>
          <p style="margin:0;padding:8px;background:rgba(0,0,0,0.3);border-radius:6px;text-align:center;">
            <a href="${link}" style="color:#A78BFA;word-break:break-all;font-size:10px;font-family:'SF Mono',Monaco,monospace;text-decoration:none;">${link}</a>
          </p>
        </td></tr>
      </table>

      <!-- Footer -->
      <table role="presentation" width="100%" style="max-width:560px;margin-top:24px;">
        <tr><td align="center" style="padding:16px 0;">
          <p style="margin:0 0 6px;color:#6B7280;font-size:12px;font-weight:600;">
            One Team Eğitim Sistemi
          </p>
          <p style="margin:0 0 14px;color:#4B5563;font-size:11px;">
            900+ kayıtlı eğitim · Kişisel kariyer yolu · Sponsor dashboard
          </p>
          <p style="margin:0;">
            <a href="https://egitimtakvimi.oneteamglobal.ai" style="color:#A78BFA;text-decoration:none;font-size:11px;font-weight:600;">
              egitimtakvimi.oneteamglobal.ai
            </a>
          </p>
        </td></tr>
        <tr><td align="center" style="padding-top:8px;">
          <p style="margin:0;color:#374151;font-size:10px;">
            © ${new Date().getFullYear()} Amare Global / One Team
          </p>
        </td></tr>
      </table>

    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Rate limit: 5/dk, 20/sa per IP — email spam saldırısı koruması
    const limit = await rateLimitCheck(req, 'uye-giris-link', { perMinute: 5, perHour: 20 });
    if (!limit.ok) return rateLimitResponse(limit);

    const body = await req.json();
    const lookup = String(body.lookup || '').trim();

    if (!lookup || lookup.length < 3) {
      return new Response(JSON.stringify({
        found: false,
        message: 'Geçersiz giriş. Email, telefon veya Amare ID gir.',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 1. Supabase RPC ile üye bul
    const rows = await supabaseRpc('amare_uye_lookup', { arama: lookup });
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({
        found: false,
        message: 'Bu bilgi ile kayıtlı üye bulunamadı. Sponsorundan doğrula veya başka bir bilgini dene.',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const uye = rows[0];
    if (!uye.email) {
      return new Response(JSON.stringify({
        found: false,
        message: 'Üye bulundu ama kayıtlı email yok. Sponsorundan email güncelle.',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 2. Firebase magic link üret
    const actionCodeSettings = {
      url: `https://egitimtakvimi.oneteamglobal.ai/giris-tamamla?uye=${encodeURIComponent(uye.amare_id || '')}`,
      handleCodeInApp: true,
    };
    const link = await admin.auth().generateSignInWithEmailLink(uye.email, actionCodeSettings);

    // 3. Resend ile email yolla
    const html = emailHtml({ ad: uye.full_name, link, lookup });
    const subject = `One Team Giriş Linki — ${uye.full_name?.split(' ')[0] || 'Hoş geldin'}`;
    await resend.emails.send({
      from: 'One Team <noreply@oneteamglobal.ai>',
      to: uye.email,
      subject,
      html,
    });

    return new Response(JSON.stringify({
      found: true,
      sent: true,
      emailMask: maskEmail(uye.email),
      emailReal: uye.email,  // Tam email — frontend localStorage'a yazar (signInWithEmailLink gerektirir)
      adKisa: (uye.full_name || '').split(' ')[0] || null,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('[uye-giris-link] hata:', err.message, err.stack);
    return new Response(JSON.stringify({
      error: 'Sistem hatası. Lütfen birazdan tekrar dene.',
      detail: err.message.slice(0, 200),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

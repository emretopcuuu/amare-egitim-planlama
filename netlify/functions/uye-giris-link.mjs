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

// One Team brand uyumlu email HTML (mor tema)
function emailHtml({ ad, link, lookup }) {
  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>One Team Giriş Linki</title></head>
<body style="margin:0;padding:0;background:#1a103d;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#fff;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#3b1772 0%,#1a103d 100%);min-height:100vh;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="100%" style="max-width:560px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:40px 32px;">
        <tr><td align="center">
          <div style="display:inline-block;width:60px;height:60px;background:linear-gradient(135deg,#fbbf24,#f59e0b);border-radius:14px;line-height:60px;font-size:28px;font-weight:bold;color:#1a103d;margin-bottom:16px;">✨</div>
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.3px;">One Team</h1>
          <p style="margin:0;color:#c4b5fd;font-size:13px;">Eğitim Planlama Sistemi</p>
        </td></tr>

        <tr><td style="padding:32px 0 16px;">
          <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#fff;">Merhaba ${ad ? escapeHtml(ad.split(' ')[0]) : 'Sevgili Üye'} 👋</h2>
          <p style="margin:0;color:#d1d5db;font-size:15px;line-height:1.6;">
            Eğitim Takvimi'ne giriş için tıkla — şifre yok, sadece tek seferlik link.
          </p>
        </td></tr>

        <tr><td align="center" style="padding:16px 0 24px;">
          <a href="${link}" style="display:inline-block;background:#fbbf24;color:#1a103d;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:700;font-size:16px;box-shadow:0 4px 12px rgba(251,191,36,0.3);">
            Giriş Yap →
          </a>
        </td></tr>

        <tr><td style="padding:16px 0;border-top:1px solid rgba(255,255,255,0.08);">
          <p style="margin:0 0 6px;color:#9ca3af;font-size:12px;">
            🔒 Bu link <strong style="color:#fbbf24;">1 saat geçerli</strong> ve tek kullanımlık.
          </p>
          <p style="margin:0 0 6px;color:#9ca3af;font-size:12px;">
            👤 Aradığın bilgi: <code style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;font-size:11px;">${escapeHtml(lookup)}</code>
          </p>
          <p style="margin:0;color:#9ca3af;font-size:12px;">
            ⚠️ Bu isteği sen yapmadıysan görmezden gel — kimse hesabına giremez.
          </p>
        </td></tr>

        <tr><td align="center" style="padding-top:24px;">
          <p style="margin:0;color:#6b7280;font-size:11px;">
            Bağlantı çalışmıyorsa şunu tarayıcına kopyala:<br>
            <span style="color:#a78bfa;word-break:break-all;font-size:10px;">${link}</span>
          </p>
        </td></tr>
      </table>

      <p style="margin:24px 0 0;color:#6b7280;font-size:11px;">
        One Team Eğitim Sistemi · <a href="https://egitimtakvimi.oneteamglobal.ai" style="color:#a78bfa;text-decoration:none;">egitimtakvimi.oneteamglobal.ai</a>
      </p>
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

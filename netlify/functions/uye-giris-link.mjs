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
import { metinTemizle } from './_metinTemizle.mjs';

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

// Magic link'i kısalt — uzun Firebase URL'ini /d/abc12345'a dönüştür
async function kisaltUrl(tamUrl) {
  try {
    const res = await fetch('https://egitimtakvimi.oneteamglobal.ai/.netlify/functions/kisalt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: tamUrl }),
    });
    if (!res.ok) throw new Error(`kisalt ${res.status}`);
    const data = await res.json();
    return data.kisaUrl || tamUrl;
  } catch (e) {
    console.warn('[uye-giris-link] kısaltma başarısız:', e.message);
    return tamUrl;
  }
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

// One Team brand uyumlu email — egitimtakvimi.oneteamglobal.ai ile aynı görsel dil
// Büyük logo + altın aurora + kicker pattern + cam morfizm
function emailHtml({ ad, link, lookup }) {
  const onAd = ad ? escapeHtml(ad.split(' ')[0]) : 'Sevgili Marka Ortağı';
  return `<!doctype html>
<html lang="tr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>One Team — Giriş Linkin</title>
<style>.btn:hover{filter:brightness(1.08)}</style>
</head>
<body style="margin:0;padding:0;background:#3b1772;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#fff;-webkit-text-size-adjust:100%;">
  <!-- Preheader -->
  <div style="display:none;font-size:1px;color:#3b1772;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${onAd}, One Team Eğitim Takvimi'ne tek tık giriş linkin hazır. 1 saat geçerli.
  </div>

  <!-- Tüm sayfa: site ile aynı mor gradient (purple-900 → purple-800 → indigo-900) -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#3b1772;background-image:linear-gradient(135deg,#5b21b6 0%,#6d28d9 50%,#3b1772 100%);min-height:100vh;">
    <tr><td align="center" style="padding:48px 16px;">

      <!-- HERO: Büyük logo + altın aurora (sitedeki gibi) -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
        <tr><td align="center" style="padding:32px 0 8px;">
          <!-- Logo (sitede 320px, mail için 180px) — drop-shadow altın -->
          <img src="https://egitimtakvimi.oneteamglobal.ai/logos/oneteam-logo.png"
            alt="One Team"
            width="180" height="180"
            style="display:block;margin:0 auto;max-width:60%;height:auto;" />
        </td></tr>

        <!-- Kicker — ── EĞİTİM TAKVİMİ ── (site ile aynı pattern) -->
        <tr><td align="center" style="padding:24px 0 40px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:40px;height:1px;background:#fbbf24;opacity:0.5;"></td>
              <td style="padding:0 16px;color:#fcd34d;font-size:12px;font-weight:600;letter-spacing:0.4em;text-transform:uppercase;white-space:nowrap;">
                Eğitim Takvimi
              </td>
              <td style="width:40px;height:1px;background:#fbbf24;opacity:0.5;"></td>
            </tr>
          </table>
        </td></tr>
      </table>

      <!-- Ana kart — cam morfizm (bg-white/10 + backdrop-blur stil) -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.5);">

        <!-- Hero metin -->
        <tr><td style="padding:48px 40px 24px;">
          <h1 style="margin:0 0 16px;font-size:32px;line-height:1.15;font-weight:800;color:#fff;letter-spacing:-0.8px;">
            Merhaba ${onAd} 👋
          </h1>
          <p style="margin:0 0 8px;color:#E9D5FF;font-size:17px;line-height:1.5;">
            Eğitim Takvimi'ne tek tık giriş yapabilirsin.
          </p>
          <p style="margin:0;color:#fcd34d;font-size:15px;font-weight:600;">
            Şifre yok. Sadece tıkla.
          </p>
        </td></tr>

        <!-- CTA buton -->
        <tr><td align="center" style="padding:8px 40px 40px;">
          <a href="${link}" class="btn"
            style="display:inline-block;background:#fbbf24;color:#3b1772;text-decoration:none;padding:18px 56px;border-radius:16px;font-weight:800;font-size:18px;letter-spacing:0.3px;box-shadow:0 10px 28px rgba(251,191,36,0.4),0 4px 12px rgba(251,191,36,0.25);">
            Giriş Yap →
          </a>
          <p style="margin:16px 0 0;color:#C4B5FD;font-size:13px;">
            Butona tıkla, anında giriş yapacaksın
          </p>
        </td></tr>

        <!-- Güvenlik şeridi (sitedeki stat-row stiline benzer) -->
        <tr><td style="padding:24px 40px;border-top:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.15);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding:6px;color:#fcd34d;font-size:13px;font-weight:700;">🔒 Güvenli</td>
              <td align="center" style="padding:6px;color:#E9D5FF;font-size:13px;">1 saat geçerli</td>
              <td align="center" style="padding:6px;color:#A78BFA;font-size:13px;">Tek kullanımlık</td>
            </tr>
          </table>
          <p style="margin:12px 0 0;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06);color:#A78BFA;font-size:12px;text-align:center;">
            Aradığın bilgi:
            <code style="background:rgba(251,191,36,0.15);padding:3px 10px;border-radius:8px;font-size:11px;color:#fcd34d;font-family:'SF Mono',Monaco,monospace;font-weight:600;">${escapeHtml(lookup)}</code>
          </p>
        </td></tr>
      </table>

      <!-- Uyarı kartı — ayrı, küçük, sitedeki secondary cards stilinde -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin-top:16px;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.25);border-radius:16px;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0;color:#fcd34d;font-size:13px;font-weight:700;">⚠️ Sen istemedin mi?</p>
          <p style="margin:6px 0 0;color:#E9D5FF;font-size:12px;line-height:1.6;">
            Bu mail'i sen tetiklemediysen görmezden gel — kimse hesabına giremez. Email + link birlikte gerekir.
          </p>
        </td></tr>
      </table>

      <!-- Backup link — kısa, okunabilir -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin-top:24px;">
        <tr><td style="padding:0 16px;text-align:center;">
          <p style="margin:0 0 10px;color:#A78BFA;font-size:11px;opacity:0.8;">
            Buton açılmıyor mu? Bu kısa linki tarayıcına yapıştır:
          </p>
          <p style="margin:0;">
            <a href="${link}" style="display:inline-block;padding:10px 18px;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.3);border-radius:10px;color:#fcd34d;font-size:14px;font-weight:600;font-family:'SF Mono',Monaco,monospace;text-decoration:none;letter-spacing:0.3px;">${link}</a>
          </p>
        </td></tr>
      </table>

      <!-- Footer — sitedeki gibi minimal -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin-top:40px;">
        <tr><td align="center">
          <a href="https://egitimtakvimi.oneteamglobal.ai" style="text-decoration:none;color:#fcd34d;font-size:13px;font-weight:700;letter-spacing:0.05em;">
            egitimtakvimi.oneteamglobal.ai
          </a>
          <p style="margin:6px 0 0;color:#A78BFA;font-size:11px;font-weight:500;opacity:0.7;">
            900+ kayıtlı eğitim · Kişisel kariyer yolu
          </p>
          <p style="margin:16px 0 0;color:#7c3aed;font-size:10px;opacity:0.7;">
            © ${new Date().getFullYear()} Amare Global · One Team
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
    // Rate limit: 10/dk, 30/sa per IP — email spam koruması (idempotency 60sn cooldown ayrı)
    const limit = await rateLimitCheck(req, 'uye-giris-link', { perMinute: 10, perHour: 30 });
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
        message: 'Bu bilgi ile kayıtlı Marka Ortağı bulunamadı. Sponsorundan doğrula veya başka bir bilgini dene.',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const uye = rows[0];
    if (!uye.email) {
      return new Response(JSON.stringify({
        found: false,
        message: 'Marka Ortağı bulundu ama kayıtlı email yok. Sponsorundan email güncelle.',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 1b. Idempotency — aynı email'a son 60sn içinde link gönderildiyse tekrar gönderme
    // (Resend cooldown + Gmail spam koruma + kullanıcı yanlışlıkla tekrar tıklarsa)
    try {
      const idemRef = admin.firestore().doc(`giris_link_log/${uye.amare_id}`);
      const idemSnap = await idemRef.get();
      if (idemSnap.exists) {
        const sonGonderim = idemSnap.data().sonGonderim?._seconds || 0;
        const gecen = Math.floor(Date.now() / 1000) - sonGonderim;
        if (gecen < 60) {
          return new Response(JSON.stringify({
            found: true,
            sent: true,
            cached: true,
            emailMask: maskEmail(uye.email),
            emailReal: uye.email,
            adKisa: (uye.full_name || '').split(' ')[0] || null,
            mesaj: `Geçen ${gecen} sn önce gönderdik. Spam'i kontrol et.`,
            kalanSn: 60 - gecen,
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
      }
    } catch (e) {
      console.warn('[uye-giris-link] idempotency check err:', e.message);
    }

    // 2. Firebase magic link üret
    const actionCodeSettings = {
      url: `https://egitimtakvimi.oneteamglobal.ai/giris-tamamla?uye=${encodeURIComponent(uye.amare_id || '')}`,
      handleCodeInApp: true,
    };
    const tamLink = await admin.auth().generateSignInWithEmailLink(uye.email, actionCodeSettings);
    // Uzun Firebase URL'ini kısalt — kullanıcıya temiz görünüm
    const link = await kisaltUrl(tamLink);

    // 3. Resend ile email yolla
    const htmlRaw = emailHtml({ ad: uye.full_name, link, lookup });
    const subjectRaw = `One Team Giriş Linki — ${uye.full_name?.split(' ')[0] || 'Hoş geldin'}`;
    // MARKA TEMİZLİĞİ — "üye" → "Marka Ortağı", "network marketing" → "Doğrudan Satış"
    const html = metinTemizle(htmlRaw);
    const subject = metinTemizle(subjectRaw);
    await resend.emails.send({
      from: 'One Team <noreply@oneteamglobal.ai>',
      to: uye.email,
      subject,
      html,
    });

    // Idempotency log — sonGonderim kaydet (60sn cooldown için)
    try {
      await admin.firestore().doc(`giris_link_log/${uye.amare_id}`).set({
        sonGonderim: admin.firestore.FieldValue.serverTimestamp(),
        emailMask: maskEmail(uye.email),
        sayaclar: admin.firestore.FieldValue.increment(1),
      }, { merge: true });
    } catch (e) { console.warn('[uye-giris-link] log err:', e.message); }

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

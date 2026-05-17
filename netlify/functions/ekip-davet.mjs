// netlify/functions/ekip-davet.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST /.netlify/functions/ekip-davet
//   Authorization: Bearer <Firebase ID Token>
//   Body: { amareIds: [...], sablon: "yeni"|"egitim"|"kontrol"|"custom", mesaj?, kanal: "email"|"whatsapp" }
//
// Sponsor → ekip üyelerine magic link gönderir (Resend) veya WhatsApp linkleri döner.
// Her gönderim Firestore'da loglanır → ekibim dashboard'unda "davet 3g önce" rozeti.
//
// Güvenlik:
//   - Sponsor'un sadece kendi ekibine davet gönderebilmesi için her amareId doğrulanır
//   - users/{sponsorUid}/davetler/{amareId} → log + idempotency (24sa içinde tekrar göndermez)
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
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// 4 hazır şablon — WhatsApp text + Email subject/body için kullanılır
// Emoji'ler sade ve evrensel tutuldu (eski WhatsApp font'larında render sorunu yaşamamak için)
//
// noLink şablonları → /profil?giris=1 yönlendirir → UyeGirisModal otomatik açılır
// Üye telefon veya Amare ID girer → backend uye-giris-link function'ı magic link mail atar
const MANUEL_GIRIS_URL = 'https://egitimtakvimi.oneteamglobal.ai/profil?giris=1';

const SABLONLAR = {
  yeni: {
    waText: (ad, link) => `Selam ${ad},\n\nOne Team Eğitim Takvimi'ne seni davet ediyorum. Tüm canlı eğitimler, kayıtlı videolar ve kariyer yoluna özel içerikler tek yerde.\n\nTek tık giriş linkin:\n${link}\n\nBirlikte büyüyelim.`,
    waTextNoLink: (ad) => `Selam ${ad},\n\nOne Team Eğitim Takvimi'ne seni davet ediyorum. Tüm canlı eğitimler, kayıtlı videolar ve kariyer yoluna özel içerikler tek yerde.\n\nGiriş için telefon numaranı veya Amare ID'ni gir:\n${MANUEL_GIRIS_URL}`,
    emailSubject: 'One Team Eğitim Takvimi — sana özel davet',
    emailHero: 'Eğitim takvimi seni bekliyor',
    emailBody: 'Tüm canlı eğitimler, kayıtlı videolar ve kariyer yoluna özel curriculum tek yerde. Şifre yok — bu link ile tek tık giriş yap.',
  },
  egitim: {
    waText: (ad, link) => `${ad}, bu hafta kaçırma!\n\nYeni eğitimler eklendi, takvimi göz at:\n${link}`,
    waTextNoLink: (ad) => `${ad}, bu hafta kaçırma!\n\nYeni eğitimler eklendi, takvimi göz at:\n${MANUEL_GIRIS_URL}`,
    emailSubject: 'Yeni eğitimler eklendi — One Team Takvimi',
    emailHero: 'Bu hafta yeni eğitimler',
    emailBody: 'Liderlik, satış, motivasyon — bu hafta katılabileceğin canlı eğitimleri ve yeni kayıtlı videoları görmek için tıkla.',
  },
  kontrol: {
    waText: (ad, link) => `${ad}, bir süredir görüşmedik.\n\nNasıl gidiyor? Sistemde kariyer planın seni bekliyor:\n${link}`,
    waTextNoLink: (ad) => `${ad}, bir süredir görüşmedik.\n\nNasıl gidiyor? Sisteme telefon numaranla giriş yap, kariyer planın seni bekliyor:\n${MANUEL_GIRIS_URL}`,
    emailSubject: 'Seni özledik — One Team',
    emailHero: 'Sana bir şey hatırlatmak istedim',
    emailBody: 'Bir süredir sistemde görmüyorum seni. Kariyer planın hâlâ aktif, eğitimler güncelleniyor. Bir bakış at, beraber yola devam edelim.',
  },
};

// Magic link'i kısalt — opsiyonel meta (sponsorUid, hedefAmareId) attach edilir
// Tıklanınca kisalt function bunları davetler/{amareId}'ye yazar (acildi:true)
async function kisaltUrl(tamUrl, meta = {}) {
  try {
    const res = await fetch('https://egitimtakvimi.oneteamglobal.ai/.netlify/functions/kisalt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: tamUrl, meta }),
    });
    if (!res.ok) throw new Error(`kisalt ${res.status}`);
    const data = await res.json();
    return data.kisaUrl || tamUrl;
  } catch (e) {
    console.warn('[ekip-davet] kısaltma başarısız, tam URL kullanılıyor:', e.message);
    return tamUrl;
  }
}

// E-posta maskele
function maskEmail(email) {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  const lh = local.length;
  const localMasked = lh <= 2 ? local[0] + '*' : local.slice(0, Math.min(2, lh - 2)) + '***';
  return `${localMasked}@${domain.slice(0, 1)}***${domain.slice(domain.lastIndexOf('.'))}`;
}

// Türkiye için phone normalize
function waPhone(p) {
  if (!p) return '';
  let d = String(p).replace(/\D/g, '');
  if (d.length === 11 && d[0] === '0') d = '90' + d.slice(1);
  else if (d.length === 10) d = '90' + d;
  return d;
}

async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

function emailHtml({ ad, link, sablon, sponsorAd }) {
  const s = SABLONLAR[sablon] || SABLONLAR.yeni;
  const onAd = escapeHtml((ad || 'Sevgili üye').split(' ')[0]);
  return `<!doctype html>
<html lang="tr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${s.emailSubject}</title>
<style>.btn:hover{filter:brightness(1.08)}</style>
</head>
<body style="margin:0;padding:0;background:#0F0823;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#fff;">
<div style="display:none;font-size:1px;color:#0F0823;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${onAd}, ${escapeHtml(s.emailHero)} — One Team Eğitim Takvimi</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0F0823;background-image:linear-gradient(180deg,#1a103d 0%,#0F0823 100%);min-height:100vh;">
<tr><td align="center" style="padding:32px 16px;">

<!-- Logo header -->
<table role="presentation" width="100%" style="max-width:560px;margin-bottom:24px;">
<tr><td align="center">
<img src="https://egitimtakvimi.oneteamglobal.ai/logos/oneteam-logo.png" alt="One Team" width="72" height="72" style="display:block;margin:0 auto 12px;border-radius:16px;background:rgba(255,255,255,0.05);padding:6px;" />
<div style="font-size:11px;color:#A78BFA;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">Eğitim Takvimi</div>
</td></tr>
</table>

<!-- Ana kart -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:linear-gradient(180deg,rgba(255,255,255,0.07) 0%,rgba(255,255,255,0.03) 100%);border:1px solid rgba(255,255,255,0.12);border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.45);">
<tr><td style="height:4px;background:linear-gradient(90deg,#FBBF24 0%,#F59E0B 50%,#FBBF24 100%);"></td></tr>

<tr><td style="padding:40px 36px 16px;">
<div style="font-size:28px;line-height:1.2;font-weight:800;color:#fff;letter-spacing:-0.5px;margin:0 0 12px;">Merhaba ${onAd} 👋</div>
<p style="margin:0 0 16px;color:#FBBF24;font-size:14px;font-weight:700;letter-spacing:0.2px;">${escapeHtml(s.emailHero)}</p>
<p style="margin:0;color:#D1D5DB;font-size:16px;line-height:1.65;">${escapeHtml(s.emailBody)}</p>
${sponsorAd ? `<p style="margin:20px 0 0;padding:12px 16px;background:rgba(167,139,250,0.08);border-left:3px solid #A78BFA;border-radius:6px;color:#C4B5FD;font-size:13px;font-style:italic;">Sponsorun: <strong style="color:#fff;">${escapeHtml(sponsorAd)}</strong></p>` : ''}
</td></tr>

<tr><td align="center" style="padding:24px 36px 32px;">
<a href="${link}" class="btn" style="display:inline-block;background:linear-gradient(135deg,#FBBF24 0%,#F59E0B 100%);color:#0F0823;text-decoration:none;padding:16px 48px;border-radius:14px;font-weight:800;font-size:17px;letter-spacing:0.3px;box-shadow:0 8px 24px rgba(251,191,36,0.35),inset 0 1px 0 rgba(255,255,255,0.3);">Giriş Yap →</a>
<p style="margin:14px 0 0;color:#6B7280;font-size:12px;">Şifre yok — tek tıkla giriş</p>
</td></tr>

<tr><td style="padding:24px 36px;border-top:1px solid rgba(255,255,255,0.08);background:rgba(0,0,0,0.15);">
<p style="margin:0;color:#D1D5DB;font-size:13px;">
<span style="color:#FBBF24;font-weight:700;">🔒 Güvenli</span> &nbsp;·&nbsp;
<span style="color:#A78BFA;">1 saat geçerli</span> &nbsp;·&nbsp;
<span style="color:#9CA3AF;">Tek kullanımlık</span>
</p>
</td></tr>

<tr><td style="padding:20px 36px 32px;">
<div style="background:rgba(251,191,36,0.08);border-left:3px solid #F59E0B;border-radius:6px;padding:12px 14px;">
<p style="margin:0;color:#FBBF24;font-size:12px;font-weight:600;">⚠️ Sen istemedin mi?</p>
<p style="margin:4px 0 0;color:#D1D5DB;font-size:12px;line-height:1.5;">Bu mail'i sen tetiklemediysen görmezden gel — kimse hesabına giremez.</p>
</div>
</td></tr>

<tr><td style="padding:0 36px 28px;">
<p style="margin:0 0 6px;color:#6B7280;font-size:11px;text-align:center;">Bağlantı çalışmıyorsa şunu tarayıcına kopyala:</p>
<p style="margin:0;padding:8px;background:rgba(0,0,0,0.3);border-radius:6px;text-align:center;">
<a href="${link}" style="color:#A78BFA;word-break:break-all;font-size:10px;font-family:'SF Mono',Monaco,monospace;text-decoration:none;">${link}</a>
</p>
</td></tr>
</table>

<!-- Footer -->
<table role="presentation" width="100%" style="max-width:560px;margin-top:24px;">
<tr><td align="center" style="padding:16px 0;">
<p style="margin:0 0 6px;color:#6B7280;font-size:12px;font-weight:600;">One Team Eğitim Sistemi</p>
<p style="margin:0 0 14px;color:#4B5563;font-size:11px;">900+ kayıtlı eğitim · Kişisel kariyer yolu · Sponsor dashboard</p>
<p style="margin:0;"><a href="https://egitimtakvimi.oneteamglobal.ai" style="color:#A78BFA;text-decoration:none;font-size:11px;font-weight:600;">egitimtakvimi.oneteamglobal.ai</a></p>
</td></tr>
<tr><td align="center" style="padding-top:8px;">
<p style="margin:0;color:#374151;font-size:10px;">© ${new Date().getFullYear()} Amare Global / One Team</p>
</td></tr>
</table>

</td></tr></table>
</body></html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), {
    status: 405, headers: { 'Content-Type': 'application/json', ...CORS },
  });

  try {
    // 1. Bearer token
    const auth = req.headers.get('authorization') || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return new Response(JSON.stringify({ error: 'Token gerekli' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
    });

    let decoded;
    try { decoded = await admin.auth().verifyIdToken(m[1]); }
    catch { return new Response(JSON.stringify({ error: 'Geçersiz token' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
    }); }
    const sponsorUid = decoded.uid;

    // 2. Body
    const body = await req.json();
    const amareIds = Array.isArray(body.amareIds) ? body.amareIds.map(String).slice(0, 100) : [];
    const sablon = SABLONLAR[body.sablon] ? body.sablon : 'yeni';
    const kanal = ['email', 'whatsapp', 'both'].includes(body.kanal) ? body.kanal : 'both';
    const customMesaj = body.mesaj ? String(body.mesaj).slice(0, 1000) : null;

    if (amareIds.length === 0) return new Response(JSON.stringify({ error: 'amareIds boş' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
    });

    // 3. Sponsor'un kendi amareId'sini al
    const sponsorDoc = await admin.firestore().doc(`users/${sponsorUid}`).get();
    if (!sponsorDoc.exists) return new Response(JSON.stringify({ error: 'Sponsor profili yok' }), {
      status: 404, headers: { 'Content-Type': 'application/json', ...CORS },
    });
    const sponsorAmareId = String(sponsorDoc.data().amareId || '');
    const sponsorAd = sponsorDoc.data().displayName || sponsorDoc.data().adSoyad || '';
    if (!sponsorAmareId) return new Response(JSON.stringify({ error: 'Sponsor amare ID bağlı değil' }), {
      status: 404, headers: { 'Content-Type': 'application/json', ...CORS },
    });

    // 4. Hedef üyeleri Supabase'den çek + sponsorluk doğrula
    const idsParam = amareIds.map(id => `"${id}"`).join(',');
    const hedefRows = await supabaseGet(
      `amare_raw_members?select=amare_id,full_name,email,phone,enroller_amare_id,sponsor_amare_id&` +
      `amare_id=in.(${idsParam})`
    );

    const hedefMap = {};
    hedefRows.forEach(r => {
      // Güvenlik: sadece kendi ekibindekiler
      if (String(r.enroller_amare_id) === sponsorAmareId || String(r.sponsor_amare_id) === sponsorAmareId) {
        hedefMap[String(r.amare_id)] = r;
      }
    });

    // 5. Idempotency: son 4 saat içinde gönderilenleri filtrele
    const dortSaatOnce = Date.now() - 4 * 60 * 60 * 1000;
    const davetlerRef = admin.firestore().collection(`users/${sponsorUid}/davetler`);

    const sonuc = [];
    for (const aId of amareIds) {
      const hedef = hedefMap[aId];
      if (!hedef) {
        sonuc.push({ amareId: aId, durum: 'skip', sebep: 'Bu üye senin ekibinde değil' });
        continue;
      }

      // Son davet kontrolü
      try {
        const lastDavet = await davetlerRef.doc(aId).get();
        if (lastDavet.exists) {
          const sonGonderim = lastDavet.data().sonGonderim?._seconds || 0;
          if (sonGonderim * 1000 > dortSaatOnce) {
            sonuc.push({ amareId: aId, durum: 'skip', sebep: 'Son 4 saat içinde zaten gönderildi' });
            continue;
          }
        }
      } catch {}

      const baslangic = { amareId: aId, ad: hedef.full_name, kanallar: [] };
      let magicLink = null;

      // Email kanalı
      if ((kanal === 'email' || kanal === 'both') && hedef.email) {
        try {
          const actionCodeSettings = {
            url: `https://egitimtakvimi.oneteamglobal.ai/giris-tamamla?uye=${encodeURIComponent(aId)}&kaynak=davet`,
            handleCodeInApp: true,
          };
          magicLink = await admin.auth().generateSignInWithEmailLink(hedef.email, actionCodeSettings);
          // Email içinde de kısaltılmış link kullan (daha temiz görünüm)
          const linkEmail = await kisaltUrl(magicLink, { sponsorUid, hedefAmareId: aId });
          const html = emailHtml({ ad: hedef.full_name, link: linkEmail, sablon, sponsorAd });
          await resend.emails.send({
            from: 'One Team <noreply@oneteamglobal.ai>',
            to: hedef.email,
            subject: SABLONLAR[sablon].emailSubject,
            html,
          });
          baslangic.kanallar.push({ tip: 'email', durum: 'gonderildi', emailMask: maskEmail(hedef.email) });
        } catch (e) {
          baslangic.kanallar.push({ tip: 'email', durum: 'hata', sebep: e.message.slice(0, 100) });
        }
      } else if (kanal === 'email' || kanal === 'both') {
        baslangic.kanallar.push({ tip: 'email', durum: 'atlandi', sebep: 'Email kayıtlı değil' });
      }

      // WhatsApp kanalı — link döner, açma client-side
      if ((kanal === 'whatsapp' || kanal === 'both') && hedef.phone) {
        const wa = waPhone(hedef.phone);
        if (wa) {
          // Magic link varsa kısalt — uzun Firebase URL'i okunmaz, kısa /d/abc12345 daha temiz
          const linkVer = magicLink ? await kisaltUrl(magicLink, { sponsorUid, hedefAmareId: aId }) : 'https://egitimtakvimi.oneteamglobal.ai';
          const text = customMesaj
            ? customMesaj.replace(/\{ad\}/gi, (hedef.full_name || '').split(' ')[0])
                         .replace(/\{link\}/gi, linkVer)
            : (magicLink ? SABLONLAR[sablon].waText : SABLONLAR[sablon].waTextNoLink)(
                (hedef.full_name || 'merhaba').split(' ')[0],
                linkVer
              );
          baslangic.kanallar.push({
            tip: 'whatsapp',
            durum: 'hazir',
            url: `https://wa.me/${wa}?text=${encodeURIComponent(text)}`,
            kisaUrl: magicLink ? linkVer : null,
          });
        }
      }

      // Firestore log
      try {
        await davetlerRef.doc(aId).set({
          amareId: aId,
          ad: hedef.full_name,
          sablon,
          kanal,
          sonGonderim: admin.firestore.FieldValue.serverTimestamp(),
          sayaclar: admin.firestore.FieldValue.increment ? admin.firestore.FieldValue.increment(1) : 1,
        }, { merge: true });
      } catch (e) {
        console.warn('[ekip-davet] firestore log err:', e.message);
      }

      baslangic.durum = baslangic.kanallar.some(k => k.durum === 'gonderildi' || k.durum === 'hazir') ? 'ok' : 'fail';
      sonuc.push(baslangic);
    }

    const ozet = {
      toplam: sonuc.length,
      basarili: sonuc.filter(s => s.durum === 'ok').length,
      atlanan: sonuc.filter(s => s.durum === 'skip').length,
      hata: sonuc.filter(s => s.durum === 'fail').length,
    };

    return new Response(JSON.stringify({ ozet, sonuc }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    });

  } catch (err) {
    console.error('[ekip-davet] hata:', err.message, err.stack);
    return new Response(JSON.stringify({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
};

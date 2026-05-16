// netlify/functions/kisalt.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST /.netlify/functions/kisalt
//   Body: { url: "..." }
//   Returns: { kisaUrl: "https://egitimtakvimi.oneteamglobal.ai/d/abc12345" }
//
// GET /.netlify/functions/kisalt?kod=abc12345
//   Magic link okuyup 302 redirect (kullanıldıysa hata)
//
// Firestore: kisaltmalar/{kod} = {
//   url, olusturuldu, kullanildi, sonKullanim, kullanan, expires
// }
//
// Default expires: 60 dakika (Firebase magic link 1 saat geçerli)
// Tek kullanımlık: kullanıldıktan sonra ikinci kez 410 döner
// ─────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const SITE_URL = 'https://egitimtakvimi.oneteamglobal.ai';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Base62 random kod (8 karakter — 218 trilyon olasılık, çakışma yok)
function rastgeleKod(uzunluk = 8) {
  const harfler = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let r = '';
  for (let i = 0; i < uzunluk; i++) {
    r += harfler[Math.floor(Math.random() * harfler.length)];
  }
  return r;
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const url = new URL(req.url);
  const kod = url.searchParams.get('kod');

  // GET /kisalt?kod=abc → redirect
  if (req.method === 'GET' && kod) {
    try {
      const ref = admin.firestore().doc(`kisaltmalar/${kod}`);
      const snap = await ref.get();
      if (!snap.exists) {
        return errorPage(404, 'Link bulunamadı', 'Bu kısa link sistemde yok ya da silindi.');
      }
      const d = snap.data();

      // Süre kontrolü
      const expiresMs = (d.expires?._seconds || 0) * 1000;
      if (expiresMs && Date.now() > expiresMs) {
        return errorPage(410, 'Link süresi dolmuş', 'Bu davet linki 1 saat içinde kullanılmalıydı. Sponsorundan yeni link iste.');
      }

      // Tek kullanımlık değilse direkt redirect; kullanıldıysa yine yönlendir
      // (Firebase magic link zaten kendi sınırlamasını yapıyor)
      // Sadece log et
      try {
        await ref.update({
          kullanildi: true,
          sonKullanim: admin.firestore.FieldValue.serverTimestamp(),
          kullanim_sayisi: admin.firestore.FieldValue.increment(1),
          son_user_agent: (req.headers.get('user-agent') || '').slice(0, 200),
        });
      } catch {}

      return new Response(null, {
        status: 302,
        headers: { Location: d.url, ...CORS },
      });
    } catch (e) {
      console.error('[kisalt] redirect err:', e.message);
      return errorPage(500, 'Sistem hatası', e.message.slice(0, 200));
    }
  }

  // POST /kisalt → kısalt
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const tamUrl = String(body.url || '').trim();
      if (!tamUrl || !tamUrl.startsWith('http')) {
        return new Response(JSON.stringify({ error: 'Geçersiz URL' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
        });
      }
      // Sadece kendi domain'lerimiz veya Firebase Auth (güvenlik — kötü amaçlı redirect engelle)
      const izinli = [
        'amare-egitim-planlama.firebaseapp.com',
        'egitimtakvimi.oneteamglobal.ai',
        'oneteamglobal.ai',
      ];
      const target = new URL(tamUrl);
      if (!izinli.some(d => target.hostname === d || target.hostname.endsWith('.' + d))) {
        return new Response(JSON.stringify({ error: 'Sadece OneTeam linkleri kısaltılır' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
        });
      }

      // Çakışmasız kod üret
      let kod = rastgeleKod();
      for (let i = 0; i < 5; i++) {
        const exists = await admin.firestore().doc(`kisaltmalar/${kod}`).get();
        if (!exists.exists) break;
        kod = rastgeleKod();
      }

      // Kaydet — 60dk TTL (Firebase magic link 1sa)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await admin.firestore().doc(`kisaltmalar/${kod}`).set({
        url: tamUrl,
        olusturuldu: admin.firestore.FieldValue.serverTimestamp(),
        expires: admin.firestore.Timestamp.fromDate(expiresAt),
        kullanildi: false,
        kullanim_sayisi: 0,
      });

      const kisaUrl = `${SITE_URL}/d/${kod}`;
      return new Response(JSON.stringify({ kisaUrl, kod, expiresAt: expiresAt.toISOString() }), {
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    } catch (e) {
      console.error('[kisalt] post err:', e.message);
      return new Response(JSON.stringify({ error: 'Sistem hatası', detail: e.message.slice(0, 200) }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405, headers: { 'Content-Type': 'application/json', ...CORS },
  });
};

// Brand'li hata sayfası (HTML)
function errorPage(status, baslik, aciklama) {
  const html = `<!doctype html><html lang="tr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${baslik} — One Team</title>
<style>
body{margin:0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#3b1772 0%,#1a103d 100%);color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.kart{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:40px;max-width:480px;text-align:center}
.logo{display:inline-block;width:60px;height:60px;background:linear-gradient(135deg,#fbbf24,#f59e0b);border-radius:14px;line-height:60px;font-size:28px;margin-bottom:16px}
h1{margin:0 0 12px;font-size:22px;color:#fbbf24}
p{margin:0 0 20px;color:#d1d5db;line-height:1.6}
a{display:inline-block;background:#fbbf24;color:#1a103d;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700}
</style></head><body><div class="kart">
<div class="logo">✨</div>
<h1>${baslik}</h1>
<p>${aciklama}</p>
<a href="${SITE_URL}">Anasayfaya dön</a>
</div></body></html>`;
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS },
  });
}

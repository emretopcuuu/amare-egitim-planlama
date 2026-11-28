// netlify/functions/uye-giris-kod-dogrula.mjs
// ─────────────────────────────────────────────────────────────────────────
// POST { girisJetonu: string, kod: string (6 hane) }   ← yeni (KVKK O8)
// POST { email: string, kod: string }                  ← eski istemciler (geriye uyum)
// POST { islem: 'link-email', linkJetonu: string }     ← /giris-tamamla
//
// KVKK O8: uye-giris-link artık tam email döndürmez. İstemci elindeki opak
// girisJetonu ile kodu doğrular; email sunucuda giris_otp dokümanından okunur.
// Maildeki linkin ?gt= jetonu (yalnız posta kutusu sahibinde) email'e çevrilir
// çünkü Firebase signInWithEmailLink email ister.
//
// 1. Firestore giris_otp koleksiyonunda email + kod eşleşmesi ara
// 2. Süre dolmuş mu, kullanılmış mı, 5 yanlış deneme aşıldı mı kontrol et
// 3. Geçerliyse: Firebase Admin → createCustomToken(uid)
// 4. Frontend signInWithCustomToken ile login eder
//
// Güvenlik:
//   - Aynı email için 5 yanlış kod = doc kilitlenir, yeni kod istenmesi gerek
//   - Rate limit: 20 deneme/dk per IP (brute-force koruma)
// ─────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';
import { rateLimitCheck, rateLimitResponse } from './_rateLimit.mjs';
import { hashOtp, safeEqual } from './_otpHash.mjs';
import { jetonGecerliBicim, jetonHash } from './_girisToken.mjs';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const MAX_DENEME = 5;
const JSON_H = { 'Content-Type': 'application/json' };
const GENEL_HATA = 'Kod yanlış veya süresi dolmuş. Yeniden iste.';

function zamanMs(t) {
  if (!t) return 0;
  if (typeof t.toMillis === 'function') return t.toMillis();
  return ((t._seconds ?? t.seconds) || 0) * 1000;
}

// Maildeki linkin jetonu → email. Yalnız link sahibi bu jetona sahip.
async function linkEmailCoz(db, linkJetonu) {
  if (!jetonGecerliBicim(linkJetonu)) return null;
  const snap = await db.collection('giris_otp')
    .where('linkJetonHash', '==', jetonHash(linkJetonu))
    .limit(1)
    .get();
  if (snap.empty) return null;
  const d = snap.docs[0].data();
  if (zamanMs(d.linkJetonSon) < Date.now()) return null;
  return d.email || null;
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Rate limit: brute force koruması (20/dk per IP)
    const limit = await rateLimitCheck(req, 'uye-giris-kod', { perMinute: 20, perHour: 200 });
    if (!limit.ok) return rateLimitResponse(limit);

    const body = await req.json();
    const db = admin.firestore();

    // ── Link tamamlama: maildeki ?gt= jetonu → email ──
    if (body.islem === 'link-email') {
      const email = await linkEmailCoz(db, String(body.linkJetonu || ''));
      if (!email) {
        return new Response(JSON.stringify({ ok: false, error: 'Link süresi dolmuş veya geçersiz.' }), {
          status: 404, headers: JSON_H,
        });
      }
      return new Response(JSON.stringify({ ok: true, email }), {
        status: 200, headers: { ...JSON_H, 'Cache-Control': 'no-store' },
      });
    }

    const kod = String(body.kod || '').replace(/\D/g, ''); // sadece sayı bırak
    const girisJetonu = String(body.girisJetonu || '');
    if (kod.length !== 6) {
      return new Response(JSON.stringify({ ok: false, error: '6 haneli kod gir' }), {
        status: 400, headers: JSON_H,
      });
    }

    let email = '';
    let snapDocs = [];
    if (girisJetonu) {
      // Yeni yol: jeton tek bir OTP dokümanını gösterir, email oradan gelir
      if (!jetonGecerliBicim(girisJetonu)) {
        return new Response(JSON.stringify({ ok: false, error: GENEL_HATA }), { status: 401, headers: JSON_H });
      }
      const jsnap = await db.collection('giris_otp')
        .where('istemciJetonHashleri', 'array-contains', jetonHash(girisJetonu))
        .limit(1)
        .get();
      const jd = jsnap.empty ? null : jsnap.docs[0].data();
      if (!jd || jd.kullanildi || zamanMs(jd.istemciJetonSon) < Date.now()) {
        return new Response(JSON.stringify({ ok: false, error: GENEL_HATA }), { status: 401, headers: JSON_H });
      }
      email = String(jd.email || '').trim().toLowerCase();
      snapDocs = jsnap.docs;
    } else {
      // Eski istemci (önbellekteki eski paket): email + kod
      email = String(body.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) {
        return new Response(JSON.stringify({ ok: false, error: 'Email gerekli' }), {
          status: 400, headers: JSON_H,
        });
      }
      // Email'e ait, kullanılmamış OTP doc'larını ara — composite index'siz çalışır
      // (where eşitlikleri otomatik index'lenir; orderBy eklemiyoruz, server-side sıralarız)
      const snap = await db.collection('giris_otp')
        .where('email', '==', email)
        .where('kullanildi', '==', false)
        .limit(20)
        .get();
      snapDocs = snap.docs;
    }

    // En yeniden eskiye sırala (client/server tarafı)
    snapDocs.sort((a, b) => zamanMs(b.data().olusturulma) - zamanMs(a.data().olusturulma));

    // Email enumeration koruması: "kod yok" demeyiz — sızıntı yapar
    // Aynı generic hata mesajı, attacker email'in sistemde olup olmadığını anlayamaz
    if (snapDocs.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: GENEL_HATA }), { status: 401, headers: JSON_H });
    }

    // Gelen kodu hash'le, doc'taki hash ile constant-time karşılaştır
    const gelenHash = hashOtp(kod, email);

    // Doğru kod hangi doc'ta?
    let dogruDoc = null;
    let kontrolEdilenler = [];
    for (const d of snapDocs) {
      const data = d.data();
      // Süresi geçmiş mi?
      if (data.sonGecerlilik && data.sonGecerlilik.toMillis() < Date.now()) continue;
      // Max denemeden fazla mı?
      if ((data.denemeSayisi || 0) >= MAX_DENEME) {
        kontrolEdilenler.push({ id: d.id, durum: 'kilit' });
        continue;
      }
      kontrolEdilenler.push({ id: d.id, durum: 'aktif', ref: d.ref, data });
      // Hash karşılaştırma — backward-compat: eski "kod" plain text doc'ları için fallback
      const storedHash = data.kodHash || (data.kod ? hashOtp(data.kod, email) : null);
      if (storedHash && safeEqual(gelenHash, storedHash)) {
        dogruDoc = { ref: d.ref, data };
        break;
      }
    }

    // Eşleşme yoksa: aktif olan TÜM doc'ların denemeSayisini arttır
    if (!dogruDoc) {
      for (const k of kontrolEdilenler) {
        if (k.durum === 'aktif') {
          await k.ref.update({
            denemeSayisi: admin.firestore.FieldValue.increment(1),
            sonDeneme: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
      // Email enumeration koruması: "kilit" durumu da sızıntı yapar
      // ("bu email var ve kilitli" diye attacker anlar). Hep aynı mesaj.
      return new Response(JSON.stringify({
        ok: false,
        error: 'Kod yanlış veya süresi dolmuş. Yeniden iste.',
      }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // Doğru kod! → kullanıldı işaretle + custom token üret
    await dogruDoc.ref.update({
      kullanildi: true,
      kullanimAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Firebase user'ı bul/oluştur
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
    } catch (e) {
      // Yoksa oluştur
      user = await admin.auth().createUser({
        email,
        emailVerified: true,
      });
    }

    // users/{uid} doc'una amareId + giriş bilgisi yaz (magic link callback ile uyumlu)
    // Bu olmadan profil sayfası 'Amare ID bağlı değil' der
    const amareId = dogruDoc.data.amareId || null;
    try {
      const profilRef = db.doc(`users/${user.uid}`);
      const mevcut = await profilRef.get();
      const guncelleme = {
        email,
        sonGiris: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (amareId) guncelleme.amareId = amareId;
      if (!mevcut.exists) guncelleme.ilkGiris = admin.firestore.FieldValue.serverTimestamp();
      await profilRef.set(guncelleme, { merge: true });
    } catch (e) {
      console.warn('[uye-giris-kod-dogrula] users doc yazma hatası:', e.message);
    }

    // Custom token üret — frontend signInWithCustomToken ile login yapar
    const customToken = await admin.auth().createCustomToken(user.uid, {
      amareId,
      girisYolu: 'otp',
    });

    // email cevaba girmez — istemcinin ihtiyacı yok (KVKK O8)
    return new Response(JSON.stringify({
      ok: true,
      customToken,
    }), { status: 200, headers: JSON_H });

  } catch (err) {
    console.error('[uye-giris-kod-dogrula] hata:', err.message, err.stack);
    return new Response(JSON.stringify({
      ok: false,
      error: 'Sistem hatası. Birazdan tekrar dene.',
      detail: err.message.slice(0, 200),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

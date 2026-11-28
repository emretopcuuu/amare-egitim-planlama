// netlify/functions/yorum-bildir.mjs   (Auth: Firebase ID token, Bearer)
// ─────────────────────────────────────────────────────────────────────────
// Video yorumu bildirme + yönetici moderasyonu (mağaza O3 — Apple 1.2:
// kullanıcı içeriğinde bildir + engelle + yöneticinin zamanında müdahalesi).
//
// POST { islem: 'bildir', vimeoId, yorumId, sebep? }      ← giriş yapmış üye
//   → yorum_bildirimleri/{vimeoId}_{yorumId}_{uid} (kişi başı tek kayıt)
//   → aynı yoruma 3 farklı kişi bildirince yorum `gizli: true` olur (yönetici
//     bakana kadar herkesten gizlenir)
// POST { islem: 'liste', durum? }                          ← yönetici
// POST { islem: 'karar', id, karar: 'sil' | 'yoksay' }     ← yönetici
//
// Yazma admin SDK ile → firestore.rules değişikliği/deploy'u GEREKMEZ.
// yorum_bildirimleri kuralı: istemciye kapalı (allow read, write: if false).
// ─────────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';
import { isAdminToken } from './_adminEmails.mjs';
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

const OTO_GIZLE_ESIGI = 3;
const ID_DESENI = /^[A-Za-z0-9_-]{1,128}$/;

const jr = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

const yoneticiMi = (decoded) => decoded?.admin === true || isAdminToken(decoded);

function zamanIso(t) {
  try { return t?.toDate ? t.toDate().toISOString() : null; } catch { return null; }
}

export default async (req) => {
  if (req.method !== 'POST') return jr({ error: 'POST only' }, 405);

  const m = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!m) return jr({ error: 'Giriş gerekli' }, 401);
  let decoded;
  try { decoded = await admin.auth().verifyIdToken(m[1]); } catch { return jr({ error: 'Geçersiz oturum' }, 401); }

  let body;
  try { body = await req.json(); } catch { return jr({ error: 'Geçersiz gövde' }, 400); }
  const db = admin.firestore();

  // ── Üye: yorumu bildir ──
  if (body.islem === 'bildir') {
    if (decoded.firebase?.sign_in_provider === 'anonymous') return jr({ error: 'Giriş gerekli' }, 401);
    const limit = await rateLimitCheck(req, 'yorum-bildir', { perMinute: 10, perHour: 60 });
    if (!limit.ok) return rateLimitResponse(limit);

    const vimeoId = String(body.vimeoId || '');
    const yorumId = String(body.yorumId || '');
    if (!ID_DESENI.test(vimeoId) || !ID_DESENI.test(yorumId)) return jr({ error: 'Geçersiz yorum' }, 400);
    const sebep = String(body.sebep || '').trim().slice(0, 300);

    const yorumRef = db.doc(`kayitli_egitimler/${vimeoId}/yorumlar/${yorumId}`);
    const yorumSnap = await yorumRef.get();
    if (!yorumSnap.exists) return jr({ error: 'Yorum bulunamadı' }, 404);
    const y = yorumSnap.data();
    if (y.uid === decoded.uid) return jr({ error: 'Kendi yorumunu bildiremezsin' }, 400);

    const bildirimId = `${vimeoId}_${yorumId}_${decoded.uid}`;
    const bRef = db.doc(`yorum_bildirimleri/${bildirimId}`);
    const yeniMi = !(await bRef.get()).exists;
    await bRef.set({
      vimeoId,
      yorumId,
      // Yorum silinse bile yönetici neyin bildirildiğini görebilsin diye kopya
      yorumMetin: String(y.metin || '').slice(0, 1000),
      yorumUid: y.uid || null,
      yorumAd: y.ad || null,
      bildirenUid: decoded.uid,
      sebep,
      durum: 'beklemede',
      tarih: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    if (yeniMi) {
      const sayi = (y.bildirimSayisi || 0) + 1;
      const guncel = { bildirimSayisi: admin.firestore.FieldValue.increment(1) };
      if (sayi >= OTO_GIZLE_ESIGI) guncel.gizli = true;
      await yorumRef.update(guncel);
    }
    return jr({ ok: true });
  }

  // ── Yönetici işlemleri ──
  if (!yoneticiMi(decoded)) return jr({ error: 'Yönetici yetkisi yok' }, 403);

  if (body.islem === 'liste') {
    const durum = ['beklemede', 'silindi', 'yoksayildi'].includes(body.durum) ? body.durum : 'beklemede';
    const snap = await db.collection('yorum_bildirimleri')
      .where('durum', '==', durum)
      .limit(200)
      .get();
    const kayitlar = snap.docs.map(d => {
      const v = d.data();
      return {
        id: d.id,
        vimeoId: v.vimeoId, yorumId: v.yorumId,
        yorumMetin: v.yorumMetin, yorumAd: v.yorumAd, yorumUid: v.yorumUid,
        sebep: v.sebep, durum: v.durum,
        tarih: zamanIso(v.tarih), kararTarih: zamanIso(v.kararTarih),
      };
    }).sort((a, b) => String(b.tarih || '').localeCompare(String(a.tarih || '')));
    return jr({ ok: true, kayitlar });
  }

  if (body.islem === 'karar') {
    const id = String(body.id || '');
    const karar = body.karar;
    if (!id || !['sil', 'yoksay'].includes(karar)) return jr({ error: 'Geçersiz karar' }, 400);
    const bSnap = await db.doc(`yorum_bildirimleri/${id}`).get();
    if (!bSnap.exists) return jr({ error: 'Bildirim bulunamadı' }, 404);
    const { vimeoId, yorumId } = bSnap.data();
    const yorumRef = db.doc(`kayitli_egitimler/${vimeoId}/yorumlar/${yorumId}`);

    if (karar === 'sil') {
      await yorumRef.delete().catch(() => {});
    } else {
      await yorumRef.update({ gizli: false }).catch(() => {});
    }
    // Aynı yoruma ait bütün bildirimleri kapat
    const ayni = await db.collection('yorum_bildirimleri')
      .where('yorumId', '==', yorumId)
      .limit(100)
      .get();
    const batch = db.batch();
    ayni.docs.filter(d => d.data().vimeoId === vimeoId).forEach(d => batch.update(d.ref, {
      durum: karar === 'sil' ? 'silindi' : 'yoksayildi',
      kararTarih: admin.firestore.FieldValue.serverTimestamp(),
      kararVeren: decoded.email || decoded.uid,
    }));
    await batch.commit();
    return jr({ ok: true });
  }

  return jr({ error: 'Bilinmeyen işlem' }, 400);
};

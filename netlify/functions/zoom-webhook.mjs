// Zoom Webhook alıcısı — "şu an içeride X kişi" CANLI sayacı.
//
// Zoom, Event Subscriptions açılınca her katılımcı giriş/çıkışında buraya
// anlık bildirim yollar:
//   meeting.participant_joined → takvimdeki eşleşen eğitimin canliKisi +1
//   meeting.participant_left   → canliKisi -1
//   meeting.ended              → canliKisi = 0 (sıfırla)
//
// Eşleştirme: payload'daki meeting ID → BUGÜNÜN takvimindeki aynı Zoom ID'li,
// başlangıç saati şu ana en yakın eğitim (aynı salon gün içinde çok eğitimde kullanılıyor).
//
// GÜVENLİK: Zoom her isteği x-zm-signature ile imzalar (HMAC-SHA256, secret token).
// İmza doğrulanmayan istek reddedilir. Ayrıca endpoint.url_validation challenge'ı
// cevaplanır (Zoom kurulumda bir kez yollar).
// ENV: ZOOM_WEBHOOK_SECRET (uygulamanın Feature sayfasındaki Secret Token).

import crypto from 'crypto';
import admin from 'firebase-admin';

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

const saatDk = (s) => { const [h = 0, m = 0] = String(s || '').split(':').map(n => parseInt(n, 10)); return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0); };

// Bugünün takviminde bu Zoom ID'li, şu ana en uygun eğitimi bul
async function egitimBul(db, meetingId) {
  const istNow = new Date(Date.now() + 3 * 3600 * 1000);
  const bugunStr = `${String(istNow.getUTCDate()).padStart(2, '0')}.${String(istNow.getUTCMonth() + 1).padStart(2, '0')}.${istNow.getUTCFullYear()}`;
  const simdiDk = istNow.getUTCHours() * 60 + istNow.getUTCMinutes();
  const snap = await db.collection('takvim').where('tarih', '==', bugunStr).get();
  let enIyi = null, enIyiFark = Infinity;
  snap.forEach(d => {
    const e = d.data();
    const m = (e.yer || '').match(/(\d[\d\s]{6,})/);
    if (!m || m[1].replace(/\s/g, '') !== String(meetingId)) return;
    const fark = Math.abs(saatDk(e.saat) - simdiDk);
    if (fark < enIyiFark) { enIyiFark = fark; enIyi = d.id; }
  });
  return enIyi;
}

export const handler = async (event) => {
  const secret = process.env.ZOOM_WEBHOOK_SECRET;
  if (!secret) return { statusCode: 200, body: 'webhook secret tanımsız' };
  const body = event.body || '';

  // İmza doğrulama (url_validation dahil her istekte gelir)
  const ts = event.headers?.['x-zm-request-timestamp'] || '';
  const imza = event.headers?.['x-zm-signature'] || '';
  const beklenen = 'v0=' + crypto.createHmac('sha256', secret).update(`v0:${ts}:${body}`).digest('hex');
  if (imza !== beklenen) return { statusCode: 401, body: 'imza geçersiz' };

  let payload;
  try { payload = JSON.parse(body); } catch { return { statusCode: 400, body: 'json' }; }

  // Zoom kurulum challenge'ı
  if (payload.event === 'endpoint.url_validation') {
    const plain = payload.payload?.plainToken || '';
    const enc = crypto.createHmac('sha256', secret).update(plain).digest('hex');
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plainToken: plain, encryptedToken: enc }) };
  }

  const meetingId = payload.payload?.object?.id;
  if (!meetingId) return { statusCode: 200, body: 'id yok' };

  const db = initFirebase();
  const egitimId = await egitimBul(db, meetingId);
  if (!egitimId) return { statusCode: 200, body: 'eşleşen eğitim yok' };
  const ref = db.collection('takvim').doc(egitimId);

  try {
    if (payload.event === 'meeting.participant_joined' || payload.event === 'meeting.participant_left') {
      // increment yerine clamp'li transaction: kaçan join eventleri (örn. secret
      // deploy'undan önceki 401'ler) sayacı NEGATİFE düşürüyordu (-23 vakası).
      const delta = payload.event === 'meeting.participant_joined' ? 1 : -1;
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const cur = Math.max(0, snap.data()?.canliKisi || 0);
        tx.set(ref, { canliKisi: Math.max(0, cur + delta) }, { merge: true });
      });
    } else if (payload.event === 'meeting.ended') {
      await ref.set({ canliKisi: 0 }, { merge: true });
    }
  } catch (e) { console.warn('[zoom-webhook]', e.message); }

  return { statusCode: 200, body: 'ok' };
};

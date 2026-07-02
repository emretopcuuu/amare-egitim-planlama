// Zoom GERÇEK katılım raporu (gece 02:30 Europe/Istanbul cron).
//
// Tıklama ≠ katılım. Bu fonksiyon Zoom'un kendi raporundan GERÇEĞİ çeker:
//   - dün (ve bugün erken saatte) BİTMİŞ online eğitimleri bulur (takvim)
//   - yer alanındaki Zoom meeting ID'sini çıkarır
//   - Zoom API: o meeting'in geçmiş oturumları → eğitim TARİHİYLE eşleşen oturum
//   - katılımcı raporu → kişi bazında birleştir (aynı kişi düşüp tekrar girer)
//   - takvim doc'una SADECE toplam yazar: zoomGercekKatilim, zoomOrtDakika
//     (kişi listesi/PII takvim'e YAZILMAZ — public okunabilir bir doc)
//
// GEREKSİNİM (Emre kurar): Zoom Server-to-Server OAuth app + Netlify env:
//   ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET
//   Scope'lar: report:read:admin + meeting:read:admin
// Env yoksa fonksiyon sessizce atlar (cron patlamaz) — anahtar eklenince kendiliğinden çalışır.
//
// Güvenlik: cron payload bypass; manuel tetik x-trigger-secret = RUTBE_TRIGGER_SECRET.

import admin from 'firebase-admin';

export const config = { schedule: '30 23 * * *' }; // 02:30 Istanbul (dünün eğitimleri kesin bitmiş olur)

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

const yetkiliMi = (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : null;
    if (body && (body.next_run || body.last_run)) return true;
  } catch {}
  const secret = process.env.RUTBE_TRIGGER_SECRET;
  return !!secret && event.headers?.['x-trigger-secret'] === secret;
};

// Zoom S2S OAuth token
async function zoomToken() {
  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;
  const basic = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`, {
    method: 'POST', headers: { Authorization: `Basic ${basic}` },
  });
  if (!res.ok) throw new Error(`zoom token ${res.status}`);
  return (await res.json()).access_token;
}

const zoomGet = async (token, path) => {
  const res = await fetch(`https://api.zoom.us/v2${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`zoom ${path.split('?')[0]} ${res.status}`);
  return res.json();
};

// UUID '/' veya '//' içerebilir → çift encode (Zoom API şartı)
const encUUID = (u) => encodeURIComponent(encodeURIComponent(u));

const parseTarih = (t) => {
  const p = String(t || '').split('.').map(Number);
  if (p.length !== 3 || p.some(isNaN)) return null;
  const d = new Date(p[2], p[1] - 1, p[0]);
  return isNaN(d.getTime()) ? null : d;
};
const ayniGunMu = (isoStr, gun) => {
  // Zoom start_time UTC ISO; İstanbul gününe çevirip kıyasla (±1 gün toleransla eşleşen en yakını zaten seçiyoruz)
  const d = new Date(isoStr);
  const ist = new Date(d.getTime() + 3 * 3600 * 1000); // UTC+3
  return ist.getUTCFullYear() === gun.getFullYear() && ist.getUTCMonth() === gun.getMonth() && ist.getUTCDate() === gun.getDate();
};

export const handler = async (event) => {
  if (!yetkiliMi(event)) return { statusCode: 403, body: 'forbidden' };

  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;
  if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    console.log('[zoom-rapor] Zoom env eksik — atlanıyor (kurulum bekleniyor)');
    return { statusCode: 200, body: 'zoom env eksik, atlandı' };
  }

  const db = initFirebase();
  // Dün + bugün (erken biten) online eğitimler
  const simdi = new Date(); const istNow = new Date(simdi.getTime() + 3 * 3600 * 1000);
  const bugun = new Date(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate());
  const dun = new Date(bugun); dun.setDate(bugun.getDate() - 1);
  const fmt = (d) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  const hedefTarihler = new Set([fmt(dun), fmt(bugun)]);

  const snap = await db.collection('takvim').get();
  const adaylar = [];
  snap.forEach(d => {
    const e = d.data();
    if (!hedefTarihler.has(e.tarih)) return;
    if (e.zoomGercekKatilim != null) return; // zaten işlenmiş
    const m = (e.yer || '').match(/(\d[\d\s]{6,})/);
    if (!m) return; // Zoom ID yok
    adaylar.push({ id: d.id, egitim: e.egitim, tarih: e.tarih, zoomId: m[1].replace(/\s/g, '') });
  });
  if (!adaylar.length) return { statusCode: 200, body: 'işlenecek eğitim yok' };

  const token = await zoomToken();
  const sonuclar = [];
  for (const a of adaylar) {
    try {
      // Aynı Zoom salonu birçok eğitimde kullanılıyor → doğru OTURUMU tarihle seç
      const inst = await zoomGet(token, `/past_meetings/${a.zoomId}/instances`);
      const gun = parseTarih(a.tarih);
      const oturum = (inst.meetings || []).filter(x => ayniGunMu(x.start_time, gun))
        .sort((x, y) => new Date(y.start_time) - new Date(x.start_time))[0];
      if (!oturum) { sonuclar.push(`${a.egitim}: o güne ait Zoom oturumu yok`); continue; }

      // Katılımcılar (sayfalı)
      const kisiler = new Map(); // email|isim -> toplam saniye
      let nextToken = '';
      do {
        const page = await zoomGet(token, `/report/meetings/${encUUID(oturum.uuid)}/participants?page_size=300${nextToken ? `&next_page_token=${nextToken}` : ''}`);
        for (const p of page.participants || []) {
          const key = (p.user_email || p.name || 'anon').toLowerCase().trim();
          kisiler.set(key, (kisiler.get(key) || 0) + (p.duration || 0));
        }
        nextToken = page.next_page_token || '';
      } while (nextToken);

      const sayi = kisiler.size;
      const ortDk = sayi ? Math.round([...kisiler.values()].reduce((s, v) => s + v, 0) / sayi / 60) : 0;
      await db.collection('takvim').doc(a.id).set({
        zoomGercekKatilim: sayi,
        zoomOrtDakika: ortDk,
        zoomRaporTs: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      sonuclar.push(`${a.egitim}: ${sayi} kişi, ort ${ortDk} dk`);
    } catch (e) {
      console.warn('[zoom-rapor]', a.egitim, e.message);
      sonuclar.push(`${a.egitim}: HATA ${e.message}`);
    }
  }

  console.log('[zoom-rapor]', sonuclar.join(' | '));
  return { statusCode: 200, body: JSON.stringify({ islenen: adaylar.length, sonuclar }) };
};

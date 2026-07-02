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
const istParcala = (isoStr) => new Date(new Date(isoStr).getTime() + 3 * 3600 * 1000); // UTC+3 İstanbul
const ayniGunMu = (isoStr, gun) => {
  const ist = istParcala(isoStr);
  return ist.getUTCFullYear() === gun.getFullYear() && ist.getUTCMonth() === gun.getMonth() && ist.getUTCDate() === gun.getDate();
};
// Aynı gün + aynı salonda birden çok eğitim olabilir → oturumu eğitimin SAATİNE en yakın olana göre seç
const saatDk = (s) => { const [h = 0, m = 0] = String(s || '').split(':').map(n => parseInt(n, 10)); return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0); };

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
    adaylar.push({ id: d.id, egitim: e.egitim, tarih: e.tarih, saat: e.saat, zoomId: m[1].replace(/\s/g, '') });
  });
  if (!adaylar.length) return { statusCode: 200, body: 'işlenecek eğitim yok' };

  const token = await zoomToken();
  const sonuclar = [];
  for (const a of adaylar) {
    try {
      // Aynı Zoom salonu birçok eğitimde kullanılıyor → doğru OTURUMU tarihle seç
      const inst = await zoomGet(token, `/past_meetings/${a.zoomId}/instances`);
      const gun = parseTarih(a.tarih);
      const ogunkuler = (inst.meetings || []).filter(x => ayniGunMu(x.start_time, gun));
      // Eğitimin planlanan saatine en yakın oturumu seç (aynı salonda gün içi çok eğitim olabilir)
      const hedefDk = saatDk(a.saat);
      const oturum = ogunkuler.sort((x, y) => {
        const dx = Math.abs((istParcala(x.start_time).getUTCHours() * 60 + istParcala(x.start_time).getUTCMinutes()) - hedefDk);
        const dy = Math.abs((istParcala(y.start_time).getUTCHours() * 60 + istParcala(y.start_time).getUTCMinutes()) - hedefDk);
        return dx - dy;
      })[0];
      if (!oturum) { sonuclar.push(`${a.egitim}: o güne ait Zoom oturumu yok`); continue; }

      // Katılımcılar (sayfalı) — süre toplamı + giriş/çıkış zamanları (terk eğrisi için)
      const kisiler = new Map(); // email|isim -> toplam saniye
      const emailler = new Set(); // ekip nabzı eşleştirmesi için (server-only koleksiyona)
      const oturumlar = []; // {j: joinMs, l: leaveMs}
      let nextToken = '';
      do {
        const page = await zoomGet(token, `/report/meetings/${encUUID(oturum.uuid)}/participants?page_size=300${nextToken ? `&next_page_token=${nextToken}` : ''}`);
        for (const p of page.participants || []) {
          const key = (p.user_email || p.name || 'anon').toLowerCase().trim();
          kisiler.set(key, (kisiler.get(key) || 0) + (p.duration || 0));
          if (p.user_email) emailler.add(String(p.user_email).toLowerCase().trim());
          if (p.join_time && p.leave_time) oturumlar.push({ j: new Date(p.join_time).getTime(), l: new Date(p.leave_time).getTime() });
        }
        nextToken = page.next_page_token || '';
      } while (nextToken);

      const sayi = kisiler.size;
      const ortDk = sayi ? Math.round([...kisiler.values()].reduce((s, v) => s + v, 0) / sayi / 60) : 0;

      // Terk eğrisi: oturum başlangıcından itibaren 5-dk kovalarda "içerideki kişi" sayısı (maks 3 saat)
      const t0 = new Date(oturum.start_time).getTime();
      const kovaN = 36; // 36 × 5dk = 180dk
      const egri = Array(kovaN).fill(0);
      for (const o of oturumlar) {
        const bas = Math.max(0, Math.floor((o.j - t0) / 300000));
        const bit = Math.min(kovaN - 1, Math.floor((o.l - t0) / 300000));
        for (let k = bas; k <= bit; k++) egri[k]++;
      }
      while (egri.length && egri[egri.length - 1] === 0) egri.pop(); // boş kuyruğu kes

      await db.collection('takvim').doc(a.id).set({
        zoomGercekKatilim: sayi,
        zoomOrtDakika: ortDk,
        zoomEgri: egri, // 5-dk kovalar; admin-only gösterilir
        zoomUuid: oturum.uuid, // transkript cron'u bu oturumun kaydını çeker
        zoomRaporTs: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      // Ekip nabzı temeli: katılımcı emailleri — SERVER-ONLY koleksiyon (rules'ta match yok → client erişemez)
      if (emailler.size) {
        await db.collection('zoom_katilimcilar').doc(a.id).set({
          egitim: a.egitim, tarih: a.tarih, emails: [...emailler],
          ts: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      sonuclar.push(`${a.egitim}: ${sayi} kişi, ort ${ortDk} dk`);
    } catch (e) {
      console.warn('[zoom-rapor]', a.egitim, e.message);
      sonuclar.push(`${a.egitim}: HATA ${e.message}`);
    }
  }

  console.log('[zoom-rapor]', sonuclar.join(' | '));
  return { statusCode: 200, body: JSON.stringify({ islenen: adaylar.length, sonuclar }) };
};

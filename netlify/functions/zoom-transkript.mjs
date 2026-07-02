// Zoom transkripti → Asistan bilgi bankası boru hattı (gece 03:30 İst cron).
//
// AMAÇ: Her Zoom eğitiminin KONUŞMA METNİNİ (videoyu Vimeo'ya yüklemeden!)
// çekip `zoom_transkriptler` koleksiyonuna yazmak. Haftalık asistan-KB
// güncelleyicisi (oneteamai-automation) bu koleksiyonu kaynak olarak okur →
// asistan her Zoom toplantısından beslenir; video yayınlanmasa bile.
//
// Akış: zoomUuid'si yazılmış ama transkripti alınmamış eğitimler →
//   GET /meetings/{uuid}/recordings → recording_files içinde TRANSCRIPT (VTT)
//   → indir → VTT'yi düz metne çevir → zoom_transkriptler/{egitimId}
//   (server-only koleksiyon; rules'ta match yok → client erişemez)
//
// GEREKSİNİM: Zoom app Scopes'a bulut kaydı okuma izni (cloud_recording read).
//   + Zoom hesabında "Cloud recording" ve "Audio transcript" ayarları açık olmalı;
//   transkript, kayıt bittikten ~saatler sonra hazır olur (o yüzden gece 03:30 +
//   önceki 3 günü tarar — geç hazırlananları sonraki gece yakalar).
// İzin yoksa fonksiyon hatayı loglar, patlamaz.

import admin from 'firebase-admin';

export const config = { schedule: '30 0 * * *' }; // 03:30 Istanbul

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

async function zoomToken() {
  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;
  const basic = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`, {
    method: 'POST', headers: { Authorization: `Basic ${basic}` },
  });
  if (!res.ok) throw new Error(`zoom token ${res.status}`);
  return (await res.json()).access_token;
}
const encUUID = (u) => encodeURIComponent(encodeURIComponent(u));

// VTT → düz metin: zaman damgalarını ve tekrarları at, konuşma akışını bırak
function vttToText(vtt) {
  const satirlar = String(vtt).split(/\r?\n/);
  const out = [];
  for (const s of satirlar) {
    const t = s.trim();
    if (!t || t === 'WEBVTT' || /^\d+$/.test(t) || t.includes('-->')) continue;
    out.push(t);
  }
  // ardışık birebir tekrarları tekile indir (VTT'de yaygın)
  return out.filter((s, i) => s !== out[i - 1]).join('\n');
}

const parseTarih = (t) => { const p = String(t || '').split('.').map(Number); if (p.length !== 3 || p.some(isNaN)) return null; const d = new Date(p[2], p[1] - 1, p[0]); return isNaN(d.getTime()) ? null : d; };

export const handler = async (event) => {
  if (!yetkiliMi(event)) return { statusCode: 403, body: 'forbidden' };
  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;
  if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) return { statusCode: 200, body: 'zoom env eksik' };

  const db = initFirebase();
  // Son 3 günün zoomUuid'li eğitimleri (transkript geç hazır olabilir → tekrar dene)
  const istNow = new Date(Date.now() + 3 * 3600 * 1000);
  const alt = new Date(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate());
  alt.setDate(alt.getDate() - 3);
  const snap = await db.collection('takvim').get();
  const adaylar = [];
  snap.forEach(d => {
    const e = d.data();
    if (!e.zoomUuid) return;
    if (e.zoomTranskriptAlindi) return; // idempotent
    const dt = parseTarih(e.tarih);
    if (!dt || dt < alt) return;
    adaylar.push({ id: d.id, egitim: e.egitim, tarih: e.tarih, egitmen: e.egitmen || '', uuid: e.zoomUuid });
  });
  if (!adaylar.length) return { statusCode: 200, body: 'aday yok' };

  const token = await zoomToken();
  const sonuclar = [];
  for (const a of adaylar) {
    try {
      const res = await fetch(`https://api.zoom.us/v2/meetings/${encUUID(a.uuid)}/recordings`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 404) { sonuclar.push(`${a.egitim}: bulut kaydı yok`); continue; }
      if (!res.ok) { sonuclar.push(`${a.egitim}: recordings HTTP ${res.status}${res.status === 400 || res.status === 401 ? ' (scope eksik olabilir: cloud_recording read)' : ''}`); continue; }
      const rec = await res.json();
      const trFile = (rec.recording_files || []).find(f => f.file_type === 'TRANSCRIPT');
      if (!trFile) { sonuclar.push(`${a.egitim}: transkript henüz hazır değil/kapalı`); continue; }
      const vttRes = await fetch(`${trFile.download_url}?access_token=${token}`);
      if (!vttRes.ok) { sonuclar.push(`${a.egitim}: indirme HTTP ${vttRes.status}`); continue; }
      const metin = vttToText(await vttRes.text());
      if (metin.length < 200) { sonuclar.push(`${a.egitim}: transkript çok kısa, atlandı`); continue; }

      // Firestore doc limiti 1MB — uzun transkripti kırp (KB chunk'ları zaten böler)
      const kisaltilmis = metin.length > 900000 ? metin.slice(0, 900000) : metin;
      await db.collection('zoom_transkriptler').doc(a.id).set({
        egitim: a.egitim, tarih: a.tarih, egitmen: a.egitmen,
        transcript: kisaltilmis, kaynak: 'zoom',
        ts: admin.firestore.FieldValue.serverTimestamp(),
      });
      await db.collection('takvim').doc(a.id).set({ zoomTranskriptAlindi: true }, { merge: true });
      sonuclar.push(`${a.egitim}: ✓ ${Math.round(metin.length / 1000)}k karakter`);
    } catch (e) { sonuclar.push(`${a.egitim}: HATA ${e.message}`); }
  }
  console.log('[zoom-transkript]', sonuclar.join(' | '));
  return { statusCode: 200, body: JSON.stringify({ islenen: adaylar.length, sonuclar }) };
};

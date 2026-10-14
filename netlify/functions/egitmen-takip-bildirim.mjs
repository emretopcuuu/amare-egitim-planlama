// Takip edilen eğitmenin yarınki eğitimi için bildirim.
//
// Madde 8'in karşılığı: /lider/:id sayfasındaki "Takip et" düğmesi kişiyi
// `web_push_aboneleri` koleksiyonuna konusmaciAd ile yazıyor. Bu iş, yarın
// eğitimi olan eğitmenlerin takipçilerine günde bir kez bildirim atar.
//
// Neden "yarın": aynı gün bildirimi hatırlatma sistemi zaten yapıyor
// (hatirlatma-gonder.mjs, kişinin kendi kurduğu hatırlatma). Burada amaç
// "takip ettiğin kişinin eğitimi var" haberini önceden vermek.
//
// Günde bir kez çalışır. Aynı gün ikinci kez tetiklenirse `takip_bildirim_log`
// kaydı sayesinde tekrar göndermez.

import admin from 'firebase-admin';
import { Resend } from 'resend';

export const config = { schedule: '0 9 * * *' };   // her gün 09:00 UTC

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}
const db = admin.firestore();
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

let webpush = null;
try {
  const m = await import('web-push');
  webpush = m.default || m;
} catch { /* paket yok */ }

const VAPID_PUBLIC = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const HAZIR = !!(webpush && VAPID_PUBLIC && VAPID_PRIVATE);
if (HAZIR) {
  try {
    webpush.setVapidDetails('mailto:noreply@oneteamglobal.ai', VAPID_PUBLIC, VAPID_PRIVATE);
  } catch { /* yoksay */ }
}

// "ZİYA ŞAKİR YILMAZ" ile "Ziya Şakir Yılmaz" eşleşsin diye sadeleştirme.
const duzle = (s) => String(s || '')
  .toLocaleLowerCase('tr-TR')
  .replace(/[ıİ]/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
  .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
  .replace(/[^a-z0-9]+/g, ' ').trim();

// "A, B & C" -> ["A","B","C"]
const egitmenleriAyir = (s) => String(s || '')
  .split(/[,&/]|\bve\b|\+/i)
  .map((x) => x.trim())
  .filter(Boolean);

const ddmmyyyy = (d) =>
  `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

export default async () => {
  // Push veya e-posta: en az biri çalışıyorsa devam.
  if (!HAZIR && !resend) {
    return new Response(JSON.stringify({ atlandi: 'ne push ne e-posta yapılandırılmış' }), { status: 200 });
  }

  const yarin = new Date();
  yarin.setDate(yarin.getDate() + 1);
  const yarinStr = ddmmyyyy(yarin);
  const gunAnahtari = `${yarin.getFullYear()}-${yarin.getMonth() + 1}-${yarin.getDate()}`;

  // Aynı gün tekrar göndermeyi önle
  const logRef = db.collection('takip_bildirim_log').doc(gunAnahtari);
  if ((await logRef.get()).exists) {
    return new Response(JSON.stringify({ atlandi: 'bugün zaten gönderildi' }), { status: 200 });
  }

  // Yarınki eğitimler (gizli olanlar hariç)
  const takvimSnap = await db.collection('takvim').where('tarih', '==', yarinStr).get();
  const egitimler = takvimSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .filter((e) => e.gizli !== true);
  if (!egitimler.length) {
    await logRef.set({ zaman: admin.firestore.Timestamp.now(), egitim: 0, bildirim: 0, eposta: 0 });
    return new Response(JSON.stringify({ egitim: 0, bildirim: 0, eposta: 0 }), { status: 200 });
  }

  // Takipçiler: konusmaciAd dolu ve aktif abonelikler
  const aboneSnap = await db.collection('web_push_aboneleri')
    .where('aktif', '==', true).get();
  const takipciler = new Map();   // duzle(ad) -> [abone...]
  for (const d of aboneSnap.docs) {
    const a = d.data();
    if (!a.konusmaciAd) continue;
    const k = duzle(a.konusmaciAd);
    if (!takipciler.has(k)) takipciler.set(k, []);
    takipciler.get(k).push({ ref: d.ref, ...a });
  }
  // Aynı kişiye aynı gün birden çok bildirim gitmesin: endpoint bazlı tekille.
  const gonderilecek = new Map();   // endpoint -> {abone, egitim, egitmenAdi}
  for (const e of egitimler) {
    for (const ham of egitmenleriAyir(e.egitmen)) {
      const liste = takipciler.get(duzle(ham));
      if (!liste) continue;
      for (const ab of liste) {
        if (!gonderilecek.has(ab.endpoint)) {
          gonderilecek.set(ab.endpoint, { abone: ab, egitim: e, egitmenAdi: ham });
        }
      }
    }
  }

  let gonderildi = 0;
  for (const { abone, egitim, egitmenAdi } of (HAZIR ? gonderilecek.values() : [])) {
    const yuk = JSON.stringify({
      title: `${egitmenAdi} yarın sahnede`,
      body: `${egitim.egitim || 'Eğitim'} · ${egitim.saat || ''}`.trim(),
      url: `https://egitimtakvimi.oneteamglobal.ai/e/${egitim.id}`,
    });
    try {
      await webpush.sendNotification({ endpoint: abone.endpoint, keys: abone.keys }, yuk);
      gonderildi++;
    } catch (err) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await abone.ref.update({ aktif: false }).catch(() => {});
      }
    }
  }

  // ── E-posta kanalı ──
  // `konusmaci_aboneleri` koleksiyonu "Yeni eğitimde haber ver" düğmesiyle
  // doluyordu ama GÖNDEREN TARAFI HİÇ YOKTU: kayıtlar birikiyor, kimseye haber
  // gitmiyordu. Ölü halka burada kapanıyor.
  let eposta = 0;
  if (resend) {
    try {
      const abSnap = await db.collection('konusmaci_aboneleri').where('aktif', '==', true).get();
      const epostaHedef = new Map();   // email -> {egitim, egitmenAdi}
      for (const d of abSnap.docs) {
        const a = d.data();
        if (!a.email || !a.konusmaciAd) continue;
        const k = duzle(a.konusmaciAd);
        for (const e of egitimler) {
          if (egitmenleriAyir(e.egitmen).some((x) => duzle(x) === k)) {
            if (!epostaHedef.has(a.email)) epostaHedef.set(a.email, { egitim: e, egitmenAdi: a.konusmaciAd });
            break;
          }
        }
      }
      for (const [adres, { egitim, egitmenAdi }] of epostaHedef) {
        try {
          await resend.emails.send({
            from: 'One Team Eğitim <noreply@oneteamglobal.ai>',
            to: adres,
            subject: `${egitmenAdi} yarın sahnede — ${egitim.egitim || 'Eğitim'}`,
            html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#12303B">
              <p style="margin:0 0 8px;font-size:14px;color:#5D7883">Takip ettiğin eğitmen</p>
              <h2 style="margin:0 0 4px;font-size:20px">${egitmenAdi}</h2>
              <p style="margin:0 0 16px;font-size:15px">yarın <strong>${egitim.egitim || 'bir eğitimde'}</strong> ${egitim.saat ? `· ${egitim.saat}` : ''}</p>
              <a href="https://egitimtakvimi.oneteamglobal.ai/e/${egitim.id}"
                 style="display:inline-block;background:#C4A65C;color:#09191F;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px">Eğitimi gör</a>
              <p style="margin:24px 0 0;font-size:12px;color:#5D7883">Bu bildirimi, bu eğitmeni takip ettiğin için aldın.</p>
            </div>`,
          });
          eposta++;
        } catch { /* tek adres düşerse diğerleri devam etsin */ }
      }
    } catch (e) {
      console.error('e-posta kanalı:', e.message);
    }
  }

  await logRef.set({
    zaman: admin.firestore.Timestamp.now(),
    egitim: egitimler.length,
    bildirim: gonderildi,
    eposta,
  });
  return new Response(JSON.stringify({ egitim: egitimler.length, bildirim: gonderildi, eposta }), { status: 200 });
};

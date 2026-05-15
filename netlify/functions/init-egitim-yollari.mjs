// netlify/functions/init-egitim-yollari.mjs
// ─────────────────────────────────────────────────────────────────────────
// İlk kurulum: Her rank için 3 video atayan toplu init function.
// Admin sadece token ile çağırabilir. Çalıştıktan sonra silinebilir.
//
// Çağrı:
//   POST /.netlify/functions/init-egitim-yollari
//   Authorization: Bearer <Firebase ID Token of admin user>
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

const ADMIN_EMAILS = [
  's.emretopcu@gmail.com',
  'onlineakademin@gmail.com',
  'toygarsenelmis@gmail.com',
  'alper.kirbiyik@gmail.com',
  'vitamindestegi@gmail.com',
  'kmaziliguney@gmail.com',
  'ilknurakkas17@gmail.com',
  'giray70@gmail.com',
  'furkancite@gmail.com',
];

const RANK_INFO = {
  brand_partner:        { label: 'Brand Partner',        sira: 1 },
  brand_builder:        { label: 'Brand Builder',        sira: 2 },
  bronze:               { label: 'Bronze',               sira: 3 },
  silver:               { label: 'Silver',               sira: 4 },
  gold:                 { label: 'Gold',                 sira: 5 },
  platinum:             { label: 'Platinum',             sira: 6 },
  leader:               { label: 'Leader',               sira: 7 },
  senior_leader:        { label: 'Senior Leader',        sira: 8 },
  executive_leader:     { label: 'Executive Leader',     sira: 9 },
  diamond:              { label: 'Diamond',              sira: 10 },
  one_star_diamond:     { label: '1-Star Diamond',       sira: 11 },
  two_star_diamond:     { label: '2-Star Diamond',       sira: 12 },
  three_star_diamond:   { label: '3-Star Diamond',       sira: 13 },
  presidential_diamond: { label: 'Presidential Diamond', sira: 14 },
};

// Mantıklı dağılım — kariyer hiyerarşisine göre, mevcut 29 video üzerinden
// Her rank'e 3 video, kategori uyumlu, eğitmen çeşitlilik göz önünde
// 907 kayene-değil video havuzundan tarih+benzersizlik ağırlıklı dağıtım
// Kategori skor (1.tercih=1000, 2.=500, 3.=250) + tarih (en yeni +400)
// + süre (max +80) + cross-rank uniqueness penaltısı (-800 if used)
// Her rank'e 3 unique video, toplam 42 farklı video kullanıldı.
const DAGILIM = {
  brand_partner: [
    '1077132347',  // 2025-04-20 Sıfırdan Katlamaya 15 Adım - Ziya Yılmaz
    '1073600310',  // 2025-04-08 Liste-Reklam-Davet - Kenan Kozanhan
    '1022449325',  // 2024-10-23 Doğru Başlangıç - Toygar Şenelmiş
  ],
  brand_builder: [
    '1141368933',  // 2025-11-28 Liste-Reklam-Davet - Kasım Mazılıgüney
    '1073608704',  // 2025-04-08 Liste-Reklam-Davet Panel - Alper Kırbıyık
    '1036627025',  // 2024-12-06 Reklam-Davet - Sibel Özdemir
  ],
  bronze: [
    '1166594255',  // 2026-02-20 Sunuma Başlama Simülasyonu - Saide Zöngür
    '1053161751',  // 2025-02-03 10X Promosyon Sunumu - Emre Topçu
    '1075441844',  // 2025-04-14 Doğru Sunum Nasıl Yapılır - Yavuz Bağcı
  ],
  silver: [
    '1156971955',  // 2026-01-21 Amare Kazanç Planı - Alper Kırbıyık
    '1156976219',  // 2026-01-21 Amare Kazanç Planı - Arda Çakır
    '1084148153',  // 2025-05-14 Amare Backoffice Anasayfa - Ersel Arıcan
  ],
  gold: [
    '1006616960',  // 2024-09-05 Görüşme-İhtiyaç Tespit - Emre Topçu 4.Gün
    '1004038916',  // 2024-08-29 İtiraz Karşılama-Kapanış - Arda Çakır
    '1179492257',  // 2026-04-02 Başarı Sırları 6 - Ziya Yılmaz
  ],
  platinum: [
    '1101014293',  // 2025-07-13 Mazeret/İtiraz Karşılama - Ziya Yılmaz
    '1080636021',  // 2025-05-01 Kapanış İş Bitiricilik Paneli - Tülay Filtekin
    '1034490116',  // 2024-11-29 Mazeretsiz Kapanış - Aytuğ Gönül
  ],
  leader: [
    '1154225309',  // 2026-01-14 Yalçın Kavlak & Kasım Söyleşi
    '1177611464',  // 2026-03-27 Kampların Önemi - Arda Çakır
    '1116458885',  // 2025-09-06 4 Ayda Diamond - Emre Topçu
  ],
  senior_leader: [
    '128818022',   // Potansiyeli Yüksek Kişiler ile Problem
    '127402624',   // Networkte Problem Çözmek - Aytuğ Gönül
    '1107146050',  // 2025-08-04 Hızlı Kariyer - Emre Topçu
  ],
  executive_leader: [
    '766067235',   // 2022-11-01 Ay Başı Kariyer Planlaması - Furkan Çite
    '1108874805',  // 2025-08-10 Doğru Sorular Güçlü Sonuçlar - Ferhat Gök
    '1040892096',  // 2024-12-19 Liderlik Sırları - Toygar Şenelmiş
  ],
  diamond: [
    '1133548925',  // 2025-11-04 Diamond Yolculuğu - Merve Çaloğlu & Emre
    '1166299161',  // 2026-02-19 Nedenlerimizi Bilerek - Ersel Arıcan
    '1105376561',  // 2025-07-29 Neden-Hedef-Hikaye SEN - Seçil Fida
  ],
  one_star_diamond: [
    '488509900',   // 2020-12-08 Online Çalışma Prensipleri - Emre Topçu
    '1191482913',  // 2026-05-12 Doğru Planlama - Yavuz Bağcı
    '1036643694',  // 2024-12-06 OneTeam Kamplarının Gücü - Mehmet Akif Topçu
  ],
  two_star_diamond: [
    '1108873256',  // 2025-08-10 Eklemeden Katlamaya Geçmek - Emre Topçu
    '513364422',   // 2021-02-17 Zamanınızı Katlamanın Basit Yolu
    '1173627977',  // 2026-03-14 Başarı Sırları - Ziya Yılmaz
  ],
  three_star_diamond: [
    '1101037528',  // 2025-07-13 Diamond Yolculuğu - Ferhat Gök
    '1088729120',  // 2025-05-29 Atakan Yaman Sector-Visie-Amare
    '1004002999',  // 2024-08-29 Etkinlikler ve Kamplar - Ziya Yılmaz
  ],
  presidential_diamond: [
    '1088735353',  // 2025-05-29 Ferhat Gök Waarom-Geloof-Plan (NL)
    '1088550350',  // 2025-05-28 Atakan Yaman Sektor-Vision-Amare
    '995911603',   // 2024-08-07 Etkinlikler ve Kamplar - Ziya Yılmaz
  ],
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  try {
    // Bearer token doğrulama
    const authHeader = req.headers.get('authorization') || '';
    const m = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!m) return new Response(JSON.stringify({ error: 'Token gerekli' }), { status: 401, headers: { 'Content-Type': 'application/json', ...CORS } });

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(m[1]);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Geçersiz token' }), { status: 401, headers: { 'Content-Type': 'application/json', ...CORS } });
    }

    if (!ADMIN_EMAILS.includes(decoded.email)) {
      return new Response(JSON.stringify({ error: 'Admin yetkisi yok' }), { status: 403, headers: { 'Content-Type': 'application/json', ...CORS } });
    }

    // Her rank için Firestore'da kayıt oluştur
    const results = {};
    for (const [rankKey, vimeoIds] of Object.entries(DAGILIM)) {
      const info = RANK_INFO[rankKey];

      // Her video için meta data Firestore'dan çek
      const videos = [];
      for (let i = 0; i < vimeoIds.length; i++) {
        const vid = vimeoIds[i];
        try {
          const snap = await admin.firestore().doc(`kayitli_egitimler/${vid}`).get();
          if (snap.exists) {
            const d = snap.data();
            videos.push({
              vimeoId: vid,
              baslik: d.baslik || 'Başlıksız',
              sira: i + 1,
              thumbnailUrl: d.thumbnailUrl || null,
              egitmenAdlari: d.egitmenAdlari || [],
              kategoriler: d.kategoriler || [],
              tarih: d.tarih || null,
              sure: d.sure || 0,
            });
          } else {
            videos.push({ vimeoId: vid, baslik: 'BULUNAMADI', sira: i + 1 });
          }
        } catch (e) {
          videos.push({ vimeoId: vid, baslik: 'HATA', sira: i + 1, err: e.message });
        }
      }

      await admin.firestore().doc(`egitim_yollari/${rankKey}`).set({
        rankKey,
        rankLabel: info.label,
        sira: info.sira,
        zorunluVideolar: videos,
        onerilenVideolar: [],
        guncellemeTarihi: admin.firestore.FieldValue.serverTimestamp(),
        initEdildi: true,
        initTarihi: admin.firestore.FieldValue.serverTimestamp(),
      });

      results[rankKey] = videos.length;
    }

    return new Response(JSON.stringify({
      basarili: true,
      rankSayisi: Object.keys(results).length,
      sonuclar: results,
    }), { headers: { 'Content-Type': 'application/json', ...CORS } });

  } catch (err) {
    console.error('[init-egitim-yollari] hata:', err.message, err.stack);
    return new Response(JSON.stringify({ error: 'Sistem hatası', detail: err.message.slice(0, 200) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } });
  }
};

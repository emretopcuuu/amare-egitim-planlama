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
// 1879 video havuzundan akıllı dağıtım (kategori skorlama algoritması)
// Her rank için en uygun 3 video, eğitmen çeşitliliği gözetildi
const DAGILIM = {
  brand_partner: [
    '372594649',   // 90 Günlük Oyun Planı - Emre Topçu (Liderlik/Liste)
    '766067235',   // Ay Başında Kariyer Planlaması - Furkan Çite
    '1077132347',  // Sıfırdan Katlamaya 15 Adım - Ziya Şakir Yılmaz
  ],
  brand_builder: [
    '1141368933',  // Liste-Reklam-Davet - Kasım Mazılıgüney
    '1073608704',  // Liste-Reklam-Davet Panel - Alper Kırbıyık
    '1036627025',  // Reklam-Davet - Sibel Özdemir
  ],
  bronze: [
    '1073600310',  // Liste-Reklam-Davet - Kenan Kozanhan
    '375546683',   // Teknik Eğitim (Davet/Sunum) - Emre Topçu
    '427627338',   // Network Marketing Akademi - Ziya Yılmaz
  ],
  silver: [
    '126725628',   // Dr Barrie Tann (Ürün/Sağlık)
    '1118635018',  // Amare Kazanç Planı - Alper Kırbıyık
    '1125095670',  // Amare Kazanç Planı - Arda Çakır
  ],
  gold: [
    '1101014293',  // Mazeret ve İtiraz Karşılama - Ziya Yılmaz
    '1034490116',  // Mazeretsiz Kapanış - Aytuğ Gönül
    '352307546',   // İş Bitiricilik ve Kapanış - Emre Topçu
  ],
  platinum: [
    '1099048090',  // Profesyonel Takip - Ziya Yılmaz
    '434089068',   // Güçlü Kapanış - Nilüfer Çıragöz
    '607713669',   // Detaylı Kazanç Planı - Emre Erkan
  ],
  leader: [
    '660685891',   // Diamond Söyleşi - Emre Topçu
    '127456261',   // Simon Sinek Liderler Nasıl İlham Verir
    '495984276',   // Bir Aslanın Zihin Yapısı - Hunter King
  ],
  senior_leader: [
    '128867839',   // How to Fix People Around You (Kişisel Gelişim)
    '127402624',   // Networkte Problem Çözmek - Aytuğ Gönül
    '128818022',   // Potansiyeli Yüksek Kişiler ile Problem
  ],
  executive_leader: [
    '910845509',   // AMARE Geçiş Stratejileri - Emre Topçu
    '130364863',   // Steve Jobs Apple'ı Nasıl Kurtardı - Tony Robbins
    '766067235',   // Ay Başında Kariyer Planlaması - Furkan Çite
  ],
  diamond: [
    '129880718',   // Kampların Önemi - Aytuğ Gönül & Akif Bilge
    '129041464',   // Obama İşsizlik (Vizyon)
    '421020326',   // Pazarlama Planı 2020 - Ziya Yılmaz
  ],
  one_star_diamond: [
    '421020326',   // Pazarlama Planı 2020 - Ziya Yılmaz
    '430142072',   // Büyük Düşün - Furkan Çite
    '474981685',   // Diamond Planı Nasıl Yapılır - Emre Topçu
  ],
  two_star_diamond: [
    '372594649',   // 90 Günlük Oyun Planı - Emre Topçu (Liderlik)
    '1082454060',  // Girişimcilik Yolculuğu Paneli - Ferhat Gök
    '1154225309',  // Yalçın Kavlak & Kasım Mazılıgüney Söyleşi
  ],
  three_star_diamond: [
    '910845509',   // AMARE Geçiş Stratejileri - Emre Topçu (Vizyon)
    '421020326',   // Pazarlama Planı 2020 - Ziya Yılmaz
    '430142072',   // Büyük Düşün - Furkan Çite
  ],
  presidential_diamond: [
    '433088377',   // Diamond Yolculuğum - Mekan Muhammedov
    '231018176',   // KAMPA GELİRSEM - ASUMAN BAYRAK
    '134824701',   // Hoşgeldiniz - Emre Topçu (Blue Diamond Dünya Birincisi)
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

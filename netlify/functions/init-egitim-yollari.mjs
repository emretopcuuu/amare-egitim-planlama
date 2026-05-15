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
// Gerçek 29 video ID'leriyle kariyer hiyerarşisi dağılımı
const DAGILIM = {
  brand_partner: [
    // Başlangıç: değer + kültür + temel
    '1004045342', // Etik Olma Kültürü - Gülay Rençber
    '1004002999', // Etkinlikler ve Kamplar - Ziya Yılmaz (Vizyon/Kamp)
    '1017624441', // Doğru Başlangıç - Dr. Fatih Demir
  ],
  brand_builder: [
    // İlk gelişim: doğru başlangıç + davet + ürün temeli
    '1022449325', // Doğru Başlangıç - Toygar Şenelmiş
    '1004025235', // Liste-Reklam-Davet - Kasım Mazılıgüney (Davet/Liste)
    '1017635292', // Ürün Eğitimi - Ufuk Memiş
  ],
  bronze: [
    // Başlangıç kültürü + tanışma + davet
    '1003999747', // Abone Ol Kazan Kültürü - Saba Bener
    '1006614686', // Tanışma Günü - Emre Topçu 1.Gün
    '1036627025', // Reklam-Davet - Sibel Özdemir
  ],
  silver: [
    // Ürün uzmanlaşma + sağlık + sunum
    '1031017534', // Ürün Eğitimi - Nuri Haksever
    '1003945303', // Mahmut Yılmaz - Ürün Sunumu
    '1003624447', // Sağlıklı Yaşam - Nuri Haksever
  ],
  gold: [
    // Görüşme + itiraz + kapanış
    '1004038916', // İtiraz Karşılama-Kapanış - Arda Çakır
    '1006616960', // Görüşme-İhtiyaç Tespit - Emre 4.Gün
    '1034490116', // Mazeretsiz Kapanış - Aytuğ Gönül
  ],
  platinum: [
    // Sunum + dijital + kariyer planı
    '1003966904', // İş Sunumu - Furkan Çite
    '1029917453', // Sosyal Medya - Emre Topçu
    '1017816279', // Kariyer Kazanç - Arda Çakır
  ],
  leader: [
    // Liderlik temeli: motivasyon + girişimcilik + plan
    '1004006229', // Neden-İnanç-Plan - Ferhat Gök
    '1003986176', // Girişimcilik Dünyası - Emre Topçu
    '1029164891', // Kazanç Planı - Özkan Davarcı
  ],
  senior_leader: [
    // İleri liderlik: hikaye + vizyon + planlama
    '1004028104', // Promote-Hikaye-Sunum - Sibel Özdemir
    '1004830210', // Sektör-Vizyon - Atakan Yaman
    '1024650699', // Kariyer Kazanç - Aytuğ Gönül
  ],
  executive_leader: [
    // Üst liderlik: finansal + motivasyon + vizyon
    '1020236821', // Finansal Özgürlük - Ziya Yılmaz
    '1004006229', // Neden-İnanç-Plan - Ferhat Gök
    '1004830210', // Sektör-Vizyon - Atakan
  ],
  diamond: [
    // Vizyon + kültür + sağlık
    '1004002999', // Etkinlikler ve Kamplar - Ziya
    '1020236821', // Finansal Özgürlük - Ziya
    '1003624447', // Sağlıklı Yaşam - Nuri
  ],
  one_star_diamond: [
    // Genişleme: uluslararası eğitim (3 dil)
    '1031285942', // Business Opportunity (İngilizce) - Ziya
    '1034102682', // Opportunité d'Affaires (Fransızca) - Ziya
    '1031283947', // Geschäftsmöglichkeiten (Almanca) - Ziya
  ],
  two_star_diamond: [
    // Sistem + global pazar + sosyal medya
    '1031484137', // Reunión Oportunidades (İspanyolca) - Ziya
    '1004830210', // Sektör-Vizyon - Atakan
    '1029917453', // Sosyal Medya - Emre
  ],
  three_star_diamond: [
    // Duplikasyon: hikaye + finansal + sağlık
    '1004028104', // Promote-Hikaye-Sunum - Sibel
    '1020236821', // Finansal Özgürlük - Ziya
    '1003624447', // Sağlıklı Yaşam - Nuri
  ],
  presidential_diamond: [
    // Misyon: vizyon + hikaye + değer
    '1004830210', // Sektör-Vizyon - Atakan
    '1004028104', // Promote-Hikaye - Sibel
    '1004045342', // Etik Olma Kültürü - Gülay Rençber
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

// netlify/functions/_rankProfilleri.mjs
// ─────────────────────────────────────────────────────────────────────────
// 14 Amare rank'i için curriculum profilleri.
// AI rank puanlama bu profillere göre videoları skorlar.
//
// Her profil:
//   - hedefler: kullanıcının o seviyede neler öğrenmesi gerektiği (3-5 madde)
//   - temalar: ideal ana temalar (kayitli_egitimler.ozet.anaTema ile eşleşir)
//   - seviye: 1-10 zorluk seviyesi (BRAND_PARTNER=1, PRES_DIAMOND=10)
//   - kategoriler: tercih edilen kategori chip'leri (varsa)
// ─────────────────────────────────────────────────────────────────────────

export const RANK_PROFILLERI = {
  brand_partner: {
    label: 'Brand Partner',
    sira: 1,
    seviye: 1,
    hedefler: [
      'Doğru başlangıç adımlarını öğren',
      'İlk üye davet süreçlerini kavra',
      'Ürünleri kullanarak deneyim kazan',
      'Liste yapma ve potansiyel müşteri tanımlama',
      'Temel iş sunumu yapabilme',
    ],
    temalar: ['başlangıç', 'temel', 'davet', 'liste', 'ürün tanıma'],
    kategoriler: ['Doğru Başlangıç', 'Davet', 'Liste', 'Ürün Eğitimi'],
  },

  brand_builder: {
    label: 'Brand Builder',
    sira: 2,
    seviye: 2,
    hedefler: [
      'Etkili davet ve takip teknikleri',
      'Sosyal medya kullanımı',
      'İlk sunumları profesyonel yapma',
      'Reklam ve duyuru içerikleri hazırlama',
      'Sponsor desteği ile ekip kurmaya başlama',
    ],
    temalar: ['davet', 'reklam', 'sunum', 'iletişim', 'sosyal medya'],
    kategoriler: ['Davet', 'Liste', 'Reklam', 'Sunum Teknikleri'],
  },

  bronze: {
    label: 'Bronze',
    sira: 3,
    seviye: 3,
    hedefler: [
      'Profesyonel iş sunumu sanatı',
      '10X promosyon ve teklif sunma',
      'Ürün-fayda eşleştirme',
      'Sunum sırasında soru-cevap yönetme',
      'İlk dönüşümleri yakalama',
    ],
    temalar: ['sunum', 'promosyon', 'iş sunumu', 'ürün', 'satış'],
    kategoriler: ['Sunum Teknikleri', 'Ürün Eğitimi', 'Satış'],
  },

  silver: {
    label: 'Silver',
    sira: 4,
    seviye: 4,
    hedefler: [
      'Amare kazanç planını detaylı anlama',
      'Backoffice ve sistem kullanımı',
      'Komisyon ve bonus hesaplamaları',
      'Ekip büyüme stratejileri',
      'Hedef belirleme ve raporlama',
    ],
    temalar: ['kazanç planı', 'backoffice', 'sistem', 'hedef', 'plan'],
    kategoriler: ['Kazanç Planı', 'Backoffice'],
  },

  gold: {
    label: 'Gold',
    sira: 5,
    seviye: 5,
    hedefler: [
      'İhtiyaç tespiti ve görüşme teknikleri',
      'İtiraz karşılama ve kapanış',
      'Müşteri ilişkileri yönetimi',
      'Başarı sırları ve psikoloji',
      'Disiplinli takip ve ölçümleme',
    ],
    temalar: ['kapanış', 'itiraz', 'görüşme', 'satış', 'başarı'],
    kategoriler: ['Kapanış', 'İtiraz Karşılama', 'Satış'],
  },

  platinum: {
    label: 'Platinum',
    sira: 6,
    seviye: 6,
    hedefler: [
      'İleri itiraz teknikleri ve mazeret yönetimi',
      'Mazeretsiz kapanış sanatı',
      'İş bitiricilik mentalitesi',
      'Stratejik müşteri yönetimi',
      'Profesyonel iletişim ve etki',
    ],
    temalar: ['mazeret', 'kapanış', 'iş bitirme', 'strateji', 'iletişim'],
    kategoriler: ['Kapanış', 'İtiraz Karşılama'],
  },

  leader: {
    label: 'Leader',
    sira: 7,
    seviye: 7,
    hedefler: [
      'Ekip kültürü oluşturma',
      'Kamp ve etkinlik organizasyonu',
      'Kariyer planlama ve mentorluk',
      'Duplicate edilebilir sistemler',
      'Hızlı büyüme stratejileri',
    ],
    temalar: ['liderlik', 'kamp', 'ekip', 'mentorluk', 'kariyer'],
    kategoriler: ['Liderlik', 'Kamp', 'Katlama'],
  },

  senior_leader: {
    label: 'Senior Leader',
    sira: 8,
    seviye: 8,
    hedefler: [
      'Potansiyeli yüksek kişileri tespit ve geliştirme',
      'Sistemli problem çözme',
      'Hızlı kariyer atlatma stratejileri',
      'Ekip motivasyonu ve sürdürülebilir büyüme',
      'Networkte derinleşme',
    ],
    temalar: ['liderlik', 'problem çözme', 'kariyer', 'motivasyon', 'ekip'],
    kategoriler: ['Liderlik', 'Kişisel Gelişim', 'Motivasyon'],
  },

  executive_leader: {
    label: 'Executive Leader',
    sira: 9,
    seviye: 9,
    hedefler: [
      'Stratejik kariyer planlaması',
      'Doğru sorular ile güçlü sonuçlar',
      'Liderlik sırları ve duruş',
      'Vizyon belirleme ve aktarma',
      'Etki alanını genişletme',
    ],
    temalar: ['liderlik', 'strateji', 'vizyon', 'yönetim', 'soru'],
    kategoriler: ['Liderlik', 'Vizyon', 'Kişisel Gelişim'],
  },

  diamond: {
    label: 'Diamond',
    sira: 10,
    seviye: 10,
    hedefler: [
      'Diamond yolculuğunun ana prensipleri',
      'Neden-hedef-hikaye SEN bağlantısı',
      'Nedenlerini bilerek hareket etme',
      'Sürdürülebilir Diamond kültürü',
      'İlham verici liderlik',
    ],
    temalar: ['diamond', 'vizyon', 'hedef', 'hikaye', 'liderlik'],
    kategoriler: ['Liderlik', 'Vizyon', 'Hikaye'],
  },

  one_star_diamond: {
    label: '1-Star Diamond',
    sira: 11,
    seviye: 11,
    hedefler: [
      'Online çalışma prensipleri',
      'Doğru planlama ve zaman yönetimi',
      'OneTeam kamplarından maksimum verim',
      'Birden fazla aktif derinlik yönetimi',
      'Sistematik duplicate',
    ],
    temalar: ['online', 'planlama', 'kamp', 'zaman yönetimi', 'duplicate'],
    kategoriler: ['Zaman Yönetimi', 'Kamp', 'Liderlik'],
  },

  two_star_diamond: {
    label: '2-Star Diamond',
    sira: 12,
    seviye: 12,
    hedefler: [
      'Eklemeden katlamaya geçiş',
      'Zamanı katlama stratejileri',
      'Başarı sırlarını öğretebilme',
      'Çoklu ekip yönetimi',
      'Liderler yetiştirme',
    ],
    temalar: ['katlama', 'zaman', 'başarı', 'liderlik', 'duplicate'],
    kategoriler: ['Katlama', 'Liderlik', 'Zaman Yönetimi'],
  },

  three_star_diamond: {
    label: '3-Star Diamond',
    sira: 13,
    seviye: 13,
    hedefler: [
      'Etkinlik ve kamp tasarımı',
      'Sector vision oluşturma',
      'Global Diamond yolculuğu',
      'Stratejik network büyütme',
      'Üst düzey liderlik kültürü',
    ],
    temalar: ['etkinlik', 'vizyon', 'sector', 'global', 'liderlik'],
    kategoriler: ['Vizyon', 'Kamp', 'Liderlik'],
  },

  presidential_diamond: {
    label: 'Presidential Diamond',
    sira: 14,
    seviye: 14,
    hedefler: [
      'Sektör-vizyon-Amare entegrasyonu',
      'Neden-inanç-plan üçlüsü (zihinsel akort)',
      'Kültürel etki ve duplicate kültürü',
      'Global ölçekte liderlik',
      'Mirasını oluşturma',
    ],
    temalar: ['vizyon', 'sektör', 'inanç', 'kültür', 'liderlik'],
    kategoriler: ['Vizyon', 'Liderlik', 'Hikaye'],
  },
};

export const RANK_KEYS = Object.keys(RANK_PROFILLERI);

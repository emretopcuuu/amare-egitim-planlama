// Sitedeki tüm metin ve veri içeriği tek yerde: tasarım varyantları bunu paylaşır.

export const EPOSTA = "s.emretopcu@gmail.com";
export const AYNA_URL = "https://ayna.oneteamglobal.ai";
export const INSTAGRAM_URL = "https://instagram.com/emretopcu_official";
// WhatsApp numarası kullanıcıdan gelince güncellenecek (uluslararası, + ve 0 yok).
export const WHATSAPP_NUMARA = "";
export const WHATSAPP_MESAJ = "Merhaba Emre Bey, siteniz üzerinden ulaşıyorum.";
export const WHATSAPP_URL = WHATSAPP_NUMARA
  ? `https://wa.me/${WHATSAPP_NUMARA}?text=${encodeURIComponent(WHATSAPP_MESAJ)}`
  : INSTAGRAM_URL;

export const HERO = {
  isim: "Emre Topçu",
  baslikSatir1: "Ekleme değil,",
  baslikSatir2: "katlama.",
  altMetin:
    "Tek tek üye eklemeyi değil, kendi ekibini kuran liderler yetiştirmeyi öğretiyorum. Kimse, ama kimse tek başına başarmadı.",
  konum: "İstanbul, Türkiye",
  rol: "Presidential Diamond | One Team Global",
};

export const HAKKIMDA = {
  baslik: "İşim insan, aracım sistem.",
  unvan: "Presidential Diamond | One Team Global",
  paragraflar: [
    "2013'ten beri doğrudan satış sahasındayım. Yedi ayda Diamond, üç buçuk yılda Presidential Diamond oldum. Bu yolda en çok inandığım şey şu: kalıcı büyüme karizmayla değil, herkesin uygulayabildiği net bir sistemle olur.",
    "Kocaeli Üniversitesi Uluslararası İlişkiler mezunuyum; yazarım, evli ve iki çocuk babasıyım. 27 yıldır iş hayatının içindeyim, 17 yıldır kendi işlerimi yapıyorum. 38 ülke gezdim; 4 kıtada 220.000 kişilik bir müşteri ağının kurulmasına vesile oldum. Amerika'dan İngiltere'ye birçok ülkede kişisel gelişim eğitimleri verdim; bugün İstanbul'da yaşıyor, iş insanlarına başarı koçluğu yapıyorum.",
  ],
};

export const YOLCULUK = [
  {
    yil: "2013",
    baslik: "Yedi ayda Diamond",
    aciklama:
      "Şubat'ta başladım, Eylül'de Diamond oldum; aynı yılın sonunda 1 Star Diamond. Hız, doğru sistemin ilk kanıtıydı.",
  },
  {
    yil: "2016",
    baslik: "Presidential Diamond",
    aciklama:
      "Üç buçuk yılda şirketin en üst liderlik seviyesine ulaştım. Asıl iş o gün başladı: aynı yolu ekibime açmak.",
  },
  {
    yil: "2020",
    baslik: "Online sisteme geçiş",
    aciklama:
      "Pandemi döneminde ekibin tamamını online çalışma prensipleriyle uzaktan işleyen bir düzene taşıdım.",
  },
  {
    yil: "2026",
    baslik: "Sapanca liderlik kampı ve Liderlik Aynası",
    aciklama:
      "29 liderle 3 günlük kamp; kamp için sıfırdan geliştirdiğimiz 360° liderlik uygulaması sahada çalıştı.",
  },
  {
    yil: "Sırada",
    baslik: "Çoğalan liderler",
    aciklama:
      "Sıradaki hedef kendi kariyerim değil: ekibimden yeni Diamond'lar ve Presidential Diamond'lar çıkarmak.",
  },
];

export const EGITIMLER = [
  {
    yil: "2020",
    baslik: "Online Çalışma Prensipleri",
    ozet: "Ekibin tamamını uzaktan çalışan bir düzene taşıyan temel prensipler.",
  },
  {
    yil: "2024",
    baslik: "Görüşme ve İhtiyaç Tespiti",
    ozet: "Doğru soruyla başlayan görüşme, doğru ihtiyaçla biten kapanış.",
  },
  {
    yil: "2025",
    baslik: "10X Promosyon Sunumu",
    ozet: "Bir sunumu bilgi aktarımından karar anına dönüştüren kurgu.",
  },
  {
    yil: "2025",
    baslik: "Hızlı Kariyer",
    ozet: "Kariyer basamaklarını bekleyerek değil, planlayarak çıkmak.",
  },
  {
    yil: "2025",
    baslik: "4 Ayda Diamond",
    ozet: "Diamond yolculuğunun ay ay, hafta hafta planlanmış anlatımı.",
  },
  {
    yil: "2025",
    baslik: "Eklemeden Katlamaya Geçmek",
    ozet: "Tek tek üye eklemekten, çoğalan liderler yetiştirmeye geçiş.",
  },
];

export const AYNA = {
  baslik: "Liderlik Aynası",
  aciklama:
    "Sapanca kampı için sıfırdan geliştirdiğimiz 360° liderlik değerlendirme ve kişisel gelişim uygulaması. Üç gün boyunca 29 liderin cebinde çalıştı: görevler, gözlemler ve yapay zeka destekli kişisel pusula.",
  rakamlar: [
    { etiket: "Katılımcı", deger: "29 lider" },
    { etiket: "Süre", deger: "3 gün" },
    { etiket: "Değerlendirme", deger: "360°" },
    { etiket: "Kuruluş", deger: "2026" },
  ],
};

export const ILKELER = [
  {
    baslik: "Sır, lider üretmektir.",
    aciklama:
      "Avcı değil, çiftçi ol. Büyüme üye saymak değildir; kendi ekibini kuran liderler yetiştirdiğinde iş katlanır.",
  },
  {
    baslik: "Nedenin güçlüyse, nasılın önemi kalmaz.",
    aciklama:
      "Nedenini keşfettiğin insana dağları deldirirsin. Her şey inançla başlar, inançla biter.",
  },
  {
    baslik: "İnsanlar sözlerini değil, seni takip eder.",
    aciklama:
      "Ne yaparsan yap, kopyalanır. Yapmadığım şeyi anlatmam; önce yaşar, sonra öğretirim.",
  },
];

// Felsefe bölümünde akan sözler — hepsi transkriptlerden, kendi ağzından.
export const SOZLER = [
  "Kayıt olduğun gün değil, karar verdiğin gün başlarsın.",
  "Kimse, ama kimse tek başına başarmadı.",
  "Motivasyon 72 saatte biter; geriye kalan iradedir.",
  "Bir fırsat, herkes farkındayken fırsat değildir.",
  "Bir şeyin nasıl çalıştığını biliyorsan, onu yönetebilirsin.",
  "Seni durduran, yine sensin.",
  "Daha çok değil, daha akıllı çalış.",
  "Her gün %1, bir yılda %365.",
];

// Rakamlar bölümü — kanıt.
export const RAKAMLAR = [
  { deger: "7", ek: " ay", etiket: "Diamond'a giden süre" },
  { deger: "220.000", ek: "", etiket: "Kişilik müşteri ağı" },
  { deger: "4", ek: " kıta", etiket: "Ulaşılan coğrafya" },
  { deger: "38", ek: " ülke", etiket: "Gezilen, eğitim verilen" },
];

// "Benimle çalışmak" — 3 vaat.
export const VAAT = {
  baslik: "Benimle çalışmak ne demek?",
  maddeler: [
    {
      baslik: "Kanıtlanmış sistem",
      aciklama:
        "Karizmaya değil, herkesin uygulayabildiği net bir düzene güvenirsin. Benim yolumu açan adımların aynısını sana veririm.",
    },
    {
      baslik: "Güçlü ekip kültürü",
      aciklama:
        "Kamplar, eğitimler ve Liderlik Aynası gibi araçlarla yaşayan bir topluluğun parçası olursun. Tek başına değil, birlikte büyürüz.",
    },
    {
      baslik: "Global fırsat",
      aciklama:
        "4 kıtaya yayılmış bir ağın içinde uluslararası büyüme imkânı bulursun. Sınır, haritada değil; kararında.",
    },
  ],
};

// TASLAK referanslar — kullanıcı gerçek isim + unvanla onaylayınca canlıya girer.
// (Sahte sosyal kanıt riskini önlemek için isimler bilerek "…" placeholder.)
export const REFERANSLAR = [
  {
    soz: "Emre'nin en büyük farkı, sahnede anlattığını önce kendi ekibinde yaşamış olması. Onun sistemini uyguladığım gün işim değişti.",
    isim: "…",
    unvan: "Ekibinden bir lider",
  },
  {
    soz: "Bana balık vermedi, balık tutmayı öğretti. Bugün kendi ekibimi kuruyorsam, o 'eklemeden katlamaya' dediği içindir.",
    isim: "…",
    unvan: "İş ortağı",
  },
  {
    soz: "Motivasyon değil, disiplin ve inanç kazandırdı. Yıllar sonra hâlâ onun çerçevesiyle çalışıyorum.",
    isim: "…",
    unvan: "Ekip lideri",
  },
];

export const ILETISIM = {
  baslikSatir1: "Bir sonraki adımını",
  baslikSatir2: "birlikte planlayalım.",
  altMetin:
    "Herkesle çalışmıyorum. Ama gözündeki inancı gören biriysen, WhatsApp'tan bir mesaj at; gerisini konuşuruz.",
};

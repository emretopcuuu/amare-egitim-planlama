// Sitedeki tüm metin ve veri içeriği tek yerde, iki dilli (tr/en).
// Dile bağlı olmayan sabitler üstte; dile bağlı içerik ICERIK altında.

export const EPOSTA = "s.emretopcu@gmail.com";
export const AYNA_URL = "https://ayna.oneteamglobal.ai";
export const INSTAGRAM_URL = "https://instagram.com/emretopcu_official";
// Ön görüşme randevusu hattı (Mehmet Akif Topçu). Uluslararası, + ve boşluk yok.
export const WHATSAPP_NUMARA = "905425090744";
export const WHATSAPP_MESAJ =
  "Merhaba, Emre Topçu ile ön görüşme randevusu almak istiyorum.";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMARA}?text=${encodeURIComponent(
  WHATSAPP_MESAJ,
)}`;
// Kendisi için çekilen tribute videosu (gerçek yüzler, gerçek sözler).
export const TRIBUTE_VIDEO_ID = "WioG82pd_m8";
// Eğitim arşivindeki lider profili (üyeler tüm konuşmaları burada izler).
export const LIDER_PROFIL_URL =
  "https://egitimtakvimi.oneteamglobal.ai/lider/emre_topcu";

export type Dil = "tr" | "en";

const TR = {
  nav: [
    { href: "#manifesto", etiket: "Hakkımda" },
    { href: "#yolculuk", etiket: "Yolculuk" },
    { href: "#konusmalar", etiket: "Konuşmalar" },
  ],
  hero: {
    isim: "Emre Topçu",
    baslikSatir1: "Ekleme değil,",
    baslikSatir2: "katlama.",
    altMetin:
      "Bu sektörde herkes eklemeyi bir şekilde keşfeder. Katlanacağını ise sadece umar — en büyük oyuncular dahil. Kimse, ama kimse tek başına başarmadı.",
    rol: "Presidential Diamond | One Team Global",
  },
  hakkimda: {
    unvan: "Presidential Diamond | One Team Global",
    paragraflar: [
      "Doğrudan satışla tanışıklığım 2003'e, üniversite yıllarıma kadar uzanır; bir aloe vera markasının distribütörü olarak katalogla çalışmayı öğrendim. Bugünkü işime Şubat 2013'te başladım: sekiz ayda Diamond, üç buçuk yılda Presidential Diamond oldum. Bu yolda en çok inandığım şey şu: kalıcı büyüme karizmayla değil, herkesin uygulayabildiği net bir sistemle olur.",
      "Kocaeli Üniversitesi Uluslararası İlişkiler mezunuyum; yazarım, evli ve iki çocuk babasıyım. 27 yıldır iş hayatının içindeyim, 17 yıldır kendi işlerimi yapıyorum. 38 ülke gezdim; 4 kıtada 250.000'e yakın kişilik bir müşteri ağının kurulmasına vesile oldum. Amerika'dan İngiltere'ye birçok ülkede kişisel gelişim eğitimleri verdim; bugün İstanbul'da yaşıyor, iş insanlarına başarı koçluğu yapıyorum.",
    ],
  },
  teori: {
    etiket: "Sektörün söylenmeyen gerçeği",
    ana: "Bu iş ekleme işi değil, katlama işidir.",
    alt: "Fakat eklemeyi öğrenmeden katlamayı başarma şansın olmaz. Bu sektörde çoğu insan işin sadece ekleme kısmını keşfeder; katlanacağını sadece umar. Buna sektörün en büyük oyuncuları da dahil.",
    imza: "İlk 72 Saat, 2017",
  },
  liderTipleri: {
    baslik: "Üç çeşit lider vardır.",
    altMetin: "Hangisi olduğun, nereye varacağını belirler.",
    tipler: [
      {
        baslik: "Şans eseri liderleşen",
        aciklama:
          "İşi bir şans oyunu zanneder. İşler ters gidince sektöre küser, uzaklaşır.",
      },
      {
        baslik: "Aşırı çalışkanlıkla liderleşen",
        aciklama:
          "Farkında olmadan bazı doğruları yapar. Ama sorun çıkınca kendinde değil, firmada ya da üründe arar; itibarını harcar, yıllar içinde kendini yok eder.",
      },
      {
        baslik: "Formülü bilen",
        aciklama:
          "Bir kere yapsa yüz kere de, bin kere de yapabilir. Sistem kurmayı ve nasıl işlediğini bilir. Sektörün vadettiği hayatı gerçekten bunlar yaşar.",
      },
    ],
  },
  oneteamPerde: {
    etiket: "Yalnız gitmek",
    ana: "Doğrudan satışı düşünüyorsan iki yolun var.",
    alt: "Formülü yıllarını vererek kendin çözersin, ya da çözülmüş halinin içine doğarsın. Biz OneTeam'de sistemler kuruyoruz — başarı, kişinin kabiliyetine bağımlı olmasın diye.",
  },
  kapanisCumlesi:
    "Bu benim hikâyem. Belki bugün senin hikâyenin başlangıcıdır.",
  katlamaSeridi: {
    etiket: "Ekleme değil, katlama — rakamla",
    adimlar: [
      { deger: "5", etiket: "İlk ay el sıkıştığım kişi" },
      { deger: "19", etiket: "İlk ay sonu, ağ" },
      { deger: "88", etiket: "İkinci ay, ağ" },
      { deger: "250.000", etiket: "Bugün, ağ (2026)" },
    ],
  },
  yolculuk: [
    {
      yil: "2003",
      baslik: "Doğrudan satışla ilk tanışma",
      aciklama:
        "Üniversite birinci sınıftayken babam iflas etti; bu beni sorumluluk almaya zorladı. Kapı kapı su arıtma cihazı sattım, sonra bir aloe vera markasının distribütörlüğünü yaptım. Katalog modelini sevmedim ama bu dünyanın büyük işler çıkarabileceğini o yıllarda gördüm.",
    },
    {
      yil: "2013",
      baslik: "Sekiz ayda Diamond",
      aciklama:
        "Şubat'ta başladım, 8. ayda Diamond oldum; aynı yılın sonunda 1 Star Diamond. İlk ay 5 kişiyle el sıkıştım, ay sonunda 19 kişilik bir ağ oldu; ikinci ayda 88'e katlandı. Hız, doğru sistemin ilk kanıtıydı.",
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
  ],
  rakamlar: [
    { deger: "8", ek: " ay", etiket: "Diamond'a giden süre" },
    { deger: "250.000", ek: "", etiket: "Kişilik ağ (2026 itibarıyla)" },
    { deger: "4", ek: " kıta", etiket: "Ulaşılan coğrafya" },
    { deger: "38", ek: " ülke", etiket: "Gezilen, eğitim verilen" },
  ],
  gercekler: {
    etiket: "Kimsenin söylemediği gerçekler",
    baslik: "Doğrudan satışı düşünüyorsan önce bunları bil.",
    altMetin:
      "Bunlar iddia değil; yıllardır sahnede anlattığım, kendi ekibime öğrettiğim gerçekler.",
    kartlar: [
      {
        baslik: "80 / 15 / 5",
        aciklama:
          "Zamanının %80'i görüşmeye, sunuma, takibe gider — sonucun sadece %5'i oradan gelir. Zamanının %5'i toplantıya, kampa gider — sonucun %80'i oradan gelir. Çoğu kişi bunu bilmediği için yanlış yerde çok çalışır.",
      },
      {
        baslik: "Motivasyonun raf ömrü 72 saattir",
        aciklama:
          "İlk gün heyecan doruktadır, üçüncü gün unutmuşsundur. Bu normaldir. Motivasyonu değil, iradeyi ve alışkanlığı yönetmen gerekir.",
      },
      {
        baslik: "İnsanlar işe hayır demez",
        aciklama:
          "İnsanlar sana, ürüne ya da firmaya hayır demez. Sana evet dediklerinde yapacakları şeye hayır derler. O şeyi nasıl yaptığın, işin prestijini belirler.",
      },
      {
        baslik: "Neyin işe yaradığı değil, neyin kopyalanabildiği önemlidir",
        aciklama:
          "Karizman, yeteneğin, network'ün işe yarayabilir — ama kopyalanamıyorsa ekibine öğretemezsin. Katlama, kopyalanabilirlikle başlar.",
      },
      {
        baslik: "Asıl itibarsız olan iş değil, yapılış şeklidir",
        aciklama:
          "Elinde katalogla avcı gibi peşinden koşmak eskidendi. Bu iş artık tavsiye ticareti; sen kimseyi rahatsız etmek zorunda değilsin.",
      },
      {
        baslik: "Eforun azaldıkça gelirin artması gerekir",
        aciklama:
          "Bir işte gelirin arttıkça eforun da artıyorsa, yanlış bir model kurmuşsundur. Doğru sistemde tam tersi olur.",
      },
    ],
  },
  sss: {
    baslik: "Sorular ve cevaplar",
    altMetin: "Bunları herkes sorar. İşte kendi cevaplarım.",
    sorular: [
      {
        soru: "Param yok, nasıl başlayayım?",
        cevap:
          "Seni anlıyorum, benim de başladığımda ciddi mali sıkıntılarım vardı. Ama şunu fark ettim: sorun hiçbir zaman gerçekten para değil. Öncelik sıralamanda yeterince üst sıradaysa, parayı bir şekilde bulursun.",
      },
      {
        soru: "Çevrem yok, kiminle çalışacağım?",
        cevap:
          "Bu iş çevre işi değil. Kendi çevrende başlar, el sıkıştığın kişilerin çevresiyle katlanarak büyür. Ben ilk ay sadece 5 kişiyle el sıkıştım; bir yıl içinde bu ağ katlanarak büyüdü.",
      },
      {
        soru: "Zamanım yok.",
        cevap:
          "Önce şunu sor kendine: bu işten minimum ne kadar kazansan gerçekten heyecanlanırdın? Sonra: buna ne kadar sürede ulaşmak isterdin? Cevap genelde zamanın olmadığı değil, önceliğin netleşmediğidir.",
      },
      {
        soru: "Doğrudan satış mı, saadet zinciri mi? Nasıl ayırt ederim?",
        cevap:
          "Üç soru sor: Ortada gerçek, kullanılan bir ürün var mı? Kazanç, o ürünün gerçek tüketiminden mi geliyor? Yoksa yalnızca yeni kayıttan mı? Cevaplar netse korkacak bir şey yok; net değilse uzak dur.",
      },
      {
        soru: "Bir işi nasıl değerlendirmeliyim?",
        cevap:
          "Ben her işe girerken beş şeye bakarım: Talep var mı? Kaliteli bir ürün var mı? Ortağıma güvenebilir miyim? Riskim ve yatırımım ne? Ve en önemlisi — bensiz de yürüyecek bir sistem var mı?",
      },
    ],
  },
  sozler: [
    "Kayıt olduğun gün değil, karar verdiğin gün başlarsın.",
    "Kimse, ama kimse tek başına başarmadı.",
    "Motivasyon 72 saatte biter; geriye kalan iradedir.",
    "Bir fırsat, herkes farkındayken fırsat değildir.",
    "Bir şeyin nasıl çalıştığını biliyorsan, onu yönetebilirsin.",
    "Seni durduran, yine sensin.",
    "Daha çok değil, daha akıllı çalış.",
    "Her gün %1, bir yılda %365.",
    "Ticaretin en büyük sırrı: eforun azaldıkça gelirin artmasıdır.",
    "İnsanlar sana değil, evet dedikleri zaman yapacakları şeye hayır der.",
    "Neyin işe yaradığı değil, neyin kopyalanabildiği önemlidir.",
  ],
  konusmalar: [
    {
      baslik: "Eklemeden Katlamaya",
      ozet: "Tek tek üye eklemekten, çoğalan liderler yetiştirmeye geçişin haritası.",
    },
    {
      baslik: "Neden – İnanç – Plan",
      ozet: "Nedenini keşfeden insanın nasılına ihtiyacı kalmaz. İnancın plana dönüşmesi.",
    },
    {
      baslik: "Başarı Döngüsü",
      ozet: "Kimse tek başına başarmadı. Takımı büyüten, kendini çoğaltan sistem.",
    },
    {
      baslik: "Cesur Adımlar",
      ozet: "Kazancına göre yaşamak mı, yaşamak istediğin hayata göre kazanmak mı?",
    },
    {
      baslik: "%100 Başarının Formülü",
      ozet: "Motivasyon 72 saatte biter; geriye kalan irade, disiplin ve 90 günlük dönüşüm.",
    },
  ],
  egitimler: [
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
  ],
  vaat: {
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
  },
  ilkeler: [
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
  ],
  deyince: {
    baslik1: "“Emre Topçu” deyince",
    baslik2: "akla ne geliyor?",
    altMetin:
      "Aşağıdakiler bizim iddiamız değil; onu tanıyanların kendi cümleleri.",
    videoAciklama:
      "Bu sözler bir doğum günü için, onu tanıyanlar tarafından çekildi. Rakamların anlatamadığını, bu yüzler anlatıyor.",
    sozler: [
      "Google'a 'adam' yazınca ismi çıkan şahsiyet.",
      "İstatistiksel olarak yüz binde bir çıkıyorsun.",
      "Büyük bir topluluğa ne anlatmak istediğini nokta atışı yapan adam.",
      "İnsanları etkileme ve dost kazanma sanatı.",
      "Onu kelimelerle tarif etmek mümkün değil.",
      "Gerçek bir lider.",
    ],
    kelimeler: [
      "Samimiyet",
      "Dürüstlük",
      "Dirayet",
      "Liderlik",
      "Adanmışlık",
      "Çalışkanlık",
      "Güven",
      "Adamlık",
      "Dostluk",
      "Yardımseverlik",
      "Mütevazilik",
      "Özveri",
      "İnanmışlık",
      "Doğallık",
      "Vazgeçmemek",
    ],
  },
  iletisim: {
    baslikSatir1: "Bir sonraki adımını",
    baslikSatir2: "birlikte planlayalım.",
    altMetin:
      "Ön görüşme randevusu için WhatsApp'tan yaz. Bana doğrudan ulaşmak istersen Instagram'dan mesaj at.",
  },
  ui: {
    calis: "Benimle çalış",
    hikaye: "Hikayeyi gör",
    yolculukBaslik: "Yolculuk",
    rakamlarBaslik: "Rakamlar konuşur, gerisi teferruat.",
    konusmalarBaslik: "Öne çıkan konuşmalar",
    konusmalarAlt:
      "Yıllardır sahnede anlattığım, ekibimin defalarca dinlediği imza konuşmalar.",
    tumKonusmalar: "Tüm konuşmalar",
    egitimlerBaslik: "Sahneden seçmeler",
    egitimlerAlt:
      "Ekip içi eğitim arşivinden bazı başlıklar. Hepsi sahada denenmiş içerik.",
    ilkelerBaslik: "Üç ilke",
    izle: "İzle",
    instagram: "Instagram",
    aynaLink: "Liderlik Aynası",
  },
};

export type Icerik = typeof TR;

const EN: Icerik = {
  nav: [
    { href: "#manifesto", etiket: "About" },
    { href: "#yolculuk", etiket: "Journey" },
    { href: "#konusmalar", etiket: "Talks" },
  ],
  hero: {
    isim: "Emre Topçu",
    baslikSatir1: "Not adding.",
    baslikSatir2: "Multiplying.",
    altMetin:
      "In this industry everyone discovers how to add sooner or later. Whether it multiplies, they only hope — even the biggest players. No one, but no one, ever made it alone.",
    rol: "Presidential Diamond | One Team Global",
  },
  hakkimda: {
    unvan: "Presidential Diamond | One Team Global",
    paragraflar: [
      "My history with direct sales goes back to 2003, my university years, when I distributed an aloe vera brand through a catalog model. I started my current business in February 2013: Diamond in eight months, Presidential Diamond in three and a half years. What I believe most on this path: lasting growth comes not from charisma, but from a clear system anyone can apply.",
      "I'm a graduate of International Relations at Kocaeli University; a writer, married, father of two. I've been in business for 27 years, running my own ventures for 17. I've traveled to 38 countries and helped build a customer network of nearly 250,000 people across 4 continents. I've given personal-development trainings in many countries from the US to the UK; today I live in Istanbul and coach business people toward success.",
    ],
  },
  teori: {
    etiket: "The industry's unspoken truth",
    ana: "This isn't an adding business. It's a multiplying one.",
    alt: "But you can't master multiplying until you've learned adding. Most people in this industry only ever discover the adding part; they just hope it multiplies. That includes the industry's biggest players.",
    imza: "İlk 72 Saat (First 72 Hours), 2017",
  },
  liderTipleri: {
    baslik: "There are three kinds of leaders.",
    altMetin: "Which one you are decides where you end up.",
    tipler: [
      {
        baslik: "The lucky one",
        aciklama:
          "Treats the business as a game of chance. When things go wrong, they get bitter and walk away.",
      },
      {
        baslik: "The overworked one",
        aciklama:
          "Does some things right without knowing why. When something breaks, they blame the company or the product, burn their reputation, and wear themselves out over the years.",
      },
      {
        baslik: "The one who knows the formula",
        aciklama:
          "If they can do it once, they can do it a hundred times, a thousand times. They know how to build a system and how it works. They're the ones who actually live what the industry promises.",
      },
    ],
  },
  oneteamPerde: {
    etiket: "Going it alone",
    ana: "If you're considering direct sales, you have two paths.",
    alt: "Spend years solving the formula yourself, or be born into one that's already solved. At OneTeam we build systems — so success doesn't depend on any one person's talent.",
  },
  kapanisCumlesi:
    "This is my story. Maybe today it's the beginning of yours.",
  katlamaSeridi: {
    etiket: "Not adding, multiplying — in numbers",
    adimlar: [
      { deger: "5", etiket: "People I shook hands with, month 1" },
      { deger: "19", etiket: "Network by end of month 1" },
      { deger: "88", etiket: "Network by month 2" },
      { deger: "250,000", etiket: "Network today (2026)" },
    ],
  },
  yolculuk: [
    {
      yil: "2003",
      baslik: "First encounter with direct sales",
      aciklama:
        "In my first year of university my father went bankrupt; it forced me to take on responsibility. I sold water-purifier units door to door, then distributed an aloe vera brand. I didn't love the catalog model, but I saw then what this world could build.",
    },
    {
      yil: "2013",
      baslik: "Diamond in eight months",
      aciklama:
        "I started in February and became Diamond by month 8; 1 Star Diamond by year's end. In month one I shook hands with 5 people and closed the month with a network of 19; by month two it had multiplied to 88. Speed was the first proof of the right system.",
    },
    {
      yil: "2016",
      baslik: "Presidential Diamond",
      aciklama:
        "In three and a half years I reached the company's highest leadership rank. The real work began that day: opening the same path for my team.",
    },
    {
      yil: "2020",
      baslik: "Moving the system online",
      aciklama:
        "During the pandemic I moved the entire team onto a remote-first system built on online working principles.",
    },
    {
      yil: "2026",
      baslik: "Sapanca leadership camp & Leadership Mirror",
      aciklama:
        "A 3-day camp with 29 leaders; the 360° leadership app we built from scratch ran live in the field.",
    },
    {
      yil: "Next",
      baslik: "Multiplying leaders",
      aciklama:
        "The next goal isn't my own career: it's raising new Diamonds and Presidential Diamonds from my team.",
    },
  ],
  rakamlar: [
    { deger: "8", ek: " mo", etiket: "Months to Diamond" },
    { deger: "250,000", ek: "", etiket: "People in the network (as of 2026)" },
    { deger: "4", ek: "", etiket: "Continents reached" },
    { deger: "38", ek: "", etiket: "Countries visited & taught" },
  ],
  gercekler: {
    etiket: "What no one tells you",
    baslik: "If you're considering direct sales, know this first.",
    altMetin:
      "These aren't claims — they're what I've taught on stage for years, what I teach my own team.",
    kartlar: [
      {
        baslik: "80 / 15 / 5",
        aciklama:
          "80% of your time goes to meetings, presentations, follow-ups — you get only 5% of your results from there. 5% of your time goes to meetings and camps — you get 80% of your results from there. Most people work hard in the wrong place because they don't know this.",
      },
      {
        baslik: "Motivation has a 72-hour shelf life",
        aciklama:
          "Day one, excitement peaks. Day three, you've forgotten it. That's normal. You don't manage motivation — you manage willpower and habit.",
      },
      {
        baslik: "People don't say no to the business",
        aciklama:
          "People don't say no to you, the product, or the company. They say no to what saying yes would require of them. How you ask determines the business's prestige.",
      },
      {
        baslik: "What matters isn't what works — it's what can be copied",
        aciklama:
          "Your charisma, talent, network — they might work for you. But if your team can't copy it, you can't teach it. Multiplying starts with copyability.",
      },
      {
        baslik: "It's not the business that lacks prestige — it's how it's done",
        aciklama:
          "Chasing people around with a catalog was the old way. This is referral commerce now; you're never obligated to bother anyone.",
      },
      {
        baslik: "Income should rise as effort falls",
        aciklama:
          "If your income only grows when your effort grows too, you've built the wrong model. In the right system, it's the opposite.",
      },
    ],
  },
  sss: {
    baslik: "Questions and answers",
    altMetin: "Everyone asks these. Here are my own answers.",
    sorular: [
      {
        soru: "I have no money — how do I start?",
        cevap:
          "I understand — I had serious financial pressure when I started too. But here's what I learned: money is never really the problem. If it's high enough on your priority list, you find a way.",
      },
      {
        soru: "I don't have a network — who will I work with?",
        cevap:
          "This isn't a networking game. It starts with the people you already know and multiplies through the people they know. I shook hands with just 5 people in my first month; within a year that network had multiplied many times over.",
      },
      {
        soru: "I don't have time.",
        cevap:
          "First ask yourself: what's the minimum you'd need to earn from this to be genuinely excited? Then: how soon would you want that? Usually it's not time that's missing — it's a clear priority.",
      },
      {
        soru: "Direct sales or pyramid scheme — how do I tell the difference?",
        cevap:
          "Ask three questions: Is there a real product people actually use? Does the income come from real consumption of that product — or only from new sign-ups? If the answers are clear, there's nothing to fear. If they're not, stay away.",
      },
      {
        soru: "How should I evaluate any business?",
        cevap:
          "I look at five things before entering any business: Is there real demand? Is there a quality product? Can I trust my partner? What's my risk and investment? And most importantly — is there a system that runs even without me?",
      },
    ],
  },
  sozler: [
    "You don't start the day you sign up; you start the day you decide.",
    "No one, but no one, ever made it alone.",
    "Motivation runs out in 72 hours; what remains is willpower.",
    "An opportunity isn't one once everyone sees it.",
    "If you know how something works, you can lead it.",
    "The one stopping you is you.",
    "Don't work more; work smarter.",
    "1% every day is 365% in a year.",
    "The real secret of business: income rises as effort falls.",
    "People don't say no to you — they say no to what saying yes would mean.",
    "What matters isn't what works. It's what can be copied.",
  ],
  konusmalar: [
    {
      baslik: "From Adding to Multiplying",
      ozet: "The map from adding members one by one to raising multiplying leaders.",
    },
    {
      baslik: "Why – Belief – Plan",
      ozet: "One who finds their why no longer needs the how. Turning belief into a plan.",
    },
    {
      baslik: "The Success Loop",
      ozet: "No one made it alone. The system that grows the team and multiplies you.",
    },
    {
      baslik: "Bold Steps",
      ozet: "Living within your income, or earning toward the life you truly want?",
    },
    {
      baslik: "The 100% Formula",
      ozet: "Motivation ends in 72 hours; what's left is will, discipline and a 90-day transformation.",
    },
  ],
  egitimler: [
    {
      yil: "2020",
      baslik: "Online Working Principles",
      ozet: "The core principles that moved the whole team to a remote-first way of working.",
    },
    {
      yil: "2024",
      baslik: "Meeting & Needs Analysis",
      ozet: "A meeting that opens with the right question and closes with the right need.",
    },
    {
      yil: "2025",
      baslik: "The 10X Promotion Talk",
      ozet: "Turning a presentation from information transfer into a moment of decision.",
    },
    {
      yil: "2025",
      baslik: "Fast Career",
      ozet: "Climbing the career ladder by planning, not by waiting.",
    },
    {
      yil: "2025",
      baslik: "4 Months to Diamond",
      ozet: "The Diamond journey mapped month by month, week by week.",
    },
    {
      yil: "2025",
      baslik: "From Adding to Multiplying",
      ozet: "Moving from adding members one by one to raising multiplying leaders.",
    },
  ],
  vaat: {
    baslik: "What does working with me mean?",
    maddeler: [
      {
        baslik: "A proven system",
        aciklama:
          "You rely on a clear system anyone can apply, not on charisma. I give you the exact steps that opened my own path.",
      },
      {
        baslik: "A strong team culture",
        aciklama:
          "You become part of a living community shaped by camps, trainings and tools like Leadership Mirror. We grow together, not alone.",
      },
      {
        baslik: "A global opportunity",
        aciklama:
          "You find international growth inside a network spread across 4 continents. The limit isn't on the map; it's in your decision.",
      },
    ],
  },
  ilkeler: [
    {
      baslik: "The secret is producing leaders.",
      aciklama:
        "Be a farmer, not a hunter. Growth isn't counting members; when you raise leaders who build their own teams, the work multiplies.",
    },
    {
      baslik: "If your why is strong, the how doesn't matter.",
      aciklama:
        "Give someone their why and they'll move mountains. Everything begins with belief and ends with belief.",
    },
    {
      baslik: "People follow you, not your words.",
      aciklama:
        "Whatever you do gets copied. I don't teach what I haven't lived; I live it first, then I teach it.",
    },
  ],
  deyince: {
    baslik1: "When you say “Emre Topçu”",
    baslik2: "what comes to mind?",
    altMetin:
      "These aren't our claims; they're the words of the people who know him.",
    videoAciklama:
      "These words were filmed for a birthday by the people who know him. What the numbers can't say, these faces do.",
    sozler: [
      "The person whose name comes up when you Google 'a real man'.",
      "Statistically, you show up one in a hundred thousand.",
      "A man who hits the exact point of what he wants to tell a large crowd.",
      "The art of influencing people and winning friends.",
      "You can't describe him with words.",
      "A true leader.",
    ],
    kelimeler: [
      "Sincerity",
      "Honesty",
      "Fortitude",
      "Leadership",
      "Dedication",
      "Diligence",
      "Trust",
      "Integrity",
      "Friendship",
      "Helpfulness",
      "Humility",
      "Devotion",
      "Conviction",
      "Authenticity",
      "Never giving up",
    ],
  },
  iletisim: {
    baslikSatir1: "Let's plan your next step",
    baslikSatir2: "together.",
    altMetin:
      "Message on WhatsApp to book an intro call. If you'd like to reach me directly, write on Instagram.",
  },
  ui: {
    calis: "Work with me",
    hikaye: "See the story",
    yolculukBaslik: "Journey",
    rakamlarBaslik: "The numbers speak. The rest is detail.",
    konusmalarBaslik: "Featured talks",
    konusmalarAlt:
      "Signature talks I've given on stage for years, heard by my team over and over.",
    tumKonusmalar: "All talks",
    egitimlerBaslik: "From the stage",
    egitimlerAlt:
      "A few titles from the internal training archive. All field-tested.",
    ilkelerBaslik: "Three principles",
    izle: "Watch",
    instagram: "Instagram",
    aynaLink: "Leadership Mirror",
  },
};

export const ICERIK: Record<Dil, Icerik> = { tr: TR, en: EN };

// Sitedeki tüm metin ve veri içeriği tek yerde, dört dilli (tr/en/ru/az).
// Dile bağlı olmayan sabitler üstte; dile bağlı içerik ICERIK altında.
// RU/AZ içerikleri ayrı dosyalarda (tip-yalnız döngü; sorun değil).
import { DE } from "./icerikDe";
import { ES } from "./icerikEs";
import { RU } from "./icerikRu";
import { AZ } from "./icerikAz";

export const EPOSTA = "s.emretopcu@gmail.com";
export const INSTAGRAM_URL = "https://instagram.com/emretopcu_official";
// Ön görüşme randevusu hattı (Mehmet Akif Topçu). Uluslararası, + ve boşluk yok.
export const WHATSAPP_NUMARA = "905425090744";
export const WHATSAPP_MESAJ =
  "Merhaba, Emre Topçu ile ön görüşme randevusu almak istiyorum.";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMARA}?text=${encodeURIComponent(
  WHATSAPP_MESAJ,
)}`;
// Akıllı CTA: mesaja hangi bölümden gelindiğini ekler; Emre hangi içeriğin ikna
// ettiğini görür (izleme çerezi yok, veri yalnızca mesajın kendisinde).
export function whatsappUrl(kaynak?: string) {
  const mesaj = kaynak ? `${WHATSAPP_MESAJ} [${kaynak}]` : WHATSAPP_MESAJ;
  return `https://wa.me/${WHATSAPP_NUMARA}?text=${encodeURIComponent(mesaj)}`;
}
// Kitabın yeni baskısı için ilgi listesi (backend yok; WhatsApp üzerinden).
export function kitapHaberUrl(dil: Dil = "tr") {
  const m =
    dil === "en"
      ? "Hi, please let me know when the new edition of İlk 72 Saat is out."
      : "Merhaba, 'İlk 72 Saat' yeni baskısı çıkınca haber vermeni isterim.";
  return `https://wa.me/${WHATSAPP_NUMARA}?text=${encodeURIComponent(m)}`;
}
// Bülten kaydı (backend yok; e-posta ile). İleride bir form servisine bağlanabilir.
export function bultenMailto(konu: string, govde: string) {
  return `mailto:${EPOSTA}?subject=${encodeURIComponent(konu)}&body=${encodeURIComponent(govde)}`;
}
// Kendisi için çekilen tribute videosu (gerçek yüzler, gerçek sözler).
export const TRIBUTE_VIDEO_ID = "WioG82pd_m8";
// Eğitim arşivindeki lider profili (üyeler tüm konuşmaları burada izler).
export const LIDER_PROFIL_URL =
  "https://egitimtakvimi.oneteamglobal.ai/lider/emre_topcu";
// Resmi YouTube kanalı (haftalık kısa videolar).
export const YOUTUBE_KANAL_URL = "https://www.youtube.com/@emretopcuofficial";

export type Dil = "tr" | "en" | "de" | "es" | "ru" | "az";

// Ek dil içerikleri en üstte import edilir (döngü değil; tip-yalnız).

// Dil kodu → BCP-47 yerel (sayı biçimlendirme için).
export const YEREL: Record<Dil, string> = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  es: "es-ES",
  ru: "ru-RU",
  az: "az-Latn-AZ",
};
// Dil kodu → sayfa yolu.
export const DIL_YOL: Record<Dil, string> = {
  tr: "/",
  en: "/en",
  de: "/de",
  es: "/es",
  ru: "/ru",
  az: "/az",
};
export const DIL_ETIKET: Record<Dil, string> = {
  tr: "TR",
  en: "EN",
  de: "DE",
  es: "ES",
  ru: "RU",
  az: "AZ",
};

const TR = {
  nav: [
    { href: "#manifesto", etiket: "Hakkımda" },
    { href: "#yolculuk", etiket: "Yolculuk" },
    { href: "#videolar", etiket: "Videolar" },
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
      yil: "2016–2020",
      baslik: "Presidential Diamond ve online'a geçiş",
      aciklama:
        "Üç buçuk yılda şirketin en üst liderlik seviyesine ulaştım; asıl iş o gün başladı, aynı yolu ekibime açmak. Pandemi döneminde ekibin tamamını online çalışma prensipleriyle uzaktan işleyen bir düzene taşıdım.",
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
        baslik: "Neyin işe yaradığı değil, neyin kopyalanabildiği önemlidir",
        aciklama:
          "Karizman, yeteneğin, network'ün işe yarayabilir — ama kopyalanamıyorsa ekibine öğretemezsin. Katlama, kopyalanabilirlikle başlar.",
      },
    ],
    kartlarEk: [
      {
        baslik: "İnsanlar işe hayır demez",
        aciklama:
          "İnsanlar sana, ürüne ya da firmaya hayır demez. Sana evet dediklerinde yapacakları şeye hayır derler. O şeyi nasıl yaptığın, işin prestijini belirler.",
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
    daha: "Daha fazla gerçek gör",
    az: "Daha az göster",
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
    {
      slug: "karar",
      soz: "Kayıt olduğun gün değil, karar verdiğin gün başlarsın.",
      arka: "Büyük kararlar büyük toplantılarda alınır. İşe kayıt olduğun gün değil, o kararı verdiğin gün başlarsın. — İlk 72 Saat, 2017",
    },
    {
      slug: "lider",
      soz: "Sır, lider üretmektir.",
      arka: "Avcı değil, çiftçi ol. Büyüme üye saymak değildir; kendi ekibini kuran liderler yetiştirdiğinde iş katlanır.",
    },
    {
      slug: "neden",
      soz: "Nedenin güçlüyse, nasılın önemi kalmaz.",
      arka: "Nedenini keşfettiğin insana dağları deldirirsin. Her şey inançla başlar, inançla biter.",
    },
    {
      slug: "engel",
      soz: "Seni durduran, yine sensin.",
      arka: "Engel nedeninden büyükse pes edersin; nedenin engelinden büyükse bir yolunu bulursun. — İlk 72 Saat, 2017",
    },
    {
      slug: "takip",
      soz: "İnsanlar sözlerini değil, seni takip eder.",
      arka: "Ne yaparsan yap, kopyalanır. Yapmadığım şeyi anlatmam; önce yaşar, sonra öğretirim.",
    },
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
  surec: {
    baslik: "Benimle çalışmak nasıl başlar?",
    adimlar: [
      {
        baslik: "Tanışma görüşmesi",
        aciklama:
          "WhatsApp'tan tek mesaj; 15-20 dakikalık, ısrarsız bir ön görüşme.",
      },
      {
        baslik: "Sistemi birlikte inceleriz",
        aciklama:
          "Kampları, eğitim arşivini ve kurduğumuz araçları kendin görürsün. Karar tamamen senin.",
      },
      {
        baslik: "İlk 72 saat planın",
        aciklama:
          "Başlarsan boşluğa düşmezsin: kitabını yazdığım başlangıç sistemiyle ilk adımların gün gün planlanır.",
      },
      {
        baslik: "Sahaya birlikte çıkarız",
        aciklama:
          "İlk görüşmelerinde yalnız değilsin; ekip, toplantılar ve kamplarla momentum ilk aydan kurulur.",
      },
    ],
  },
  deyince: {
    baslik1: "“Emre Topçu” deyince",
    baslik2: "akla ne geliyor?",
    altMetin:
      "Aşağıdakiler bizim iddiamız değil; onu tanıyanların kendi cümleleri.",
    videoAciklama:
      "Bu sözler bir doğum günü için, onu tanıyanlar tarafından çekildi. Rakamların anlatamadığını, bu yüzler anlatıyor.",
    sozler: [
      "Google'a 'adam' yazınca ismi çıkan şahsiyet.",
      "Onu kelimelerle tarif etmek mümkün değil.",
      "Gerçek bir lider.",
    ],
  },
  videolar: {
    baslik: "Kamera karşısında",
    altMetin:
      "Sahnede ve stüdyoda; doğrudan satışın inceliklerini adım adım anlattığım eğitimler.",
    kanalNot: "Her hafta yeni kısa videolar YouTube kanalımda.",
    kanalEtiket: "YouTube kanalım",
    liste: [
      {
        platform: "vimeo" as const,
        id: "318263164",
        gorsel: "/video/nedenleriniz.webp",
        baslik: "Nedenleriniz",
        ozet: "Neden bu işi yapıyorsun? Cevabı netleşen insanın nasıla ihtiyacı kalmaz.",
        sure: "37 dk",
      },
      {
        platform: "vimeo" as const,
        id: "186525853",
        gorsel: "/video/dogru-kapanis.webp",
        baslik: "Doğru Kapanış",
        ozet: "Görüşmeyi karar anına taşıyan, ısrarsız ve net kapanışın adımları.",
        sure: "12 dk",
      },
      {
        platform: "vimeo" as const,
        id: "236547639",
        gorsel: "/video/grup-olusturma.webp",
        baslik: "Başarılı Grup Oluşturmanın Püf Noktaları",
        ozet: "Ekleme değil katlama: kendi ekibini kuran liderleri nasıl yetiştirirsin?",
        sure: "25 dk",
      },
      {
        platform: "vimeo" as const,
        id: "375546683",
        gorsel: "/video/teknik-egitim.webp",
        baslik: "Teknik Eğitim: Davet, Sunum, Kapanış, Takip",
        ozet: "İşin dört temel adımını baştan sona işleyen kapsamlı saha eğitimi.",
        sure: "78 dk",
      },
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
    yolculukBaslik: "Yolculuk",
    rakamlarBaslik: "Rakamlar konuşur, gerisi teferruat.",
    sahneBaslik: "Sahneden",
    sahneAlt:
      "Yıllardır sahnede anlattığım imza konuşmalar ve ekip içi eğitim arşivinden başlıklar.",
    tumKonusmalar: "Tüm konuşmalar",
    izle: "İzle",
    instagram: "Instagram",
    whatsappNot: "Mesajın ön görüşme hattına düşer; aynı gün dönüş alırsın.",
    videoSure: "2 dk",
    basaDon: "Başa dön",
    menuAc: "Menü",
    menuKapat: "Kapat",
    kaydir: "Kaydır",
    sozIpucu: "Söze dokun",
    simBasla: "Bir kişiyle el sıkış",
    simKatla: "Katla",
    simSifirla: "Baştan",
    simSon: "İşte katlama. Ben bunu 250.000 kez yaşadım.",
    mektupNot: "Ön görüşme için tek mesaj yeter.",
    footerFelsefe: "Kimse, ama kimse tek başına başarmadı.",
    fasillar: [
      "Hakkımda",
      "Teori",
      "Rakamlar",
      "Yolculuk",
      "Gerçekler",
      "Sözler",
      "Konuşmalar",
      "Videolar",
      "İletişim",
    ],
    baglantiKopyala: "Bu bölümün bağlantısını kopyala",
    baglantiKopyalandi: "Bağlantı kopyalandı",
    saatIcinde: "İlk 72 saatinin {s}. saatindesin.",
    saatDoldu: "İlk 72 saatin doldu. Kararı hâlâ sen verirsin.",
    kariyerKaydirBaslik: "2013'ten bugüne — kaydır",
    dogrulamaKisa: "Resmî lider profili",
    sozKartPaylas: "Sözü paylaş",
    sozKartIndir: "Kartı indir",
    medyaLink: "Medya kiti",
    dusunuyorumLink: "Doğrudan satışı mı düşünüyorsun?",
    alintila: "Kartla paylaş",
    sozKartStory: "Story kartı",
    ambiyansAc: "Ortam sesini aç",
    ambiyansKapat: "Ortam sesini kapat",
    devamBaslik: "Tekrar hoş geldin. Kaldığın yer:",
    devamDugme: "Devam et",
    sorBaslik: "Emre'ye sor",
    sorAlt: "Sorunu yaz; cevabı Emre'nin kendi anlattıklarından bulayım.",
    sorYaz: "Örn: Param yok, nasıl başlarım?",
    sorBos: "Bu soruya buradaki metinlerde net bir cevap yok — WhatsApp'tan doğrudan sor.",
    sonEtiket: "En yeni video",
    planLink: "İlk 72 saat planı",
    salonNot: "Bu ekran sahne içindir.",
  },
  proj: {
    baslik: "Kendi katlamanı gör",
    alt: "Ben ilk ay 5 kişiyle el sıkıştım. Sen ayda kaç kişiyle el sıkışırdın?",
    kisiEtiket: "kişi / ay",
    ay6: "6. ay ağın",
    ay12: "12. ay ağın",
    uyari: "Bu bir matematik projeksiyonu; kazanç vaadi değildir. Katlama, sistemi uygulayana çalışır.",
    kartPaylas: "Projeksiyonu paylaş",
  },
  dunya: {
    baslik: "4 kıta, 38 ülke",
    altMetin:
      "İstanbul'dan başlayan bir ağ; dört kıtada 250.000'e yakın kişiye uzandı. Aşağıdaki noktalar bu erişimi temsil eder.",
    merkez: "İstanbul",
  },
  kitap: {
    etiket: "Kitap",
    baslik: "İlk 72 Saat yeniden yazılıyor.",
    metin: "Yeni baskı çıktığında ilk sen haberdar ol.",
    dugme: "Çıkınca haber ver",
  },
  bulten: {
    baslik: "Pazartesi Notları",
    metin: "Haftada bir, iki dakikalık bir liderlik notu.",
    dugme: "Kaydol",
    konu: "Pazartesi Notları — kayıt",
    govde: "Merhaba, Pazartesi Notları bültenine kaydolmak istiyorum.",
    eposta: "E-posta adresin",
    tesekkur: "Kaydın alındı. İlk not pazartesi sende.",
    hata: "Kayıt şu an alınamadı — e-posta ile bildir:",
  },
  kariyerZaman: [
    { yil: "2013", ay: "Şubat", rutbe: "Başladı", not: "İlk ay 5 kişiyle el sıkıştım." },
    { yil: "2013", ay: "8. ay", rutbe: "Diamond", not: "Sekiz ayda Diamond oldum." },
    { yil: "2013", ay: "Yıl sonu", rutbe: "1 Star Diamond", not: "Aynı yılın sonunda 1 Star Diamond." },
    { yil: "2016", ay: "", rutbe: "Presidential Diamond", not: "Üç buçuk yılda şirketin en üst seviyesi." },
    { yil: "2020", ay: "", rutbe: "Online sistem", not: "Ekibin tamamı uzaktan çalışan düzene geçti." },
    { yil: "2026", ay: "", rutbe: "4 kıta", not: "250.000'e yakın kişilik bir ağ." },
  ],
};

export type Icerik = typeof TR;

const EN: Icerik = {
  nav: [
    { href: "#manifesto", etiket: "About" },
    { href: "#yolculuk", etiket: "Journey" },
    { href: "#videolar", etiket: "Videos" },
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
      yil: "2016–2020",
      baslik: "Presidential Diamond & moving online",
      aciklama:
        "In three and a half years I reached the company's highest leadership rank; the real work began that day, opening the same path for my team. During the pandemic I moved the entire team onto a remote-first system built on online working principles.",
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
        baslik: "What matters isn't what works — it's what can be copied",
        aciklama:
          "Your charisma, talent, network — they might work for you. But if your team can't copy it, you can't teach it. Multiplying starts with copyability.",
      },
    ],
    kartlarEk: [
      {
        baslik: "People don't say no to the business",
        aciklama:
          "People don't say no to you, the product, or the company. They say no to what saying yes would require of them. How you ask determines the business's prestige.",
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
    daha: "See more truths",
    az: "Show less",
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
    {
      slug: "karar",
      soz: "You don't start the day you sign up; you start the day you decide.",
      arka: "Big decisions are made in big meetings. You don't start the day you register — you start the day you decide. — İlk 72 Saat, 2017",
    },
    {
      slug: "lider",
      soz: "The secret is producing leaders.",
      arka: "Be a farmer, not a hunter. Growth isn't counting members; when you raise leaders who build their own teams, the work multiplies.",
    },
    {
      slug: "neden",
      soz: "If your why is strong, the how doesn't matter.",
      arka: "Give someone their why and they'll move mountains. Everything begins with belief and ends with belief.",
    },
    {
      slug: "engel",
      soz: "The one stopping you is you.",
      arka: "If the obstacle is bigger than your why, you quit; if your why is bigger than the obstacle, you find a way. — İlk 72 Saat, 2017",
    },
    {
      slug: "takip",
      soz: "People follow you, not your words.",
      arka: "Whatever you do gets copied. I don't teach what I haven't lived; I live it first, then I teach it.",
    },
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
  surec: {
    baslik: "How does working with me begin?",
    adimlar: [
      {
        baslik: "Intro call",
        aciklama:
          "One WhatsApp message; a 15-20 minute, zero-pressure intro call.",
      },
      {
        baslik: "We review the system together",
        aciklama:
          "You see the camps, the training archive and the tools we've built — for yourself. The decision is entirely yours.",
      },
      {
        baslik: "Your first 72-hour plan",
        aciklama:
          "If you start, you don't start into a void: the onboarding system I wrote the book on maps your first steps day by day.",
      },
      {
        baslik: "We hit the field together",
        aciklama:
          "You're not alone in your first meetings; team, meetings and camps build momentum from month one.",
      },
    ],
  },
  deyince: {
    baslik1: "When you say “Emre Topçu”",
    baslik2: "what comes to mind?",
    altMetin:
      "These aren't our claims; they're the words of the people who know him.",
    videoAciklama:
      "These words were filmed for a birthday by the people who know him. What the numbers can't say, these faces do.",
    sozler: [
      "The person whose name comes up when you Google 'a real man'.",
      "You can't describe him with words.",
      "A true leader.",
    ],
  },
  videolar: {
    baslik: "On camera",
    altMetin:
      "On stage and in the studio — trainings where I walk through the craft of direct sales, step by step.",
    kanalNot: "New short videos every week on my YouTube channel.",
    kanalEtiket: "My YouTube channel",
    liste: [
      {
        platform: "vimeo" as const,
        id: "318263164",
        gorsel: "/video/nedenleriniz.webp",
        baslik: "Your Reasons",
        ozet: "Why do you do this work? Once the answer is clear, you no longer need the how.",
        sure: "37 min",
      },
      {
        platform: "vimeo" as const,
        id: "186525853",
        gorsel: "/video/dogru-kapanis.webp",
        baslik: "The Right Close",
        ozet: "The steps of a clear, pressure-free close that carries the meeting to a decision.",
        sure: "12 min",
      },
      {
        platform: "vimeo" as const,
        id: "236547639",
        gorsel: "/video/grup-olusturma.webp",
        baslik: "Keys to Building a Successful Group",
        ozet: "Not adding but multiplying: how to raise leaders who build their own teams.",
        sure: "25 min",
      },
      {
        platform: "vimeo" as const,
        id: "375546683",
        gorsel: "/video/teknik-egitim.webp",
        baslik: "Technical Training: Invite, Present, Close, Follow up",
        ozet: "A comprehensive field training covering the four core steps end to end.",
        sure: "78 min",
      },
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
    yolculukBaslik: "Journey",
    rakamlarBaslik: "The numbers speak. The rest is detail.",
    sahneBaslik: "From the stage",
    sahneAlt:
      "Signature talks I've given on stage for years, plus titles from the internal training archive.",
    tumKonusmalar: "All talks",
    izle: "Watch",
    instagram: "Instagram",
    whatsappNot: "Your message reaches the intro line; you'll hear back the same day.",
    videoSure: "2 min",
    basaDon: "Back to top",
    menuAc: "Menu",
    menuKapat: "Close",
    kaydir: "Scroll",
    sozIpucu: "Tap a quote",
    simBasla: "Shake hands with one person",
    simKatla: "Multiply",
    simSifirla: "Reset",
    simSon: "That's multiplying. I lived it 250,000 times.",
    mektupNot: "One message is all it takes.",
    footerFelsefe: "No one, but no one, ever made it alone.",
    fasillar: [
      "About",
      "Theory",
      "Numbers",
      "Journey",
      "Truths",
      "Quotes",
      "Talks",
      "Videos",
      "Contact",
    ],
    baglantiKopyala: "Copy link to this section",
    baglantiKopyalandi: "Link copied",
    saatIcinde: "You're in hour {s} of your first 72.",
    saatDoldu: "Your first 72 hours are up. The decision is still yours.",
    kariyerKaydirBaslik: "From 2013 to today — drag",
    dogrulamaKisa: "Official leader profile",
    sozKartPaylas: "Share this quote",
    sozKartIndir: "Download card",
    medyaLink: "Media kit",
    dusunuyorumLink: "Considering direct sales?",
    alintila: "Share as card",
    sozKartStory: "Story card",
    ambiyansAc: "Turn ambient sound on",
    ambiyansKapat: "Turn ambient sound off",
    devamBaslik: "Welcome back. You left off at:",
    devamDugme: "Continue",
    sorBaslik: "Ask Emre",
    sorAlt: "Type your question; I'll answer from Emre's own words.",
    sorYaz: "E.g.: I have no money, how do I start?",
    sorBos: "There's no clear answer to that in these pages — ask directly on WhatsApp.",
    sonEtiket: "Latest video",
    planLink: "First 72 hours plan",
    salonNot: "This screen is for the stage.",
  },
  proj: {
    baslik: "See your own multiplication",
    alt: "I shook hands with 5 people in my first month. How many would you shake hands with per month?",
    kisiEtiket: "people / month",
    ay6: "Your network, month 6",
    ay12: "Your network, month 12",
    uyari: "This is a mathematical projection, not an income promise. Multiplying works for those who apply the system.",
    kartPaylas: "Share the projection",
  },
  dunya: {
    baslik: "4 continents, 38 countries",
    altMetin:
      "A network that began in Istanbul and reached nearly 250,000 people across four continents. The points below represent that reach.",
    merkez: "Istanbul",
  },
  kitap: {
    etiket: "Book",
    baslik: "İlk 72 Saat is being rewritten.",
    metin: "Be the first to know when the new edition is out.",
    dugme: "Notify me",
  },
  bulten: {
    baslik: "Monday Notes",
    metin: "Once a week, a two-minute leadership note.",
    dugme: "Sign up",
    konu: "Monday Notes — sign up",
    govde: "Hi, I'd like to sign up for the Monday Notes newsletter.",
    eposta: "Your email address",
    tesekkur: "You're on the list. First note lands Monday.",
    hata: "Sign-up is unavailable right now — send an email instead:",
  },
  kariyerZaman: [
    { yil: "2013", ay: "February", rutbe: "Started", not: "Month one, I shook hands with 5 people." },
    { yil: "2013", ay: "Month 8", rutbe: "Diamond", not: "Diamond in eight months." },
    { yil: "2013", ay: "Year end", rutbe: "1 Star Diamond", not: "1 Star Diamond by the end of that year." },
    { yil: "2016", ay: "", rutbe: "Presidential Diamond", not: "The company's top rank in three and a half years." },
    { yil: "2020", ay: "", rutbe: "Online system", not: "The whole team moved to a remote-first way of working." },
    { yil: "2026", ay: "", rutbe: "4 continents", not: "A network of nearly 250,000 people." },
  ],
};

export const ICERIK: Record<Dil, Icerik> = {
  tr: TR,
  en: EN,
  de: DE,
  es: ES,
  ru: RU,
  az: AZ,
};

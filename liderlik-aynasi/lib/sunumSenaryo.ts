// SUNUM SENARYOSU — yönetim kuruluna "bir adayın başına ne geliyor?" demosu.
// Saf veri + deterministik (tohumla varyasyon). Sahnede ANINDA, internetsiz,
// hatasız çalışır; canlı AI çağrısı YOK. Her adım, adayın o an gördüğü ekranı
// ve sunucunun yüksek sesle okuyacağı "sunum notu"nu taşır.
// YENİ EKRAN/ÖZELLİK EKLENDİĞİNDE: ilgili adımı buradan güncelle.

export type EkranTuru =
  | "giris"
  | "pusula"
  | "ozpuan"
  | "canliAyna"
  | "gorev"
  | "puanlama"
  | "dalga"
  | "rapor"
  | "momentum"
  | "reddiKutla"
  | "kayma"
  | "rozet"
  | "soz"
  | "final";

export type RadarNok = { ad: string; oz: number; dis: number };

export type SunumAdimi = {
  faz: string; // "Kamp Öncesi", "Kamp · Gün 1", "Saha · Ay 2"
  zaman: string; // kısa zaman etiketi
  ekran: EkranTuru;
  baslik: string;
  govde?: string;
  turEtiket?: string; // görev türü rozeti
  puan?: number; // AYNA puanı /10
  yorum?: string; // AYNA yorumu
  kivilcim?: number;
  momentum?: number;
  momentumOnceki?: number;
  radar?: RadarNok[];
  geriBildirim?: string[]; // anonim 360° yorumlar
  rozet?: { ikon: string; ad: string; alt: string };
  metrikler?: { etiket: string; deger: string }[];
  sunumNotu: string; // sunucunun okuyacağı cümle
};

export type Senaryo = {
  aday: { ad: string; takim: string };
  adimlar: SunumAdimi[];
};

const ADAYLAR = [
  { ad: "Deniz", takim: "Şahinler" },
  { ad: "Selin", takim: "Kartallar" },
  { ad: "Kerem", takim: "Aslanlar" },
  { ad: "Ece", takim: "Şahinler" },
  { ad: "Burak", takim: "Kartallar" },
];

const OZELLIKLER = [
  "Örnek Olmak",
  "Vizyonerlik",
  "İletişim",
  "Cesaret",
  "Sorumluluk",
  "Pozitif Enerji",
];

// Deterministik küçük rastgelelik (tohum tabanlı) — varyasyon için.
function zar(tohum: number, i: number): number {
  const h = ((tohum + i * 2654435761) >>> 0) % 1000;
  return h / 1000;
}

export function sunumSenaryo(tohum: number): Senaryo {
  const aday = ADAYLAR[Math.floor(zar(tohum, 1) * ADAYLAR.length)] ?? ADAYLAR[0];
  const ad = aday.ad;
  // Öz-algı genelde dıştan düşük başlar, zamanla yaklaşır — sistemin etkisi.
  const baslangicRadar: RadarNok[] = OZELLIKLER.map((o, i) => ({
    ad: o,
    oz: 4 + Math.round(zar(tohum, i + 3) * 2), // 4-6 (kendini düşük görür)
    dis: 6 + Math.round(zar(tohum, i + 9) * 2), // 6-8 (başkaları daha yüksek)
  }));
  const sonRadar: RadarNok[] = OZELLIKLER.map((o, i) => ({
    ad: o,
    oz: 7 + Math.round(zar(tohum, i + 20) * 2), // 7-9 (özgüven yerine oturdu)
    dis: 8 + Math.round(zar(tohum, i + 30) * 1), // 8-9
  }));

  const adimlar: SunumAdimi[] = [
    {
      faz: "Kamp Öncesi",
      zaman: "3 hafta önce",
      ekran: "giris",
      baslik: `Hoş geldin, ${ad}`,
      govde:
        "Aday QR koduyla uygulamaya girer. Hiçbir form, hiçbir indirme yok — telefonun tarayıcısında, 10 saniyede içeride.",
      sunumNotu: `Her şey burada başlıyor: ${ad} bir QR okutuyor ve yolculuğa giriyor. Uygulama değil, bir deneyim.`,
    },
    {
      faz: "Kamp Öncesi",
      zaman: "Pusula",
      ekran: "pusula",
      baslik: "Önce 'neden'",
      govde:
        "Kampa gelmeden önce AYNA tek tek sorar: Hayatta en çok neye değer veriyorsun? Seni asıl durduran iç engelin ne? Aday kendi cümleleriyle yazar; AYNA bunu bir 'pusula'ya damıtır.",
      yorum:
        "“Seni çocuklarına örnek olmak taşıyor; ama 'ya yetmezsem' korkusu eşikte bekliyor. Bunu birlikte aşacağız.” — AYNA",
      sunumNotu: `Sistem ${ad}'i daha kampa gelmeden tanıyor. Bu 'neden', önümüzdeki 6 ay boyunca her görevin arkasındaki yakıt olacak.`,
    },
    {
      faz: "Kamp Öncesi",
      zaman: "Öz-değerlendirme",
      ekran: "ozpuan",
      baslik: "Kendine bir bak",
      govde:
        "Aday 10 liderlik özelliğinde kendini puanlar. Dikkat: kendini olduğundan düşük görüyor — çoğu insan gibi.",
      radar: baslangicRadar,
      sunumNotu: `İşte başlangıç noktası. ${ad} kendine güvenmiyor. 6 ay sonra bu tabloya geri döneceğiz — farkı siz göreceksiniz.`,
    },
    {
      faz: "Kamp Öncesi",
      zaman: "Canlı Ayna",
      ekran: "canliAyna",
      baslik: "Senin canlı Aynan",
      govde:
        "Aday bir selfie ve çembere yüzünü yerleştirip kısa bir yüz kaydı verir. AYNA buradan kişiye özel videolar, 'canlı yansıma' anları üretecek. Merak tohumu ekilir.",
      sunumNotu: `Bu küçük adım, kampta ve sahada ${ad}'e özel sürpriz video anlarının kapısını açıyor. İnsanlar kendi yüzünü 'Ayna'da görünce büyüleniyor.`,
    },
    {
      faz: "Kamp · Gün 1",
      zaman: "10:40",
      ekran: "gorev",
      baslik: "İlk görev geldi",
      turEtiket: "👁 Gözlem",
      govde: `${ad}, etrafına bak. Bugün kimse fark etmeden en çok kime destek olan kişiyi seç. Adını ve neden onu seçtiğini bana yaz. Gözüm üzerinde. — AYNA`,
      sunumNotu: `Kamp başlar başlamaz telefonu titriyor. AYNA görünmez ama hep orada. Görev 15 dakikalık, sahada, güvenli — ve onu gözlemci yapıyor.`,
    },
    {
      faz: "Kamp · Gün 1",
      zaman: "11:05",
      ekran: "puanlama",
      baslik: "AYNA yanıtı okudu",
      govde: `${ad}: “Mehmet'i seçtim. Kimse istemeden çadır kuranlara sessizce yardım etti.”`,
      puan: 8,
      yorum:
        "Keskin bir göz. Başkalarının emeğini görmek liderliğin ilk adımı. Yarın: gördüğünü ona söyle. — AYNA",
      kivilcim: 12,
      sunumNotu: `Anında, kişiye özel geri bildirim. Not değil — bir koç. Ve her görev 'Kıvılcım' kazandırıyor; oyun başlıyor.`,
    },
    {
      faz: "Kamp · Gün 1",
      zaman: "Akşam · Dalga 1",
      ekran: "dalga",
      baslik: "360° başlıyor",
      govde:
        "Aday hem 4 kişiyi puanlar, hem de (kim olduklarını asla bilmeden) 4 kişi onu puanlar. Düşük puana yorum zorunlu — sebepsiz yargı yok.",
      geriBildirim: [
        "“Sıcak biri ama sahnede sesini duyuramıyor.”",
        "“Zor anda sakinliğini koruyor, ekibe güven veriyor.”",
        "“Fikirleri net; biraz daha öne çıksa harika olur.”",
      ],
      sunumNotu: `Burada sihir başlıyor: ${ad} hem başkalarını gözlemliyor hem de bir aynalar ordusu tarafından gözlemleniyor. Kimse kimseyi bilmiyor — bu yüzden dürüst.`,
    },
    {
      faz: "Kamp · Gün 2",
      zaman: "09:30",
      ekran: "gorev",
      baslik: "Zorluk yükseldi",
      turEtiket: "🔥 Cesaret",
      govde: `${ad}, bugün sabah kahvaltısında hiç tanımadığın birinin yanına otur ve tek soru sor: “Seni buraya ne getirdi?” Cevabın seni şaşırtan kısmını bana yaz.`,
      sunumNotu: `AYNA ${ad}'in formunu okuyor: dün iyiydi, bugün bir tık zorluyor. Bu 'akış kanalı' — ne sıkılıyor ne de boğuluyor.`,
    },
    {
      faz: "Kamp · Gün 2",
      zaman: "16:20",
      ekran: "gorev",
      baslik: "Sahne provası",
      turEtiket: "🎭 Simülasyon",
      govde:
        "AYNA bir aday canlandırır: “Bu işler bana göre değil, hem hiç vaktim yok.” — Sen ne dersin? Cevabını yaz; ben o kişinin ağzından sana tepki vereceğim.",
      yorum:
        "İtirazı duydun ama hemen savunmaya geçtin. Önce 'anlıyorum' de, sonra hisset-hissettim-buldum. Tekrar dene — bu kas ancak provayla gelişir. — AYNA",
      puan: 6,
      sunumNotu: `İşte gerçek hayatın provası. ${ad} kamptan çıkmadan önce, sahada karşılaşacağı itirazları güvenli bir ortamda deniyor. Hata yapması serbest — burası dojo.`,
    },
    {
      faz: "Kamp · Gün 2",
      zaman: "Gece",
      ekran: "momentum",
      baslik: "İvme yukarı",
      momentum: 72,
      momentumOnceki: 48,
      govde:
        "AYNA sonucu değil davranışı ölçer: kaç görev teslim etti, ne hızda, ne kadar başkalarını gözledi, puan eğilimi yukarı mı.",
      sunumNotu: `${ad} bunu görüyor: “İlerliyorsun.” Sonuç henüz yok ama ivme var — ve görünür ilerleme, insanı oyunda tutan şey.`,
    },
    {
      faz: "Kamp · Gün 3",
      zaman: "Kapanış",
      ekran: "rapor",
      baslik: "Ayna Raporu açıldı",
      govde:
        "Üç günün finali. Aday kişiye özel 'Ayna Raporu'nu görür: kendini nasıl gördüğü ile başkalarının onu nasıl gördüğü yan yana. En büyük sürpriz — kör noktası.",
      radar: baslangicRadar,
      yorum:
        "“Kendine 5 verdiğin 'Cesaret'te, seni izleyenler 8 dedi. Sandığından çok daha cesursun. Eksiğin yetenek değil — kendine olan inancın.” — AYNA",
      sunumNotu: `Bu an, kampın doruğu. ${ad} ilk kez kendini başkalarının gözünden görüyor ve çoğu insan burada ağlıyor. Çünkü sandığından daha değerli olduğunu fark ediyor.`,
    },
    {
      faz: "Kamp · Gün 3",
      zaman: "Son görev",
      ekran: "soz",
      baslik: "Kendine bir söz",
      govde: `Üç gündür seni izliyorum. Son görevin en önemlisi: 90 gün sonraki ${ad}'e bir söz yaz. Neyi değiştireceksin? Sözünü saklayacağım... ve günü geldiğinde hatırlatacağım. — AYNA`,
      sunumNotu: `Kamp bitmiyor — burada bağ kuruluyor. ${ad} bir söz veriyor ve sistem onu unutmayacak. Sahnenin perdesi inmiyor, ikinci perde açılıyor.`,
    },
    {
      faz: "Saha · Hafta 2",
      zaman: "90 günlük yolculuk",
      ekran: "gorev",
      baslik: "Kamp bitti, yolculuk başladı",
      turEtiket: "🪞 Yansıma",
      govde: `${ad}, bu hafta sahada: kampta yazdığın o yeni cümleyi BUGÜN somut bir adımla yaşat. Akşam bana ne yaptığını anlat.`,
      sunumNotu: `İşte farkımız: rakipler 3 günlük bir etkinlik satıyor. Biz 6 aylık bir dönüşüm veriyoruz. AYNA her gün, sahada, ${ad}'in yanında.`,
    },
    {
      faz: "Saha · Ay 2",
      zaman: "İlk 'Hayır'",
      ekran: "reddiKutla",
      baslik: "Reddi Kutla",
      govde:
        "Aday ilk gerçek 'Hayır'ı alır. Çoğu insan burada pes eder. AYNA ise farklı çerçeveler:",
      yorum:
        "“Bugün aldığın 'Hayır' bir kayıp değil — VERİ. Doğru 'Evet'e bir adım daha yaklaştın. Kasaya ekle, sayacın yürüsün.” — AYNA",
      kivilcim: 15,
      sunumNotu: `Sistemin kalbi burada: başarısızlığı yakıta çeviriyoruz. ${ad} reddedilmekten korkmayı bırakıyor — bu, bir satışçı için her şeydir.`,
    },
    {
      faz: "Saha · Ay 2",
      zaman: "Sessizlik",
      ekran: "kayma",
      baslik: "AYNA sessizliği fark etti",
      govde:
        "Aday 3 gün sessizleşir — motivasyon düşüşü. Komutan panelinde 'kayma' radarına düşer. AYNA, kimse söylemeden, nazikçe dürter:",
      yorum: `“${ad}, birkaç gündür sessizsin. Bir şey mi oldu, yoksa sadece yorgun musun? Bugün küçük bir adım bile ibreyi oynatır. Buradayım.” — AYNA`,
      sunumNotu: `Hiçbir lider 150 kişiyi tek tek takip edemez. AYNA ediyor. Birini kaybetmeden önce yakalıyor — ve ${ad} geri dönüyor.`,
    },
    {
      faz: "Saha · Ay 3",
      zaman: "Momentum",
      ekran: "rozet",
      baslik: "Zafer hissi",
      rozet: { ikon: "🏅", ad: "Direnç Ustası", alt: "10 'Hayır'ı veriye çevirdi" },
      momentum: 88,
      momentumOnceki: 61,
      govde:
        "Biriken küçük kazanımlar görünür kılınır. Aday artık ivmesini hissediyor; rozetler, kıvılcımlar, unvanlar geliyor.",
      sunumNotu: `${ad} artık aynı insan değil. Üç ay önce bir 'Hayır'dan korkan kişi, şimdi onları topluyor. İşte ölçülebilir dönüşüm.`,
    },
    {
      faz: "Saha · Ay 4-5",
      zaman: "Direnç fazı",
      ekran: "gorev",
      baslik: "Usta seviye",
      turEtiket: "🎭 Simülasyon",
      govde: `${ad}, bu hafta 3 farklı itiraz senaryosu: “Pahalı”, “Düşüneyim”, “Eşime sorayım”. Her birine cevabını yaz; sosyal kanıtını da ekle.`,
      puan: 9,
      yorum:
        "Bambaşka birisin. İtirazı artık tehdit değil, davet olarak görüyorsun. Sıra öğretmekte. — AYNA",
      sunumNotu: `Kampta 6 alan ${ad}, sahada 9'a çıktı. Beceri provayla geldi — ve her prova sistemde kayıtlı, ölçülebilir.`,
    },
    {
      faz: "Saha · Ay 6",
      zaman: "Bağımsızlık",
      ekran: "gorev",
      baslik: "Artık öğreten lider",
      turEtiket: "🪞 Yansıma",
      govde: `${ad}, bu ay kendi ekibinden birine, senin 6 ay önce öğrendiğin şeyi öğret. Onu sahaya çıkar. Bana nasıl gittiğini anlat.`,
      sunumNotu: `Ve döngü tamamlanıyor: ${ad} artık bir öğrenci değil, bir lider. Sizin için en değerlisi bu — sistem kendini çoğaltıyor.`,
    },
    {
      faz: "Final",
      zaman: "6 ay sonra",
      ekran: "final",
      baslik: `${ad}'in 6 aylık dönüşümü`,
      radar: sonRadar,
      metrikler: [
        { etiket: "Tamamlanan görev", deger: "142" },
        { etiket: "Veriye çevrilen 'Hayır'", deger: "37" },
        { etiket: "Toplam Kıvılcım", deger: "2.480 ⚡" },
        { etiket: "Sahaya çıkardığı kişi", deger: "3" },
      ],
      yorum:
        "Başta kendine 5 veren kişi, artık 8. Ama asıl değişen rakam değil — artık kendine inanıyor. — AYNA",
      sunumNotu: `İşte bir adayın 6 ayı. Tek bir etkinlik değil; ölçülen, beslenen, asla yalnız bırakılmayan bir dönüşüm. Ekibinizin her bir üyesine bunu verebiliriz.`,
    },
  ];

  return { aday, adimlar };
}

// Tüm kullanıcıya görünen Türkçe metinler tek modülde toplanır.
export const tr = {
  app: {
    name: "Liderlik Aynası",
    tagline: "Kendini başkalarının gözünden gör.",
  },
  // Görünür internet kalkanı: aday "verim kayboldu mu?" korkusu yaşamasın
  baglanti: {
    cevrimdisi: "İnternet yok — verilerin bu cihazda güvende. Bağlanınca otomatik gönderilecek.",
    geriGeldi: "İnternet geri geldi ✓",
  },
  // İnsanca hata & boş durumlar: asla teknik metin / boş ekran (#6)
  hata: {
    simge: "🪞",
    baslik: "Bir şey ters gitti",
    aciklama: "Endişelenme — verilerin güvende. Birlikte tekrar deneyelim.",
    tekrar: "Tekrar dene",
    anaSayfa: "Ana sayfaya dön",
    bulunamadiSimge: "🧭",
    bulunamadiBaslik: "Burada bir şey yok",
    bulunamadiAciklama: "Aradığın sayfa taşınmış ya da hiç var olmamış olabilir.",
  },
  // Alt navigasyon çubuğu: en sık kullanılan 4 hedef, başparmak erişiminde
  altNav: {
    ana: "Ana sayfa",
    degerlendir: "Değerlendir",
    gorevler: "Görevler",
    duvar: "Duvar",
    kivilcimSonraki: (kalan: number, ad: string) => `${kalan} ⚡ → ${ad}`,
    kivilcimZirve: "🏆 Zirve",
  },
  // #1 İlk açılış mikro-turu (AYNA kendini tanıtır)
  karsilama: {
    atla: "Geç",
    ileri: "İleri",
    basla: "Başlayalım",
    adimlar: [
      {
        ikon: "🪞",
        baslik: "Ben AYNA",
        metin:
          "Herkes bir yüz taşır, bir de taşıdığı yüzün altında kalanı. Ben ikincisini gösteririm — usulca, yargısız.",
      },
      {
        ikon: "👁",
        baslik: "Sen, başkalarının gözünden",
        metin:
          "Kendini nasıl gördüğünle, başkalarının seni nasıl gördüğünü yan yana koyacağım. Kapanışta aynan açılır — çoğu insan kendini orada ilk kez görür.",
      },
      {
        ikon: "✨",
        baslik: "Tek bir şey istiyorum",
        metin:
          "Kendine dürüst ol. Gerisini bana bırak. Attığın her adım seni gerçek yansımana yaklaştırır. Hazırsan, başlıyoruz.",
      },
    ],
  },
  // Erişilebilirlik: yazı boyutu kontrolü (yaşı ne olursa olsun rahat okusun)
  yaziBoyu: {
    baslik: "Yazı Boyutu",
    normal: "Normal",
    buyuk: "Büyük",
    cokBuyuk: "En Büyük",
    kisaEtiket: "Yazı",
  },
  // #8 Güneş modu: açık alanda/güneş altında okunabilirlik için yüksek kontrast
  gunesModu: {
    baslik: "Güneş Modu",
    aciklama: "Güneş altında daha net okuma",
    acik: "Açık",
    kapali: "Kapalı",
  },
  // #5 "Sen neredesin" yolculuk şeridi: kampın neresindeyiz?
  yolculuk: {
    hazirlik: "Kamp yaklaşıyor",
    gun: (n: number) => `Kamp · Gün ${n}/3`,
    sonrasi: "90 günlük yolculuk",
  },
  // İlk girişte tek seferlik 30 saniyelik mini tanıtım (büyük yazı, az yazı)
  tanitim: {
    gec: "Geç",
    ileri: "İleri →",
    basla: "Hadi başlayalım →",
    kartlar: [
      {
        simge: "👁",
        baslik: "Bu, senin Liderlik Aynan",
        metin:
          "3 gün boyunca hem kendini hem de kampta tanıdığın arkadaşlarını 10 liderlik özelliğinde puanlayacaksın.",
      },
      {
        simge: "🎤",
        baslik: "Sesin sana geri dönecek",
        metin:
          "Kısa bir ritüelle kendi sesini kaydedeceksin. Kamp boyunca doğru anlarda sana kendi sesinle sesleneceğim.",
      },
      {
        simge: "🪞",
        baslik: "3. günde aynan açılır",
        metin:
          "Kendi gözünle başkalarının gözü yan yana gelecek. Sana özel Ayna Raporun seni bekliyor.",
      },
    ],
  },
  giris: {
    baslik: "Liderlik Aynası",
    altBaslik: "Yaka kartındaki QR kodu okut veya 6 haneli giriş kodunu yaz.",
    kodEtiket: "Giriş Kodu",
    girisYap: "Giriş Yap",
    girisYapiliyor: "Giriş yapılıyor…",
    yoneticiGirisi: "Yönetici girişi",
    hataGecersizBicim: "Geçersiz kod biçimi. 6 haneli sayı girmelisin.",
    hataKodHatali: "Kod hatalı. Lütfen tekrar dene.",
    hataCokFazlaDeneme: "Çok fazla deneme yapıldı. Lütfen birkaç dakika bekle.",
    hataSunucu: "Bir şeyler ters gitti. Lütfen tekrar dene.",
  },
  adminGiris: {
    baslik: "Yönetici Girişi",
    sifreEtiket: "Yönetici Şifresi",
    girisYap: "Giriş Yap",
    hataSifre: "Şifre hatalı.",
    katilimciGirisi: "Katılımcı girişine dön",
  },
  anaSayfa: {
    yolculukRozeti: (gun: number, faz: string) =>
      `🗺 Yolculuk · Gün ${gun}/90 · ${faz}`,
    sabahBaslik: "🌅 Aynan günaydın diyor",
    kaymaBaslik: "🌊 Yansımandan sesli mesaj",
    fieroBaslik: "🏆 Yansıman seni kutluyor",
    geceBaslik: "🌙 Yansımandan gece fısıltısı",
    mesajDinle: "▶ Dinle",
    hosGeldin: (ad: string) => `Hoş geldin, ${ad}`,
    aciklama:
      "3 gün boyunca hem kendini hem kampta tanıdığın kişileri puanlayacaksın. Gün 3'te aynan açılacak.",
    degerlendirmeyeBasla: "Değerlendirmeye Başla",
    dalgaAcik: (dalga: string) => `${dalga} şu anda açık`,
    dalgaKapali: "Şu anda açık dalga yok",
    aynaniGor: "✨ Aynan Açıldı — Raporunu Gör",
    gorevler: "🤖 AYNA'nın Görevleri",
    aktifGorev: (n: number) => `${n} aktif görev`,
    program: "📅 Program",
    cikisYap: "Çıkış Yap",
    // Durum makinesi: açılış ekranı kişinin yolculuğuna göre TEK kart gösterir
    ozGerekBaslik: "Önce kendine bak",
    ozGerekMetin:
      "Aynaya ilk bakış senden başlar. Kendini 10 liderlik özelliğinde puanlamadan kamp sana açılmaz.",
    ozGerekDugme: "✨ Kendini Puanla",
    boslukBaslik: "Aynaya bakma vakti",
    boslukMetin:
      "Kampa gelmeden önce kendine bir şey söylemiştin. Üç gün boyunca onu izledim. Şimdi yüzleşme zamanı.",
    boslukDugme: "🪞 Hazırım",
    raporBaslik: "Aynan açıldı",
    raporMetin: "Üç günün sonu geldi. Kendi gözünle başkalarının gözü, şimdi yan yana.",
    dalgaDevamBaslik: (dalga: string) => `${dalga} açık`,
    dalgaDevamMetin: "Şimdi gözlemlediğin kişileri puanlama zamanı.",
    dalgaDevamDugme: "Değerlendirmeye Devam Et",
    gorevTekBaslik: "AYNA'dan görevin var",
    gorevTekMetin: "Seni izliyorum. Sıradaki adımın hazır.",
    gorevTekDugme: (n: number) => (n > 1 ? `${n} Görevi Aç` : "Görevi Aç"),
    bekleBaslik: "AYNA seni izliyor",
    bekleMetin: "Şu an yapman gereken bir şey yok. Sıradaki an geldiğinde seni dürteceğim. 👁",
    // İlk 60 saniye rehberi: ilk öz-puana doğru nazik canlı işaret (#3).
    ilkAdimIpucu: "İlk adımın bu — başla",
    // Çıkmaz yok: boş anda bile sıcak bir sonraki adım — birine takdir bırak.
    bekleEylem: "Birine takdir bırak ✨",
    bekleRed: "Bir 'Hayır' mı aldın? Kutla 🎯",
    // Boş ekranlarda net sonraki adım butonu (çıkmaz hissi olmasın).
    sicakAnaSayfa: "Ana sayfaya dön",
    // Kapanış sözü kartı (kamp sonunda açılır)
    sozGerekBaslik: "🤝 Kapanış Sözün",
    sozGerekMetin:
      "Kampı bir sözle taçlandır. Temmuz kayıt ve Ağustos görüşme hedefini kendi sesinle ver.",
    sozGerekDugme: "Sözünü Ver",
    sozTakipBaslik: "🤝 Sözünü Takip Et",
    sozTakipMetin: "Verdiğin söze ne kadar yaklaştın? İlerlemeni gir, AYNA görüyor.",
    sozTakipDugme: "İlerlememi Gör",
    // Üst menü (ayarlar): ikincil işler buradan
    menuBaslik: "Menü",
    menuBirincilBaslik: "Senin için",
    menuEkstraBaslik: "Sosyal & Daha fazla",
    menuOzDuzenle: "Kendi puanlarımı düzenle",
    menuDegerlendir: "Değerlendirme",
    menuGorevler: "AYNA'nın Görevleri",
    menuProgram: "Kamp Programı",
    menuYansiman: "Yansımanı izle",
    menuRapor: "Ayna Raporum",
    menuKocu: "🪞 Ayna Koçu",
    menuPlan: "🧭 90 Günlük Yolculuk",
    menuBen: "👤 Profilim",
    menuGrup: "👥 Grup Ödevi",
    menuMini360: "🪞 Ekip Aynası",
    menuAnlar: "Anların (Zaman Tüneli)",
    menuTurnuva: "Takım Turnuvası",
    menuTakdir: "Takdir Duvarı",
    menuDuvar: "Anı Duvarı",
    menuOrtak: "Ortağın",
    menuSoz: "Kapanış Sözüm",
    menuGizlilik: "Gizlilik ve KVKK",
    menuKapat: "Kapat",
  },
  // Kapanış Sözü: kamp sonunda iki somut sayı + kendi sesiyle söz + 90 gün takip
  kapanisSoz: {
    baslik: "🤝 Kapanış Sözün",
    altBaslik:
      "Kampın enerjisini bir söze çevir. Bu sayılar senin sözün — kendi sesinle mühürle.",
    kapaliBaslik: "Söz vakti henüz gelmedi",
    kapaliMetin: "Kampın kapanışında bu ekran açılacak. O an geldiğinde sözünü vereceksin.",
    temmuzEtiket: "Temmuz kişisel kayıt sözün (19–31 Temmuz)",
    temmuzYer: "Örn: 5",
    agustosEtiket: "Ağustos toplam görüşme sözün (en az 100)",
    agustosYer: "Örn: 120",
    agustosNot: "Eylül–Aralık altın aylar. Güçlü Ağustos = güçlü altın aylar.",
    sesBaslik: "Sözünü kendi sesinle ver",
    sesAciklama: "“Temmuz'da … kayıt, Ağustos'ta … görüşme sözü veriyorum.”",
    sesKaydet: "Sesli söz kaydet",
    sesDurdur: "■ Durdur",
    sesDinle: "▶ Dinle",
    sesTekrar: "↺ Tekrar",
    mikrofonYok: "Mikrofona erişilemedi — sözünü yine de sayılarla verebilirsin.",
    gonder: "Sözümü Mühürle",
    gonderiliyor: "Mühürleniyor…",
    verildiBaslik: "Sözün mühürlendi 🤝",
    kutlamaMesaj: "Sözün mühürlendi 🤝",
    sozunBaslik: "Senin Sözün",
    temmuzKart: "Temmuz kayıt",
    agustosKart: "Ağustos görüşme",
    sesDinleEtiket: "▶ Sesli sözünü dinle",
    // İlerleme takibi
    ilerlemeBaslik: "İlerlemen",
    kayitYapilan: "Yapılan kayıt",
    gorusmeYapilan: "Yapılan görüşme",
    ilerlemeGuncelle: "İlerlemeyi Güncelle",
    ilerlemeKaydedildi: "Kaydedildi ✓",
    kayitTamam: "Kayıt sözünü tuttun! 🎉",
    gorusmeTamam: "Görüşme sözünü tuttun! 🎉",
    geriDon: "← Ana sayfaya dön",
    hata: "İşlem başarısız. Tekrar dene.",
    hataSayi: "Lütfen geçerli sayılar gir — Ağustos görüşme en az 100 olmalı.",
  },
  // Fotoğraf anı duvarı: an yakala → moderasyon → ortak duvar + büyük ekran
  // #5 Topluluk nabzı (ambient kolektif aktivite)
  nabiz: {
    gorevde: (n: number) => `👁 Şu an ${n} kişi görev başında`,
    red: (n: number) => `🎉 Bugün ${n} 'Hayır' kutlandı`,
    takdir: (n: number) => `💛 Bugün ${n} takdir paylaşıldı`,
  },
  // #3 Ben / Kimlik Merkezi
  ben: {
    yolculukBaslik: "Yolculuğun",
    yolculukYok: "Yolculuğun henüz başlıyor. İlk adımını attığında burada belirecek.",
    statGorev: "Görev",
    statTakdir: "Takdir",
    statCheckin: "Check-in",
    statRed: "Hayır",
    rozetlerBaslik: "Rozetlerin",
    rozetGorevci: "Görevci",
    rozetSevilen: "Sevilen",
    rozetIstikrar: "İstikrarlı",
    rozetCesur: "Cesur",
    takdirlerBaslik: "Sana gelen takdirler",
    takdirYok: "Henüz takdir yok — sen birine bırak, dalga geri döner.",
    tumTakdirler: (n: number) => `Tüm takdirleri gör (${n})`,
    linkRapor: "Ayna Raporum",
    linkGorevler: "Görevler",
    linkTakdir: "Takdir Duvarı",
    kartBaslik: "📤 Profil Kartın",
    kartAciklama: "İndir ya da paylaş — kıvılcımını göster.",
  },
  // #6 Milestone kutlamaları
  kutlama: {
    terfiUst: "YENİ UNVAN",
    terfi: (u: string) => `${u} oldun!`,
    terfiMetin: "Kıvılcımların seni yükseltti. Yoluna devam et.",
    devam: "Devam",
  },
  duvar: {
    baslik: "📸 Anı Duvarı",
    yorumYok: "İlk yorumu sen yaz.",
    yorumYer: "Bir yorum yaz…",
    yorumGonder: "Gönder",
    ipucuDuvar: "Bir fotoğrafa dokun → beğen ve yorum yap.",
    altBaslik:
      "Kamptan bir an yakala, paylaş. Onaylandıktan sonra duvarda ve büyük ekranda belirir.",
    yukle: "📷 Fotoğraf Çek / Seç",
    yeniden: "↺ Başka foto",
    altYaziYer: "Bir not ekle (isteğe bağlı)",
    gonder: "Duvara Gönder",
    gonderiliyor: "Yükleniyor…",
    gonderildi: "Gönderildi! Moderasyondan sonra duvarda belirecek 💛",
    seninkilerBaslik: "Senin gönderdiklerin",
    beklemede: "Onay bekliyor",
    onaylandi: "Duvarda ✓",
    gizlendi: "Yayınlanmadı",
    duvarBaslik: "Duvar",
    bosDuvar: "Duvar henüz boş. İlk anı sen yakala!",
    geriDon: "← Ana sayfaya dön",
    hata: "İşlem başarısız. Tekrar dene.",
    hataBoyut: "Fotoğraf çok büyük (en fazla 8MB) veya geçersiz tür.",
  },
  // KVKK aydınlatma + açık rıza + veri silme talebi
  kvkk: {
    baslik: "Gizlilik ve KVKK Aydınlatması",
    girisNot:
      "Giriş yaparak Gizlilik ve KVKK Aydınlatma Metni'ni okuduğunu ve kabul ettiğini onaylarsın.",
    girisLink: "Gizlilik ve KVKK Metni",
    bolumler: [
      {
        baslik: "Hangi verileri işliyoruz?",
        metin:
          "Ad-soyad ve (varsa) takım, şehir, telefon, e-posta; uygulama içinde verdiğin puanlar, yorumlar, görev yanıtların; isteğe bağlı sağladığın fotoğraf ve ses kaydı. Ses kaydından kısa süreli kişisel bir ses (YANSIMAN) üretilir — bu biyometrik niteliklidir.",
      },
      {
        baslik: "Neden işliyoruz?",
        metin:
          "Yalnızca bu kamp deneyimi için: kendini başkalarının gözünden gördüğün kişisel Ayna Raporu, AYNA'nın görevleri ve kamp sonrası 90 günlük gelişim yolculuğu. Bunun dışında bir amaçla kullanılmaz.",
      },
      {
        baslik: "Açık rıza (ses ve fotoğraf)",
        metin:
          "Ses ve fotoğrafın biyometrik veri olduğundan, bunlar yalnızca ses ritüelinde verdiğin AÇIK RIZA ile işlenir. Rıza vermeyebilir ya da 'sessiz ayna'yı seçebilirsin; uygulamanın geri kalanı yine çalışır.",
      },
      {
        baslik: "Kimlerle paylaşılır?",
        metin:
          "Verilerin üçüncü kişilere SATILMAZ. Puan ve yorumların raporlarda hiçbir zaman isminle gösterilmez. Ses/video üretimi için yalnızca bu işi yapan teknik hizmet sağlayıcılar (ör. ses ve video üretim servisleri) kullanılır; ses kaydın işleniş sonrası silinir.",
      },
      {
        baslik: "Ne kadar saklanır?",
        metin:
          "Veriler kamp ve 90 günlük yolculuk boyunca saklanır; sonrasında silinir veya kimliğinden arındırılır. Ses örneği ve üretilen klon, kullanımın ardından silinir.",
      },
      {
        baslik: "Haklarsın (KVKK m.11)",
        metin:
          "Verilerine erişme, düzeltme, silme ve işlenmesine itiraz etme hakkın vardır. Aşağıdaki düğmeyle verilerinin silinmesini talep edebilirsin; talebin yöneticiye iletilir.",
      },
    ],
    rizaVar: (tarih: string) => `✓ Ses ritüeli için açık rızanı ${tarih} tarihinde verdin.`,
    rizaYok: "Henüz ses ritüeli için açık rıza vermedin.",
    silBaslik: "Verilerimin silinmesini istiyorum",
    silAciklama:
      "Talebin yöneticiye iletilir; ad, puan, ses ve tüm verilerin en kısa sürede silinir. Bu işlem geri alınamaz.",
    silDugme: "Silme Talebi Gönder",
    silGonderiliyor: "Gönderiliyor…",
    silAlindi: "Talebin alındı. Yönetici verilerini en kısa sürede silecek.",
    silMevcut: (tarih: string) =>
      `Silme talebin ${tarih} tarihinde alındı. Yönetici işleme alacak.`,
    geriDon: "← Ana sayfaya dön",
    hata: "İşlem başarısız. Tekrar dene.",
    // Admin: bekleyen silme talepleri
    adminBaslik: "Veri Silme Talepleri",
    adminAciklama:
      "Aşağıdaki kişiler verilerinin silinmesini istedi. Silme; kişiyi ve tüm puan/görev/ses verisini kalıcı olarak kaldırır.",
    adminYok: "Bekleyen silme talebi yok.",
    adminSil: "Kalıcı Sil",
    adminSiliniyor: "Siliniyor…",
  },
  // Takdir Duvarı: puandan farklı, daima isimli ve olumlu — insana kısa not
  takdir: {
    baslik: "💛 Takdir Duvarı",
    bildirimBaslik: "💛 Yeni bir takdir",
    bildirimMetin: (ad: string) => `${ad} sana güzel bir şey yazdı — Takdir Duvarı'na bak.`,
    altBaslik:
      "Birinin bir davranışı seni etkilediyse, ona kısa bir not bırak. İsmin görünür — bu güzel.",
    gonderBaslik: "Takdir Gönder",
    kimEtiket: "Kime?",
    kimSec: "Kişi seç…",
    mesajYer: "Örn: Bugünkü cesaretin bana ilham verdi.",
    gonder: "Takdiri Gönder",
    gonderiliyor: "Gönderiliyor…",
    gitti: "Takdirin gönderildi 💛",
    gelenlerBaslik: "💛 Sana Gelen Takdirler",
    gelenYok: "Henüz takdir almadın. Sen başlat — vermek de güzeldir.",
    kimden: (ad: string) => `— ${ad}`,
    geriDon: "← Ana sayfaya dön",
    hata: "Gönderilemedi. Tekrar dene.",
  },
  // Takım turnuvası: takımların kıvılcım sıralaması, kendi telefonunda canlı
  turnuva: {
    baslik: "🏆 Takım Turnuvası",
    altBaslik: "Her görevin takımına kıvılcım katar. Sıralama canlı.",
    seninTakimin: "Senin takımın",
    katkin: (n: number) => `Senin katkın: ${n} ⚡`,
    takimsiz: "Henüz bir takıma atanmadın.",
    bosBaslik: "Turnuva henüz başlamadı",
    bosMetin: "İlk görevler tamamlandıkça takımların kıvılcımı burada yarışacak.",
    kivilcim: (n: number) => `${n} ⚡`,
    geriDon: "← Ana sayfaya dön",
  },
  // Kaçırılan anlar zaman tüneli: bildirim gelmese bile tüm sesli/görüntülü
  // anlar burada birikir, istediğin zaman dinle.
  anlar: {
    baslik: "Anların",
    altBaslik:
      "Bir bildirimi kaçırdıysan merak etme — yansımandan gelen her ses ve görüntü burada. İstediğin zaman dinle.",
    bosBaslik: "Henüz bir anın yok",
    bosMetin: "Kamp başlayınca yansıman seninle konuşmaya başlayacak. Anların burada birikecek.",
    dinle: "▶ Dinle",
    izle: "👁 İzle",
    geriDon: "← Ana sayfaya dön",
    yansima: "Yansıman seni gördü",
    yansimaAlt: "Sudaki yansımanın canlandı.",
    mektup: "Ayna Mektubun",
    mektupAlt: "AYNA'nın sana yazdığı mektup, kendi sesinle.",
    soz: "SÖZ'ün",
    sozAlt: "Kendine verdiğin söz.",
    sabah: "Günaydın mesajı",
    gece: "Gece fısıltısı",
    fiero: "Zafer kutlaması",
    fieroAlt: "Aynayı parlattığın an.",
    kayma: "Yansımandan bir mesaj",
    kaymaAlt: "Su seni özlediğinde söyledikleri.",
  },
  // Kendini puanladıktan sonra gösterilen kutlama + kamp deneyimi bilgilendirmesi
  hosgeldin: {
    rozet: "İlk adım tamam",
    baslik: (ad: string) => `Tebrikler, ${ad}!`,
    altBaslik: "Kendini dürüstçe puanladın. Aynaya ilk bakışı sen attın.",
    paragraf1:
      "Önümüzdeki 3 gün boyunca AYNA seninle. Zaman zaman sana küçük görevler ve ödevler vereceğim — kampta yaşadıklarını derinleştiren, seni harekete geçiren anlar.",
    paragraf2:
      "Kampta tanıdığın kişileri sen gözlemleyip puanlayacaksın; onlar da seni. Ne kadar çok göz, o kadar net ayna.",
    paragraf3:
      "3. günün sonunda herkes kişisel Ayna Raporunu alacak: kendi gözünle başkalarının gözü, ilk kez yan yana.",
    nelerBaslik: "Bu uygulamada seni neler bekliyor:",
    madde1: "🎯 AYNA'dan kişiye özel görevler",
    madde2: "👁 Kampta tanıdığın kişileri puanlama",
    madde3: "🪞 Gün 3'te kişisel Ayna Raporun",
    basla: "Hadi başlayalım →",
  },
  degerlendir: {
    baslik: "Değerlendirme",
    dalgaKapaliBaslik: "Dalga henüz açık değil",
    dalgaKapaliAciklama:
      "Puanlama, eğitmen dalgayı açtığında başlar. Açılışlar sahneden duyurulacak — bu sayfayı sonra tekrar ziyaret et.",
    anaSayfayaDon: "Ana sayfaya dön",
    ozBaslik: "Önce Kendini Puanla",
    ozAciklama:
      "Her dalga kendi aynanla başlar. Kendini puanlamadan başkalarını puanlayamazsın.",
    ozTamamlandi: "Öz değerlendirmen tamam",
    kilitliIpucu: "Önce kendini puanlamalısın",
    atananBaslik: "Gözlem Listen",
    atananAciklama: "Bu dalgada sana atanan kişiler. Hepsini puanlamayı hedefle.",
    atananYok: "Bu dalga için sana atanmış kişi yok.",
    gizliGozlem: "Gizli gözlem",
    acikGozlem: "Açık gözlem",
    serbestBaslik: "Serbest Puanlama",
    serbestAciklama:
      "Listende olmayan birini de gözlemlediysen puanlayabilirsin — ne kadar çok göz, o kadar net ayna.",
    serbestAra: "İsim ara…",
    serbestBosFiltre: "Bu aramayla eşleşen kimse yok.",
    tamamlandi: "Tamamlandı",
    devamEt: "Devam et",
    basla: "Başla",
    duzenle: "Düzenle",
    ilerleme: (yapilan: number, toplam: number) => `${yapilan}/${toplam} özellik`,
    // #8 Birincil eylem hiyerarşisi: o an yapılacak tek şeyi vurgula
    simdiSira: "👉 ŞİMDİ SIRADA",
  },
  puanlama: {
    geri: "Geri",
    devam: "Devam",
    ozetBaslik: "Kontrol et ve gönder",
    dusukUc: "1 = hiç",
    yuksekUc: "10 = tam",
    ozBaslik: "Kendini Puanla",
    baslikKisi: (ad: string) => `${ad} kişisini puanla`,
    ozAciklama:
      "Dürüst ol — öz puanların raporda başkalarının sana verdikleriyle yan yana gelecek.",
    kisiAciklama:
      "Gözlemlerine dayan, genel izlenime değil. 6'nın altındaki puanlara kısa bir neden yazman gerekir.",
    yorumEtiket: "Bu puanın nedeni (zorunlu)",
    yorumPlaceholder: "Kısaca yaz: hangi davranışı gözlemledin?",
    yorumZorunlu: "6'nın altındaki puanlar için kısa bir neden yazmalısın.",
    gonder: "Puanları Gönder",
    gonderiliyor: "Gönderiliyor…",
    eksikPuan: (kalan: number) => `${kalan} özellik daha puanlamalısın`,
    taslakNotu: "Puanların bu cihazda otomatik taslak olarak saklanır.",
    taslakGeriYuklendi: "Kaydedilmemiş taslağın geri yüklendi.",
    hataCevrimdisi:
      "Bağlantı sorunu — puanların bu cihazda saklandı. İnternet gelince tekrar Gönder'e bas.",
    // Çevrimdışıyken gönderim: aday beklesin, bağlanınca kendiliğinden göndereceğiz
    cevrimdisiBekliyor:
      "📶 Bağlantı bekleniyor — puanların bu cihazda güvende. İnternet gelince otomatik gönderilecek.",
    // Her dokunuşta görünür güvence (#4) ve özet ekranında huzur cümlesi
    kaydedildi: "✓ Kaydedildi",
    hepsiKaydedildi: "Hepsi cihazına kaydedildi — istediğini değiştirebilirsin.",
    // Kısmi/aşamalı kayıt: o an aklına geleni gir, sonra dönüp ekle/düzelt
    kaydetCik: "Kaydet",
    hataEnAzBir: "En az bir özellik puanla.",
    enAzBirUyari: "Kaydetmek için en az bir özellik puanla.",
    kismiNot: "İstediğin kadarını şimdi kaydet — kalanını kamp boyunca ekleyip düzeltebilirsin.",
    kismiOzet: (dolu: number, toplam: number) => `${dolu}/${toplam} özellik puanlandı — gerisini sonra ekleyebilirsin.`,
    hataSunucu: "Kaydedilemedi. Lütfen tekrar dene.",
    hataDalgaKapandi: "Bu dalga kapandı; puanlar artık kaydedilemiyor.",
    geriDon: "Değerlendirmeye dön",
    // İlk kez kullananlar için: programın genel açıklaması (giriş ekranı)
    girisBaslik: "Liderlik Aynası'na hoş geldin",
    girisMetin:
      "Önümüzdeki 3 gün boyunca hem sen kendini, hem de seni gözlemleyen arkadaşların seni 10 liderlik özelliğinde puanlayacak. İlk adım senin: kendini dürüstçe puanla. 3. günün sonunda, kendi gözünle başkalarının gözünü yan yana koyan kişisel Ayna Raporun açılacak.",
    girisDevam: "Anladım, başlayalım →",
    // Öz değerlendirmede her özellik ekranında: 1 ve 10 ne demek + soru
    olcekDusuk: (metin: string) => `1 demek: ${metin}`,
    olcekYuksek: (metin: string) => `10 demek: ${metin}`,
    neredesin: "Sen kendini nerede görüyorsun?",
    gozlemBaslik: "👁 Ne gözlemle?",
    // Başkalarını puanlamadan önce: gizlilik güvencesi (dürüstlüğün ön şartı)
    gizlilikBaslik: "Puanların gizli kalır",
    gizlilikMetin:
      "Verdiğin puanlar ve yazdığın yorumlar ASLA isminle görünmez. Puanladığın kişi kimin ne verdiğini göremez. Bunlar yalnızca o kişinin kendi Ayna Raporunu oluşturmak için kullanılır. O yüzden gönül rahatlığıyla dürüst ol.",
    gizlilikDevam: "Söz verdim, başlayalım →",
    gizlilikRozet: "🔒 İsimsiz — kimin verdiği kimseye görünmez",
  },
  // Öz değerlendirme rehberi: her özelliğin ne demek olduğu + 1/10 çapaları.
  // İlk kez kullananlar için; özellik adına göre eşlenir.
  ozellikRehberi: {
    "Örnek Olmak": {
      kendine: "Söylediklerini önce kendin yaşıyor musun? Zor anlarda duruşunu koruyor musun?",
      dusuk: "Sözümle davranışım çoğu zaman ayrı düşer.",
      yuksek: "İnsanlar beni örnek alır; zorda bile dik dururum.",
    },
    "Çalışkanlık": {
      kendine: "İşe ne kadar emek ve istikrar koyuyorsun?",
      dusuk: "Çabuk yorulur, çoğu şeyi ertelerim.",
      yuksek: "Yorulmadan, istikrarla çalışırım.",
    },
    "Dürüstlük": {
      kendine: "Sözün ve davranışın tutarlı mı? Hatanı açıkça kabul eder misin?",
      dusuk: "Bazen gerçeği eğip bükebilirim.",
      yuksek: "Her zaman dürüstüm; hatamı açıkça kabul ederim.",
    },
    "Vizyonerlik": {
      kendine: "Büyük resmi görüp anlatabiliyor musun? Geleceğe dair net bir ufkun var mı?",
      dusuk: "Daha çok günü kurtarmaya odaklanırım.",
      yuksek: "Net bir gelecek vizyonum var; başkalarına da gösteririm.",
    },
    "Mütevazılık": {
      kendine: "Başarıyı paylaşır mısın? Konuşmaktan çok dinler misin?",
      dusuk: "Çok konuşur, övgüyü kendime alırım.",
      yuksek: "Dinlerim; başarıyı ekiple paylaşırım.",
    },
    "Takım Ruhu": {
      kendine: "Zorlanan arkadaşına destek olur, ortak işe katkı verir misin?",
      dusuk: "Daha çok kendi işime bakarım.",
      yuksek: "Ekip için elimi taşın altına koyarım.",
    },
    "İletişim Gücü": {
      kendine: "Derdini açık ve sade anlatabiliyor musun? Karşındakine göre dilini ayarlar mısın?",
      dusuk: "Anlatırken zorlanır, yanlış anlaşılabilirim.",
      yuksek: "Herkesle net ve etkili iletişim kurarım.",
    },
    "Cesaret": {
      kendine: "Riskli anlarda öne çıkar, ilk adımı atar mısın?",
      dusuk: "Geride durmayı tercih ederim.",
      yuksek: "İlk adımı atan, riski göze alan ben olurum.",
    },
    "Sorumluluk Alma": {
      kendine: "Beklemeden harekete geçer, işi sonuna kadar götürür müsün?",
      dusuk: "Sorumluluktan kaçabilirim.",
      yuksek: "İşi sahiplenir, sonuna kadar götürürüm.",
    },
    "Pozitif Enerji": {
      kendine: "Ortama enerji katar mısın? Yorgunken bile çevreni ayağa kaldırır mısın?",
      dusuk: "Enerjim çabuk düşer.",
      yuksek: "Bulunduğum yere enerji ve moral katarım.",
    },
  } as Record<string, { kendine: string; dusuk: string; yuksek: string }>,
  tahmin: {
    baslik: "Kendini Ne Kadar Tanıyorsun?",
    aciklama:
      "Aynan açılmadan önce bir tahmin yap: başkaları sana hangi özellikte en yüksek, hangisinde en düşük puanı verecek? Tahminin Gün 3'te gerçek sonuçlarla karşılaştırılacak.",
    enYuksekEtiket: "En yüksek puan alacağım özellik",
    enDusukEtiket: "En düşük puan alacağım özellik",
    seciniz: "Seç…",
    ayniOzellikHata: "İki tahmin aynı özellik olamaz.",
    kilitleUyari: "Tahminin tek seferlik — gönderdikten sonra değiştiremezsin.",
    gonder: "Tahminimi Kilitle",
    gonderiliyor: "Kilitleniyor…",
    tamamBaslik: "Tahminin kilitlendi 🎯",
    tamamAciklama:
      "Gün 3'te aynan açıldığında tahmininle gerçeği yan yana göreceksin.",
    enYuksekOzet: "En yüksek tahminin",
    enDusukOzet: "En düşük tahminin",
    hataSunucu: "Tahmin kaydedilemedi. Lütfen tekrar dene.",
    kartBaslik: "🎯 Tahmin Oyunu",
    kartAciklama: "Kendini ne kadar tanıyorsun? Aynan açılmadan tahminini kilitle.",
    kartTamam: "Tahminin kilitli — Gün 3'ü bekle.",
    tahminYap: "Tahmin Yap",
  },
  // FAZ 0 — Pusula (Nedenler çalışması), kamp öncesi
  pusula: {
    baslik: "Pusulan",
    // Rıza ekranı — psikolojik veri saklama onayı
    rizaBaslik: "Başlamadan önce",
    rizaMetin:
      "Birazdan birlikte hayattaki gerçek nedenlerini bulacağız. Yazdıkların yalnızca senin için saklanır ve kampta sana daha iyi eşlik etmek için kullanılır. Kimse ham cevaplarını görmez — yalnızca paylaşmayı seçtiklerin.",
    rizaNot: "Dilediğin an verilerini silebilirsin.",
    rizaKabul: "Anladım, başlayalım",
    listeBaslik: "Hayatındaki öncelikler",
    listeAciklama:
      "Olmazsa olmaz dediğin, en çok önemsediğin ya da gelecekte sahip olmak istediğin şeyler. Deneyim gibi düşün — 'aileyle vakit', 'kendi işim', 'sağlık' gibi. Her seferinde bir tane yaz; en az 3, en çok 10 madde.",
    listeYer: (n: number) => `${n}. öncelik`,
    // Madde madde (tek tek) akış
    listeTekYer: "Tek bir şey yaz…",
    listeEkle: "Ekle",
    listeYazdiklarin: "Yazdıkların",
    // Her eklemeden sonra teşvik edici bir sonraki soru (n = şu ana dek eklenen sayı)
    listeTesvik: (n: number) => {
      if (n === 0)
        return "Hayatta en çok değer verdiğin, en önemsediğin şey nedir?";
      const ord = [
        "Birincisini",
        "İkincisini",
        "Üçüncüsünü",
        "Dördüncüsünü",
        "Beşincisini",
        "Altıncısını",
        "Yedincisini",
        "Sekizincisini",
        "Dokuzuncusunu",
        "Onuncusunu",
      ];
      const etiket = ord[n - 1] ?? `${n}.`;
      return `${etiket} yazdın 🌟 Bir tane daha — hayatta değer verdiğin, önemsediğin başka ne var?`;
    },
    listeSonHatirlatma: "Onuncuyu da yazdın. Hazırsan tamamla.",
    listeDevam: "Listeyi tamamla",
    listeAzUyari: (n: number) => `En az ${n} madde yaz.`,
    // Liste → sohbet köprüsü (geçiş net anlatılsın, ani atlama olmasın)
    kopruBaslik: "Sıra sohbette",
    kopruMetin:
      "Önceliklerini aldım. Şimdi AYNA seninle bu seçimler üzerine kısa bir sohbet edecek — acelesi yok, içinden geldiği gibi yanıtla.",
    kopruAdimlar: [
      "Önce listeni birlikte eleyeceğiz: en az değerliyi tek tek bırakacaksın.",
      "Sonra bu önceliklerin bugünkü hayatınla ne kadar örtüştüğüne bakacağız.",
      "En sonda, önündeki gerçek engeli birlikte yüzeye çıkaracağız.",
    ] as const,
    kopruBasla: "Sohbete başla",
    // Sohbet ilerleme göstergesi
    ilerlemeEtiket: "Sohbet ilerlemesi",
    ilerlemeSonuna: "Neredeyse bitti — son birkaç soru.",
    // Bitiş ekranı — otomatik atlamaz, kişi okuyup devam eder
    bittiDevam: "Devam et →",
    // Baştan başlatma
    sifirlaDugme: "↺ Baştan başla",
    sifirlaOnayMetin: "Tüm cevapların silinip en baştan başlanacak. Emin misin?",
    sifirlaEvet: "Evet, baştan başla",
    sifirlaVazgec: "Vazgeç",
    sifirlaniyor: "Sıfırlanıyor…",
    girisYer: "Yanıtını buraya yaz…",
    gonder: "Gönder",
    sesYaz: "Sesle yaz",
    sesDurdur: "Dinlemeyi durdur",
    sesDinleniyor: "Dinliyorum, konuş… (bitince ■ ile durdur)",
    maddeAc: "Tamamını gör",
    maddeKapat: "Kısalt",
    listeHatirlat: "Öncelik listen — seçmek için dokun",
    dusunuyor: "AYNA düşünüyor…",
    yukleniyor: "Yükleniyor…",
    tamamBaslik: "Pusulan kuruldu 🧭",
    tamamMetin:
      "Nedenlerini buldun. Bunu kampta hatırlayacağım. Şimdi kampa gelmen yeterli — kapıda görüşürüz.",
    kampBekleBaslik: "Kampta görüşürüz",
    kampBekleMetin:
      "Pusulan hazır. Kampın geri kalanı, oraya gelip odandaki kodu okuttuğunda açılacak. O ana dek dinlen — yolculuk başlıyor.",
    hata: "Bir şeyler ters gitti.",
    aiHata: "Şu an yanıt veremedim, az sonra tekrar dene.",
    acHataBaslik: "Kod geçersiz",
    acHataMetin: "Bu kod kampı açmıyor. Lütfen görevliyle iletişime geç.",
    // FAZ 0 hazırlık hub'ı (Pusula bitince, kampa gelmeden)
    hazirlikBaslik: "Pusulan kuruldu 🧭",
    hazirlikAltBaslik:
      "Kampa gelmeden bunları da hazırlarsan ilk gün doğrudan yaşamaya başlarsın. İstersen hepsini kampta da yapabilirsin — hiçbiri zorunlu değil.",
    adimPuanBaslik: "Kendini bir tanı",
    adimPuanMetin:
      "10 liderlik özelliğinde kendini değerlendir. Kampta başkalarının gözünden göreceğin halinle karşılaştıracağın başlangıç karen.",
    adimPuanDugme: "Başla",
    adimPuanDuzelt: "Puanlarını düzelt",
    adimPuanSure: "~2 dk",
    adimRehberBaslik: "Kamp rehberi",
    adimRehberMetin: "3 gün boyunca seni neler bekliyor, kısaca bak.",
    adimRehberDugme: "Göz at",
    adimFotoBaslik: "Bir kare — seninle tanışalım",
    adimFotoMetin: "Tanışma ve eşleştirme için kendi fotoğrafın.",
    adimFotoSure: "~30 sn",
    adimYuzBaslik: "Canlı Aynan",
    adimYuzMetin:
      "Sana özel sahneler için canlı Aynana ihtiyacımız var — birkaç saniyelik yakın çekim. Gerisi kampta…",
    adimYuzSure: "~1 dk",
    adimTamam: "Tamamlandı",
    siradaki: "Sıradaki",
    bildirimBaslik: "Hatırlatmaları aç",
    hazirlikBekle:
      "Hazırsın. Kampın geri kalanı, oraya gelip odandaki kodu okuttuğunda açılacak. O ana dek dinlen.",
    // Hub zenginleştirme: ilerleme, sosyal kanıt, kilitli sürprizler, rozet, geri sayım
    kampaKalan: "Kampa kalan",
    hazirYuzde: (n: number) => `%${n} hazırsın`,
    hazirRozet: "Hazır Lider 🏅",
    hazirRozetMetin:
      "Tüm hazırlığını tamamladın — kampa bir adım önde geliyorsun.",
    sosyalKanit: (n: number) =>
      n > 0
        ? `${n} lider pusulasını çoktan kurdu — sen de aralarındasın.`
        : "İlk pusulayı kuranlardansın.",
    kilitBaslik: "Kampta seni neler bekliyor",
    kilitNot: "Kampta açılacak",
    kilit1: "Kendi sesinle bir sürpriz",
    kilit2: "3. günde aynan açılır",
    kilit3: "Sana özel AYNA görevleri",
  },
  // Grup ödevi (katılımcı görünümü)
  grup: {
    baslik: "Grubunun Ödevi",
    altBaslik: (takim: string) => `${takim} · birlikte çalışın`,
    yok: "Henüz grup ödevin yok. AYNA hazırladığında burada görünecek.",
    grupIci: "🤝 Grup-içi",
    grupBirlikte: "🔗 Grup-birlikte",
    hedefEtiket: "Odak",
    takimsiz: "Henüz bir gruba atanmadın.",
  },
  // AYNA KOÇU — adayın her an danışabildiği bağlamsal sohbet
  kocu: {
    baslik: "Ayna Koçu",
    altBaslik: "Her an buradayım",
    yer: "AYNA'ya yaz… (takıldığın, merak ettiğin ne varsa)",
    gonder: "Gönder",
    geri: "Geri",
    yukleniyor: "Açılıyor…",
    hata: "Bir şey ters gitti. Tekrar dene.",
    uretilemedi: "Şu an cevap veremedim, bir daha dener misin?",
  },
  // 90 GÜNLÜK YOLCULUK — kamp sonrası taahhüt planı (adaya görünen)
  plan: {
    baslik: "90 Günlük Yolculuğun",
    altBaslik: "Kamp burada bitmiyor — asıl yolculuk şimdi başlıyor.",
    taahhutBaslik: "Kendine verdiğin söz (Sonuç Kartı)",
    gucluEtiket: "Güçlü alanın",
    korNoktaEtiket: "Kör noktan",
    gorevEtiket: "Kamp görevin",
    sozBaslik: "Hedeflerin",
    kayitHedef: "Kayıt",
    gorusmeHedef: "Görüşme",
    fazBaslik: "Yol haritan",
    fazSimdi: (gun: number, ad: string) => `Gün ${gun} · şu an: ${ad}`,
    fazGun: (bas: number, son: number) => `Gün ${bas}–${son}`,
    checkinMetin: "Bu hafta nerede tıkandın, nerede ilerledin? AYNA'ya anlat — yolunu birlikte açalım.",
    checkinDugme: "Koçunla konuş",
  },
  // MINI 360 — Ekip Aynası (opt-in akran puanlaması)
  mini360: {
    baslik: "Ekip Aynası",
    aciklama:
      "Kör nokta tek başına görülemez — onu başkasının aynasında görürsün. Önce kendini puanla, sonra ekibinden 3 kişiye anonim linkini gönder. Sen-ekip farkı, göremediğin yeri ölçer.",
    olcek: { 1: "Hiç katılmıyorum", 2: "Az", 3: "Kısmen", 4: "Çoğunlukla", 5: "Tamamen katılıyorum" } as Record<number, string>,
    ozBaslik: "Önce sen — kendini puanla",
    gonder: "Kaydet",
    gonderiliyor: "Kaydediliyor…",
    kaydedildi: "✓ Kaydedildi",
    // Paylaşım
    paylasBaslik: "Ekibinden 3 kişiye gönder",
    paylasMetin: "Onlara şunu söyle: beni değil, gelişimimi düşün, dürüst ol. Link anonimdir — kimin ne dediği sana görünmez.",
    linkKopyala: "🔗 Anonim linki kopyala",
    kopyalandi: "✓ Kopyalandı",
    // Sonuç
    sonucBaslik: "Sen vs Ekip",
    senPuani: "Sen",
    ekipOrt: "Ekip",
    fark: "Fark",
    disSayi: (n: number) => `${n} anonim yanıt`,
    disYok: "Henüz dış yanıt yok — linki paylaş, birikince burada görünür.",
    enBuyukFark: (ifade: string) => `En büyük fark: “${ifade}” — kampta ilk buraya bak.`,
    disDolu: "Bu kişi için yeterli yanıt toplandı, teşekkürler.",
    hata: "İşlem başarısız. Lütfen tekrar dene.",
    kapaliBaslik: "Ekip Aynası kapalı",
    kapaliMetin: "Bu çalışma Diamond adayları için açılır. Sıran gelince burada olacak.",
    // Dış (anonim) sayfa
    disBaslik: (ad: string) => `${ad} için Ekip Aynası`,
    disAciklama: "Anonim. Onu değil, gelişimini düşün — dürüst ol. Her ifadeye 1-5 ver.",
    disGonder: "Gönder",
    disTesekkurBaslik: "Teşekkürler 🙏",
    disTesekkurMetin: "Yanıtın anonim olarak kaydedildi. Bu, onun göremediği yeri görmesine yardım edecek.",
    disGecersiz: "Bu link geçersiz.",
  },
  // ÖN FARKINDALIK — kamp öncesi Ayna/Kalibrasyon çalışması (Faz A: Katman 1)
  onFarkindalik: {
    baslik: "Liderlik Aynası",
    girisBaslik: "Ne düşündüğünü değil, ne yaptığını gösterir",
    girisMetin:
      "Bu bir kişilik testi değil — bir ayna. Amacı seni etiketlemek değil, kampa gelmeden nerede tıkandığını sana göstermek. Gücü tek şeye bağlı: dürüstlüğüne. Acelesi yok; günde birkaç madde yeter.",
    girisKazanimlar: [
      "Güçlü alanını ve kör noktanı net göreceksin.",
      "Kampta sana özel görevler bu cevaplara göre şekillenecek.",
      "Üç gün sonra ne kadar yol aldığını sayılarla göreceksin.",
    ],
    girisDevam: "Başla",
    olcek: {
      1: "Hiçbir zaman",
      2: "Nadiren",
      3: "Bazen",
      4: "Sık sık",
      5: "Her zaman",
    } as Record<number, string>,
    blokGiris: (ad: string) => `${ad}`,
    blokAlt:
      "Son birkaç ayını düşün. İçinden geçeni değil, gerçekten yaptığını işaretle.",
    // Katman 2 (açık analizi) — ikili 1-10
    onemSoru: "Bu senin için ne kadar değerli? (1 = az · 10 = çok)",
    gercekSoru: "Son 30 günde gerçekte ne kadar yaşadın? (1 = hiç · 10 = tam)",
    // Katman 3 (gerçeklik rakamları)
    sayiAlt: "Görüş değil, rakam. Son 30 günü düşün ve gerçek sayıyı yaz.",
    // Katman 4/5 yazılı yanıtlar
    metinYer: "Kısa ve dürüst yaz — bu cevap sana ait.",
    metinAtla: "Şimdilik geç →",
    ilerleme: (yapilan: number, toplam: number) => `${yapilan} / ${toplam}`,
    kaydet: "Kaydet",
    kaydediliyor: "Kaydediliyor…",
    devam: "Devam",
    geri: "Geri",
    geriDon: "Ana sayfaya dön",
    kismiNot: "İstediğin kadarını şimdi yap — kalanını sonra ekleyebilirsin.",
    enAzBir: "Kaydetmek için en az bir madde işaretle.",
    hata: "Kaydedilemedi. Lütfen tekrar dene.",
    // Tamam ekranı
    tamamBaslik: "Bu bölümü tamamladın 🪞",
    tamamMetin:
      "İlk katmanı bitirdin. Kalan adımlar kamp yaklaştıkça açılacak — her gün küçük bir parça.",
    devamBaslik: "Kaldığın yerden devam",
    devamMetin: "Birkaç madde daha işaretle; acelesi yok.",
    guvenBaslik: "Bir an dur 🪞",
    guvenMetin:
      "Cevaplarının çoğu birbirine çok yakın çıktı. Bu ayna ancak dürüstlüğünle çalışır — istersen ilk maddelere bir kez daha, gerçekten yaptığını düşünerek bak.",
    guvenTekrar: "Maddelere tekrar bak",
    gozdenGecir: "← Cevaplarımı gözden geçir",
    kalanDk: (dk: number) => `~${dk} dk kaldı`,
    kapaliBaslik: "Henüz başlamadı",
    kapaliMetin: "Ön farkındalık çalışması yakında açılacak. Hazır olduğunda burada olacak.",
  },
  // Kamp öncesi profil fotoğrafı
  profilFoto: {
    sec: "📸 Fotoğraf seç / çek",
    kaydet: "Kaydet",
    vazgec: "Vazgeç",
    degistir: "Fotoğrafı değiştir",
    yukleniyor: "Yükleniyor…",
    hata: "Yüklenemedi, tekrar dene.",
    kirpIpucu: "Sürükle ve yakınlaştırarak yüzünü çemberin içine getir.",
    yakinlastir: "Yakınlaştır",
  },
  // #5 Günün Aynası — günlük mikro check-in
  gunluk: {
    ust: "Günün Aynası",
    soru: "Bugün hangi liderlik özelliğini yaşadın?",
    notYer: "İstersen bir cümle ekle — nasıl oldu?",
    gonder: "Kaydet",
    gonderiliyor: "Kaydediliyor…",
    tamamMetin: "Bugünkü check-in'ini yaptın. Yarın yine buradayım. — AYNA",
    hata: "Kaydedilemedi, tekrar dene.",
  },
  // "Canlı Ayna" — selfie sonrası çoklu açılı yüz yakalama (KYC hissi)
  canliAyna: {
    basla: "🔮 Canlı Aynanı oluştur",
    tamam: "✓ Canlı Aynan hazır",
    ust: "Son bir şey",
    ustBaslik: "Canlı Aynan",
    duz: "Yüzünü çembere yerleştir — düz bak",
    sag: "Başını yavaşça sağa çevir",
    sol: "Şimdi yavaşça sola çevir",
    cek: "Çek",
    gonderiliyor: "Yansın diye gönderiliyor…",
    vazgec: "Vazgeç",
    izinHata: "Kameraya erişilemedi — izni kontrol et.",
    izinRet: "Kamera izni verilmedi. Tarayıcı ayarlarından izin verip tekrar dene.",
    kameraYok: "Ön kamera bulunamadı.",
    kameraMesgul: "Kamera başka bir uygulama tarafından kullanılıyor. Onu kapatıp tekrar dene.",
    desteklenmiyor:
      "Bu tarayıcıda kamera açılamıyor. Linki Safari ya da Chrome'da aç (uygulama içi tarayıcı kamerayı engeller).",
    hata: "Gönderilemedi, tekrar dene.",
  },
  // FAZ 3 — Reddi Kutla (Go-for-No / Fun Failure)
  red: {
    baslik: "Reddi Kutla",
    aciklama:
      "'Hayır' bir kayıp değil — veri. Her hayır, doğru 'evet'e bir adım. Aldığın reddi buraya düş, sayacın yürüsün.",
    dugme: "Bir 'Hayır' aldım",
    aciklamaYer: "Ne oldu? (isteğe bağlı)",
    kaydet: "Kasaya Ekle",
    vazgec: "Vazgeç",
    toplamEtiket: "Tecrübe Puanı",
    haftaEtiket: (n: number) => `Bu hafta: ${n}`,
    kaydediliyor: "Kaydediliyor…",
    hata: "Kaydedilemedi, tekrar dene.",
    reframeler: [
      "İlk verin kasada. Çoğu kişi bir 'Hayır'da durur — sen saymaya başladın.",
      "Bu 'Hayır' senin hakkında değildi. Sadece 'evet'in orada olmadığını gösterdi.",
      "Hayır, kapı değil — pusula. Bir sonraki kapıya yönlendirdi seni.",
      "Sayacın işliyor. İstatistik senden yana: ne kadar çok hayır, o kadar yakın evet.",
      "Cesaret bu. Çoğu kişi soramadığı için hayır bile alamaz. Sen sordun.",
      "Bir veri daha. Strateji burada şekilleniyor — devam.",
    ] as string[],
  },
  // FAZ 1 — Boşluk Anı (kamp zirvesi)
  bosluk: {
    baslik: "Boşluk",
    yukleniyor: "Hazırlanıyor…",
    basla: "Hazırım",
    ileri: "Devam et",
    kanitBaslik: "Ama ben başka bir şey gördüm",
    cumleYer: "Geriye kalan cümleyi kendi kelimelerinle yaz…",
    cumleKaydet: "Mühürle",
    cumleBosUyari: "Bir cümle yaz.",
    tamamBaslik: "Mühürlendi 🔒",
    tamamMetin:
      "Bu cümle artık senin. Yola çıktığında — eski cümle kıpırdadığında — onu sana hatırlatacağım.",
    pusulaYokBaslik: "Önce pusulan",
    pusulaYokMetin: "Boşluk Anı için önce Nedenler çalışmanı (Pusula) tamamlaman gerek.",
    kanitYokBaslik: "Henüz erken",
    kanitYokMetin:
      "Seni izlemeye yeni başladım. Kanıtlar kamp ilerledikçe birikiyor — birazdan burada olacaklar.",
    hata: "Bir şeyler ters gitti, tekrar dene.",
  },
  admin: {
    komutan: {
      baslik: "Komutan Paneli",
      aciklama:
        "Sistemi oyunlaştıran mimarın radarı: beş eksende ekibin canlı durumu. Mikro-yönetim değil, sistem tasarımı.",
      eksenler: {
        katilim: "Katılım Akışı",
        gorevMomentumu: "Görev Momentumu",
        aidiyet: "Aidiyet",
        tamamlama: "Tamamlama",
        retDirenci: "Ret Direnci",
      },
      detayBaslik: "📊 Momentum & Kayma Radarı",
      momentumBaslik: "📈 Haftalık Momentum",
      momentumYok: "İlk momentum skoru Cuma akşamı yazılır.",
      ekipOrt: (n: number) => `Ekip ortalaması: ${n}/100`,
      kaymaBaslik: "📡 Kayma Radarı",
      kaymaYok: "Kimse kaymıyor — su durgun. 🌊",
      kaymaSatiri: (saat: number) => `${saat} saattir sessiz`,
      modBaslik: "Sistem Modu",
      modKamp: "🏕 Kamp Modu",
      modYolculuk: "🗺 90 Günlük Yolculuk",
      yolculukGunu: (gun: number, faz: string) => `Gün ${gun}/90 · Faz: ${faz}`,
    },
    baslik: "Yönetim Paneli",
    nav: {
      panel: "Panel",
      ayna: "AYNA",
      program: "Program",
      katilimcilar: "Katılımcılar",
      eslestirme: "Eşleştirme",
      qr: "QR Kartlar",
      grupOdev: "Grup Ödevleri",
      elmas: "Elmas Seçimi",
      moderasyon: "Moderasyon",
      komutan: "Komutan",
      sahne: "Sahne",
      kiosk: "Kayıt",
      foto: "Fotoğraf",
      canliAyna: "Canlı Ayna",
      sozler: "Sözler",
      test: "Prova",
      kurulum: "Kurulum",
      analiz: "Analiz",
      sunum: "Sunum",
      gorevTuru: "Görev Türleri",
    },
    // #3 Nav kategorileri: 14 düz sekme yerine 4 grup + Panel
    navGrup: {
      kurulum: "Kurulum",
      canli: "Canlı",
      icerik: "İçerik",
      ayarlar: "Ayarlar",
      prova: "PROVA",
    },
    // Admin UX paketi (2026): kokpit hızı, güveni, hata payı
    ux: {
      // #2 Canlı tazelik göstergesi
      tazelik: {
        canli: "Canlı",
        azOnce: "az önce güncellendi",
        snOnce: (n: number) => `${n} sn önce güncellendi`,
        dkOnce: (n: number) => `${n} dk önce güncellendi`,
        duraklat: "Duraklat",
        surdur: "Sürdür",
        yenile: "Şimdi yenile",
        duraklatildi: "Otomatik güncelleme duraklatıldı",
      },
      // #6 Nav kokpit rozetleri
      kokpit: {
        raporAcik: "Rapor açık",
        raporKapali: "Rapor kapalı",
        muhurAcik: "Mühür açık",
        muhurKapali: "Mühür kapalı",
        moderasyon: (n: number) => `${n} moderasyon`,
      },
      // #1 + #4 Komut paleti / hızlı eylem
      palet: {
        ac: "Hızlı eylem",
        ipucu: "⌘K",
        yer: "Ara: sayfa, kişi, kontrol…",
        bos: "Sonuç yok",
        sayfalar: "Sayfalar",
        kisiler: "Kişiler",
        kontroller: "Kontroller",
        kopyalandi: "Kod kopyalandı ✓",
        kapat: "Kapat",
      },
      // #7 Panel içi bölüm atlama
      atla: {
        baslik: "Bölümler",
        ozet: "Özet",
        ilerleme: "İlerleme",
        tehlike: "Kritik",
        kvkk: "KVKK",
        araclar: "Araçlar",
      },
      // #5 Son kritik eylemler şeridi
      sonEylem: {
        baslik: "Son işlemler",
        bos: "Henüz kritik işlem yok.",
        tumu: "Tümü",
      },
      // #3 Kamp akışı sıralayıcı
      akis: {
        baslik: "Kamp Akışı",
        aciklama: "Programa göre sıradaki anahtar. Üstüne basınca ilgili kontrole gider.",
        suan: "ŞU AN",
        siradaki: "SIRADAKİ",
        tamam: "✓",
        bekliyor: "Bekliyor",
        uyariMuhur: "Mührü, raporları açtığın anda (veya hemen öncesinde) aç.",
        adimHazirlik: "Hazırlık (FAZ 0)",
        adimDalga: (n: number) => `Dalga ${n}`,
        adimBosluk: "Boşluk Anı",
        adimRapor: "Ayna Raporu",
        adimMuhur: "Mühür Açılışı",
      },
      // #10 Geri-al sayacı
      geriAlSn: (n: number) => `Geri al (${n})`,
    },
    // #5 Tehlike bölgesi: tüm katılımcıları etkileyen kritik anahtarlar
    tehlike: {
      baslik: "Kritik Kontroller",
      aciklama:
        "Bu anahtarlar tüm katılımcıların telefonunu anında etkiler. Her birinin onayı ve geri-al penceresi var.",
    },
    // #1 İkincil araçlar: faz dışı her şey burada katlanık durur
    araclar: {
      baslik: "Tüm araçlar",
      aciklama: "Kurulum, yedek, eşleştirme, zamanlama ve işlem günlüğü.",
    },
    // #6 Bağlamsal boş/sakin durum
    bosDurum: {
      ikon: "🌙",
      baslik: "Şu an her şey yolunda",
      aciklama: "Aktif dalga yok. Sıradaki adım yukarıdaki öneri kartında.",
    },
    // #8 Mobilde alt-sabit birincil aksiyon çubuğu
    altAksiyon: {
      etiket: "Önerilen adım",
    },
    // FAZ 0 — Pusula (Nedenler) penceresi + oda QR kodu + tamamlanma
    fazSifir: {
      baslik: "FAZ 0 — Pusula (Nedenler)",
      aciklama:
        "Kamp öncesi pencere. Açıkken kampa girmemiş katılımcı önce Pusula'sını (nedenlerini) kurar; oda QR kodu kilidi açar.",
      pencereAcik: "● Pencere açık — katılımcılar Pusula'ya yönlendiriliyor",
      pencereKapali: "○ Pencere kapalı — normal akış",
      pencereAc: "Pencereyi Aç",
      pencereKapat: "Pencereyi Kapat",
      kodEtiket: "Oda QR kodu (kampa giriş kilidi)",
      kodYer: "ör. SAPANCA2026",
      kodKaydet: "Kodu Kaydet",
      kodKaydedildi: "Kod kaydedildi ✓",
      kodBos: "Kod boş — kilit devre dışı (kimse kampı açamaz)",
      qrIpucu: (url: string) => `Oda QR'ı şu adrese gitmeli: ${url}`,
      tamamlanma: (n: number, t: number) => `${n}/${t} katılımcı pusulasını kurdu`,
      hatirlatDugme: "🔔 Hazırlığı eksik olanlara hatırlat",
      hatirlatSonuc: (n: number) =>
        n > 0 ? `${n} kişiye hatırlatma gönderildi` : "Herkesin hazırlığı tam 🎉",
      hata: "İşlem başarısız, tekrar dene.",
    },
    // FAZ 1 — Boşluk Anı penceresi + derinlik panosu
    fazBir: {
      baslik: "FAZ 1 — Boşluk Anı",
      aciklama:
        "Gün 3 zirvesi. Açıkken pusulasını kuran katılımcılar iç engellerini kamptaki kanıtla yüzleşmeye davet edilir.",
      pencereAcik: "● Pencere açık — Boşluk Anı erişimde",
      pencereKapali: "○ Pencere kapalı",
      pencereAc: "Boşluk Anı'nı Aç",
      pencereKapat: "Pencereyi Kapat",
      tamamlanma: (n: number, t: number) => `${n}/${t} Boşluk Anı'nı tamamladı`,
      kanitsizUyari: (n: number) =>
        n > 0
          ? `⚠️ ${n} kişi kanıtsız — açmadan önce onlara gözlem/görev yönlendir`
          : "✓ Herkesin yeterli kanıtı var",
      hata: "İşlem başarısız, tekrar dene.",
    },
    // A2 — Mühür Açılışı penceresi (kamp sonu, before/after sesli reveal)
    muhur: {
      baslik: "Mühür Açılışı",
      aciklama:
        "Kamp sonu zirvesi. Açıkken, raporuna giren katılımcı önce onboarding'de mühürlediği sözü açar: yolculuğun başındaki kendi sesini dinler ve 'kampa ___ geldin, ___ dönüyorsun' adlandırmasını görür.",
      pencereAcik: "● Pencere açık — Mühür Açılışı erişimde",
      pencereKapali: "○ Pencere kapalı",
      pencereAc: "Mühür Açılışı'nı Aç",
      pencereKapat: "Pencereyi Kapat",
      muhurluUyari: (n: number, t: number) =>
        n < t
          ? `🔒 ${n}/${t} kişi söz mühürledi — mührü olmayanlar bu anı atlar`
          : `✓ ${t}/${t} kişinin mühürlü sözü var`,
      hata: "İşlem başarısız, tekrar dene.",
    },
    // FAZ 2 — Ödev paketi (kamp sonrası 10/15 gün, Ağustos ödevleri)
    odev: {
      baslik: "Ödev Gönder",
      aciklama:
        "Tüm katılımcılara yapılandırılmış bir ödev gönder (10 gün, 15 gün, Ağustos…). Görev olarak düşer; yanıtlarlar, AYNA puanlar.",
      baslikYer: "Ödev başlığı (ör. '10 Gün: İlk 5 Görüşme')",
      govdeYer: "Ödev metni — ne yapacaklar ve sana ne yazacaklar?",
      gunEtiket: "Teslim süresi",
      gun: (n: number) => `${n} gün`,
      gonder: "Herkese Gönder",
      onay: (e: string) => `"${e}" tüm katılımcılara ödev olarak gönderilsin mi?`,
      gonderiliyor: "Gönderiliyor…",
      gonderildi: (n: number) => `${n} katılımcıya ödev gönderildi ✓`,
      bosUyari: "Başlık ve metin gerekli.",
      hata: "Gönderilemedi, tekrar dene.",
    },
    // FAZ 4 (Eylül kapısı) + FAZ 5 (cascade) — ölçüm/analiz panosu
    analiz: {
      baslik: "Analiz",
      aciklama:
        "Eylül kapısı: üç ekseni AYRI ölç. İş sayısı tek başına dönüşümü doğrulamaz — kimlik, davranış ve sonucu birbirine karıştırma.",
      kimlikBaslik: "1 · Kimlik dayanıklılığı",
      kimlikAciklama: "Pusula + yeni cümle ayakta mı? (dönüşümün gerçek sinyali)",
      pusula: "Pusula",
      bosluk: "Yeni cümle",
      kanitsiz: "Kanıtsız",
      davranisBaslik: "2 · Davranış / aktivite",
      davranisAciklama: "Motor dönüyor mu? Görev ritmi, churn, ret, momentum.",
      gorevOran: "Görev tamamlama",
      churn: "Kayma (risk)",
      red: "Reddi Kutla",
      momentum: "Momentum ort.",
      isBaslik: "3 · İş sonucu",
      isAciklama: "Lagging gösterge — geç gelir, dış kaynaktan.",
      isNot: "İş metrikleri (ciro, kayıt, ekip büyümesi) dış sistemden gelir; burada manuel/entegrasyonla eklenir. Tek başına dönüşümü doğrulamaz.",
      takimBaslik: "Takım kırılımı (cascade)",
      takimAciklama: "Her takım liderinin kendi ekibinin durumu — tüm Türkiye ölçeğinin provası.",
      takim: "Takım",
    },
    // #8 Tek akışlı kurulum sihirbazı: CSV → kod → QR, adım adım
    kurulum: {
      baslik: "Kurulum Sihirbazı",
      aciklama: "Kamp öncesi 3 adımda hazır ol.",
      adimEtiket: (n: number) => `Adım ${n}`,
      adim1Baslik: "Katılımcı listesini yükle",
      adim1Aciklama:
        "CSV dosyasını yükle; her kişi için 6 haneli giriş kodu otomatik üretilir.",
      dosyaSec: "CSV dosyası seç",
      yukle: "Yükle ve Kod Üret",
      yukleniyor: "Yükleniyor…",
      adim1Tamam: (n: number) => `${n} katılımcı yüklendi, kodlar üretildi`,
      adim2Baslik: "Kodlar hazır",
      adim2Aciklama: (n: number) =>
        `${n} katılımcı için 6 haneli giriş kodları otomatik üretildi.`,
      listeyiGor: "Katılımcı Listesini Gör",
      adim3Baslik: "QR kartlarını yazdır",
      adim3Aciklama:
        "Yaka kartı QR kodlarını yazdır; katılımcılar okutup tek dokunuşla girsin.",
      qrYazdir: "QR Kartlarını Aç",
      hata: "Bir şeyler ters gitti, tekrar dene.",
      tamamBaslik: "Hazırsın! 🎉",
      tamamAciklama: "Tüm adımlar tamam. Kamp gününe hazırsın — iyi kamplar!",
    },
    // #7 "Şimdi ne yapmalıyım?" — adminin o an basması gereken tek adım
    asistan: {
      baslik: "Şimdi ne yapmalıyım?",
      etiket: "Önerilen adım",
    },
    // #2 Bugünün Akışı: o günün admin adımları (checklist)
    akis: {
      baslik: "Bugünün Akışı",
      aciklama: "Bugün sırayla yapılacaklar — her adım ilgili kontrole götürür.",
    },
    // #4 Yardımcı görevli: sınırlı yetki bilgilendirmesi
    yardimci: {
      banner:
        "👀 Yardımcı görevli — yalnız izleme ve hatırlatma yapabilirsin. Kritik anahtarlar (dalga, rapor, veri) yöneticiye özeldir.",
    },
    // #8 Proaktif uyarı kartları
    uyarilar: {
      baslik: "Dikkat",
    },
    // #10 Yardım/ipucu katmanı: her kontrolün yanında kısa açıklama
    ipucu: {
      ac: "Yardım",
      dalga:
        "Dalgayı açınca katılımcılar o turda puanlama yapabilir. Her güne bir dalga (Gün 1→Dalga 1). Çoğu kişi bitirince kapat.",
      rapor:
        "Açınca herkes kişisel Ayna Raporunu görür — kapanışın 'wow' anı. Yalnız 3. günün sonunda, mektuplar hazırken aç.",
      davet:
        "Kamp sonrası 90 günlük yolculuk için katılımcılara e-posta davetini gönderir. Bir kez, kamp bitince.",
      yedek: "Tüm kamp verisinin (puanlar, sözler, ayarlar) yedeğini indirir.",
      ikili: "Sohbet/ortak eşleştirmelerini oluşturur. Genelde kamp öncesi bir kez.",
      kvkk: "Katılımcının veri silme taleplerini buradan onaylayıp işlersin.",
    },
    // Yönetim sunumu (demo): bir adayın 6 aylık yolculuğunu adım adım göster
    sunum: {
      baslik: "Yönetim Sunumu — Aday Yolculuğu",
      aciklama:
        "Bir adayın kamp öncesinden 6 aya uzanan 360° yolculuğu. İleri/Geri ya da → ← ok tuşlarıyla ilerle.",
      cik: "Panele dön",
      karistir: "Yeniden karıştır",
      sunumNotu: "Sunum notu",
      geri: "Geri",
      ileri: "İleri",
      bastan: "Baştan",
      ozEtiket: "Kendi gözünden",
      disEtiket: "Başkalarının gözünden",
      ayna: "AYNA",
      momentumEtiket: "Momentum",
      yanitEtiket: "Yanıtı",
      gizliAdim: "kim olduğu gizli",
    },
    // #6 Kamp zaman tüneli (panel tepesi)
    zamanTuneli: {
      baslik: "Kamp Zaman Tüneli",
      hazirlik: "Hazırlık",
      gun1: "Gün 1",
      gun2: "Gün 2",
      gun3: "Gün 3",
      kapanis: "Kapanış",
      saha: "Saha",
    },
    // Görev Türü Stüdyosu: admin türleri açıp kapatır
    gorevTuru: {
      baslik: "Görev Türü Stüdyosu",
      aciklama:
        "AYNA görevleri bu türlerde her kişiye özel canlı üretir. Beğenmediğin bir türü kapatırsan AYNA program boyunca o türde görev üretmez. En az bir tür açık kalmalı.",
      kaydet: "Kaydet",
      kaydediliyor: "Kaydediliyor…",
      kayitli: "✓ Kaydedildi",
      enAzBir: "En az bir tür açık kalmalı.",
      hata: "Kaydedilemedi, tekrar dene.",
      turler: {
        gozlem: {
          ad: "👁 Gözlem",
          aciklama: "Çevreyi ve başkalarını fark etme görevleri.",
          ornek: "Kimse fark etmeden en çok kime destek olduğunu gözlemle, bana yaz.",
        },
        cesaret: {
          ad: "🔥 Cesaret",
          aciklama: "Konfor alanını zorlayan küçük cesur adımlar.",
          ornek: "Hiç tanımadığın birinin yanına otur ve tek soru sor.",
        },
        yansima: {
          ad: "🪞 Yansıma",
          aciklama: "İç bakış / kendini sorgulama (genelde akşamları).",
          ornek: "Bugün seni en çok zorlayan an neydi? Ondan ne öğrendin?",
        },
        gizli: {
          ad: "🤫 Gizli Görev",
          aciklama: "'Bunu kimseye söyleme' ruhuyla özel görevler.",
          ornek: "Bunu kimseye söyleme: bugün birine gizlice bir iyilik yap.",
        },
        tahmin: {
          ad: "🎲 Tahmin",
          aciklama: "Akşam sonuçlarda karşılaştırılacak öngörü oyunları.",
          ornek: "Bu akşamki etkinlikte ilk kimin öne çıkacağını tahmin et.",
        },
        simulasyon: {
          ad: "🎭 Simülasyon",
          aciklama: "İtiraz karşılama / saha provası (sesli).",
          ornek: "Bir aday 'Bu işler bana göre değil' diyor — sen ne dersin?",
        },
      },
    },
    // Admin yardım metinleri (her bölümün "?" içeriği). Yerine bakan görevli
    // soru sormadan işi yürütebilsin diye detaylı yazılır. Her entry { baslik,
    // metin: paragraf[] }. YENİ ÖZELLİK EKLENİNCE: ilgili açıklamayı GÜNCELLE.
    yardim: {
      // ---- Panel (ana sayfa) ----
      panel: {
        baslik: "Yönetim Paneli nasıl çalışır?",
        metin: [
          "NE: Kampın komuta merkezi — tüm kampı buradan yönetirsin. Sayfa yukarıdan aşağı 'önce en acil' mantığıyla dizildi.",
          "EN ÜSTTE: 'Şimdi ne yapmalıyım?' kartı o an yapman gereken TEK adımı söyler; programı bilmiyorsan bile sadece onun düğmesine bas, doğru yere gider. Altında canlı rakamlar (katılımcı, öz-puan, değerlendirme), dikkat isteyen uyarılar ve (kamp günündeyse) o günün saat saat akışı gelir.",
          "ORTADA: 'Canlı Çalışma Alanı' açık dalgada kimin ilerlediğini gösterir. Hemen altında KIRMIZI çerçeveli 'Kritik Kontroller' — tüm telefonları anında etkileyen anahtarları (dalga aç/kapa, raporları aç, prova modu, faz pencereleri) toplar. Kamp boyunca en çok burayı kullanırsın.",
          "EN ALTTA: 'Tüm Araçlar' katlanır bölümü kurulum/sonrası gibi günlük olmayan araçları gizler. Her kartın yanındaki '?' o kartın ne işe yaradığını ve ne zaman basılacağını anlatır.",
          "ROL: 'yardımcı' görevli yalnız izleme + hatırlatma görür; kritik anahtarlar gizlidir. Tam yetkili admin her şeyi görür.",
        ],
      },
      panelAsistan: {
        baslik: "Şimdi ne yapmalıyım? (asistan kartı)",
        metin: [
          "NE: Sistem, kamp takvimini ve uygulamanın o anki durumunu okuyup yapman gereken TEK en önemli adımı buraya yazar.",
          "NASIL KULLANILIR: Programı hiç bilmiyorsan bile kartın düğmesine bas — seni doğru kontrole götürür (ör. 'Dalga 1'i aç', 'Raporları açma vakti').",
          "RENK = ACİLİYET: Kart altın renkli ve parıldıyorsa adım ACİL, hemen yap. Nötr griyse acil bir şey yok, izlemeye devam et.",
          "NE ZAMAN: Gün boyu birkaç dakikada bir buraya bak; kart değiştikçe bir sonraki hamleni söyler.",
        ],
      },
      panelOzet: {
        baslik: "Canlı özet rakamları",
        metin: [
          "NE: Kampın canlı nabzı — kaç katılımcı kayıtlı, kaçı kendini puanlamayı bitirdi, toplam kaç değerlendirme girildi, hangi dalga açık.",
          "DOKUN: Bir rakama dokununca ilgili bölüme atlar (öz-puana dokun → eksik kişiler; dalgaya dokun → dalga kontrolü).",
          "Rakamlar kendi kendine tazelenir; bir işlem yaptıktan sonra etkisini burada anında görürsün.",
        ],
      },
      panelUyari: {
        baslik: "Proaktif uyarılar",
        metin: [
          "NE: Dikkat isteyen durumları öne çıkarır — onay bekleyen fotoğraf, KVKK silme talebi, öz-puanı geç kalan çok kişi gibi.",
          "DOKUN: Bir uyarıya dokununca seni çözüleceği yere götürür.",
          "Hiç uyarı yoksa bu alan GÖRÜNMEZ — yani burası boşsa her şey yolunda demektir. Yalnız tam yetkili admin görür.",
        ],
      },
      panelGun: {
        baslik: "Bugünün akışı",
        metin: [
          "NE: Bugün bir kamp günüyse (17–19 Temmuz) o günün admin checklist'ini sırayla verir: hangi saatte hangi dalgayı açacağın, ne zaman duyuru/rapor yapacağın.",
          "DOKUN: Her adım tıklanır, seni ilgili kontrole götürür. Sırayla yukarıdan aşağı ilerle.",
          "Kamp günü değilse görünmez. Saat saat tüm plan için 'Program' sayfasına bak.",
        ],
      },
      panelIlerleme: {
        baslik: "Canlı çalışma alanı (ilerleme)",
        metin: [
          "NE: Yalnız AÇIK dalga için hesaplanır (kamp aynı anda tek dalga yaşar). Tablo: kim kendini puanladı, kim kaç kişiyi değerlendirdi, onu kaç kişi değerlendirdi.",
          "TOPLU HATIRLAT: Geç kalanları seç → 'Toplu hatırlat' ile tek seferde nazik bir push gönder ('değerlendirmeni bekliyoruz' gibi).",
          "Açık dalga yoksa sade bir 'boş durum' kartı çıkar; bu HATA DEĞİL, sadece o an puanlama turu kapalı demektir. Bir dalga açınca tablo dolar.",
        ],
      },
      // ---- Kritik Kontroller (tehlike bölgesi) ----
      tehlike: {
        baslik: "Kritik Kontroller bölgesi",
        metin: [
          "NE: Buradaki anahtarlar TÜM katılımcıların telefonunu ANINDA etkiler — o yüzden kırmızı çerçeveyle ayrıldı ve en dikkatli kullanılacak bölge burası.",
          "GÜVENLİK: Her kritik işlem önce bir onay sorar; bastıktan sonra kısa bir 'Geri Al' penceresi açılır — yanlışlıkla bastıysan oradan geri alırsın.",
          "İÇİNDE: Dalga aç/kapa, Ayna Raporlarını aç, Prova modu, FAZ 0 ve FAZ 1 pencereleri. Yalnız tam yetkili admin erişir.",
        ],
      },
      dalga: {
        baslik: "Dalga (puanlama turu) yönetimi",
        metin: [
          "NE: Dalga = bir değerlendirme (puanlama) turu. Üç dalga var: Dalga 1 (İlk İzlenim), Dalga 2 (Gözlem), Dalga 3 (Gerçek Algı).",
          "AÇINCA NE OLUR: O dalgaya dahil herkesin telefonunda 'değerlendir' ekranı açılır; kendini ve kendisine atanmış kişileri 1–10 puanlar (6'nın altına yorum zorunlu). KAPATINCA o tur KİLİTLENİR; artık o dalgaya puan girilemez.",
          "KURAL: Aynı anda yalnız BİR dalga açık olabilir. Sıralı git: Gün 1 → Dalga 1, Gün 2 → Dalga 2, Gün 3 → Dalga 3.",
          "ADIM ADIM: Günün ilgili oturumunda dalgayı 'Aç' → 'Canlı Çalışma Alanı'ndan ilerlemeyi izle → çoğu kişi bitince 'Kapat'. Geç kalan varsa kapatmadan önce 'Toplu hatırlat' gönder.",
          "DİKKAT: Erken kapatırsan girmeyenler o turu kaçırır; açık unutursan (tek dalga kuralı yüzünden) sonraki dalgayı açamazsın.",
        ],
      },
      rapor: {
        baslik: "Ayna Anı — raporları açma",
        metin: [
          "NE: 'Ayna Anı' = herkesin kişiye özel 'Ayna Raporu'nu görmesi. Kampın kapanıştaki en güçlü 'vav' anı: kişi kendini ilk kez başkalarının gözünden görür (öz-algı vs dış-algı + kör nokta).",
          "AÇINCA NE OLUR: Tüm katılımcıların telefonunda rapor kilidi açılır, anında görebilirler. Geri alınamaz bir etkidir — zamanlama kritiktir.",
          "NE ZAMAN: YALNIZCA 3. günün kapanışında, sahnede o ana geldiğinde aç. Erken açarsan tüm sürpriz ve kapanış etkisi kaybolur.",
          "ADIM ADIM: 3 dalganın da kapandığından ve 'mektup hazır' sayacının dolduğundan emin ol → kapanış anına gel → 'Raporları Aç' → onayla. Yanlış an bastıysan açılan 'Geri Al' ile hemen kapat.",
        ],
      },
      prova: {
        baslik: "Prova (test) modu",
        metin: [
          "NE: 'Bu bir testtir' işareti. Açıkken HERKESİN ekranının tepesinde kırmızı 'PROVA MODU' şeridi belirir.",
          "NEDEN: Kamp öncesi denemelerde gönderdiğin bildirim/görevlerin gerçek sanılmasını önler.",
          "NE ZAMAN: Hazırlık/deneme yaparken AÇIK tut. Gerçek katılımcılarla canlıya geçmeden HEMEN ÖNCE mutlaka KAPAT — açık kalırsa katılımcılar her şeyi 'prova' sanıp ciddiye almaz.",
        ],
      },
      fazSifir: {
        baslik: "FAZ 0 — Pusula penceresi + kamp kilidi",
        metin: [
          "NE: FAZ 0 = kamp öncesi hazırlık dönemi. Katılımcı kampa gelmeden Pusula'yı (nedenler) doldurur, sonra kendini puanlar, selfie + Canlı Ayna ekler.",
          "İKİ ANAHTAR: (1) Pusula penceresini aç/kapa — açıkken katılımcılar FAZ 0 hazırlığını yapabilir. (2) Kamp giriş kilidi: kamp başlayınca girilecek oda QR'ı / kilit kodu (kamp_kilit_kodu).",
          "ETKİSİ: Kamp 'açılana' kadar katılımcılar FAZ 0'da KİLİTLİ kalır — görevler/duvar gibi kamp sayfalarını göremez, yalnız hazırlık ekranını görür. Kampı açtığında herkes kamp akışına geçer.",
          "NE ZAMAN: Pencereyi kamptan ~1–2 hafta önce aç; kamp günü gelince kilidi açıp katılımcıları kampa al.",
        ],
      },
      fazBir: {
        baslik: "FAZ 1 — Boşluk Anı penceresi",
        metin: [
          "NE: FAZ 1 = kamp içindeki 'Boşluk Anı' çalışması. Katılımcı eski/sınırlayıcı bir cümlesini yeni bir cümleyle değiştirir; derinlik panosunda bunlar birikir.",
          "AÇINCA NE OLUR: Katılımcıların telefonunda Boşluk Anı ekranı çalışır.",
          "NE ZAMAN: Programda bu çalışmaya ayrılan oturumda aç; oturum bitince kapat.",
        ],
      },
      muhur: {
        baslik: "Mühür Açılışı — kamp sonu before/after",
        metin: [
          "NE: Onboarding'de katılımcı kendi sesiyle 'kamptan nasıl döneceğim?' sözünü mühürler. Mühür Açılışı, kamp sonunda o sözü geri açar: kişi yolculuğun başındaki kendi sesini dinler, yazdığı sözü görür ve 'kampa ___ olarak geldin, ___ olarak dönüyorsun' adlandırmasını alır.",
          "AÇINCA NE OLUR: Katılımcı Ayna Raporu'na girdiğinde, rapordan ÖNCE tam-ekran Mühür Açılışı çalışır (bir kez). Adlandırma kişinin öz-puanından (geliş) ve başkalarının dış-puanından (dönüş) kural-tabanlı üretilir — vav anı budur.",
          "ÖN KOŞUL: En güçlü etki için Mühür'ü, raporları (reports_visible) açtığın anda ya da hemen öncesinde aç. Sözünü mühürlememiş (sessiz ayna seçen) kişiler bu anı sorunsuz atlar.",
          "NE ZAMAN: Kamp kapanışında, Ayna Raporu açılışıyla birlikte aç. Kapatınca yeni girenler için tekrar gizlenir.",
        ],
      },
      kvkk: {
        baslik: "KVKK — veri silme talepleri",
        metin: [
          "NE: Bir katılımcı 'verilerimi silin' derse talebi buraya düşer. Yasal (KVKK) bir yükümlülüktür, işlenmesi zorunludur.",
          "ADIM ADIM: Talebi gör → kişiyi doğrula → 'Onayla/Sil' ile işle. İşlenince kişinin verisi sistemden kaldırılır.",
          "Bu bölüm yalnız BEKLEYEN talep varken görünür; boşsa hiç çıkmaz — yani görünüyorsa ilgilenmen gereken bir şey var demektir.",
        ],
      },
      // ---- Tüm Araçlar ----
      araclar: {
        baslik: "Tüm Araçlar",
        metin: [
          "NE: Günlük kamp akışında gerekmeyen ikincil araçların toplandığı katlanır bölüm; panel sade kalsın diye varsayılan KAPALI. Başlığa basınca açılır.",
          "İÇİNDE: hazırlık hatırlatma, kod bulma, hızlı duyuru, ödev paketi, 90 gün daveti, ikili eşleştirme, veri yedeği, otomatik zamanlama ve işlem günlüğü. Her birinin kendi '?' açıklaması var.",
        ],
      },
      hazirlik: {
        baslik: "Hazırlık hatırlatma",
        metin: [
          "NE: Kamp öncesi (FAZ 0) hazırlığını tamamlamamış katılımcılara hatırlatma push'u gönderir.",
          "BASINCA NE OLUR: Eksiği olan herkese, eksiğine göre uyarlanmış bir bildirim gider ('Pusula'nı doldur' / 'kendini puanla' / 'fotoğrafını ekle').",
          "NE ZAMAN: Kamptan önceki günlerde, hazırlık oranı düşükse birkaç günde bir bas. Kimlerin eksik olduğunu panel özetinden görürsün.",
        ],
      },
      kodBul: {
        baslik: "Kod bul",
        metin: [
          "NE: Kodunu unutan/kaybeden katılımcıyı İSİMLE arayıp 6 haneli giriş kodunu anında bulursun — özellikle kayıt masasında işe yarar.",
          "ADIM ADIM: İsim yaz → çıkan sonuçtan kodu oku/söyle. Aynı işi kayıt masası ekranında (Kiosk) da yapabilirsin.",
        ],
      },
      odev: {
        baslik: "Ödev paketi",
        metin: [
          "NE: Kamp sonrası (Ağustos, 10/15 günlük) ödev/uygulama paketini katılımcılara açar.",
          "BASINCA NE OLUR: Katılımcılara kamp sonrası görev seti tanımlanır.",
          "NE ZAMAN: Yalnız kamp bittikten sonra, ilgili dönemde kullan.",
        ],
      },
      davet: {
        baslik: "90 günlük yolculuk daveti",
        metin: [
          "NE: Kamp sonrası 90 günlük sahada yolculuk için katılımcılara e-posta daveti gönderir (yolculuk modunun başlangıç tetiği).",
          "BASINCA NE OLUR: E-postası olan TÜM katılımcılara davet maili gider. Kartta kaç kişinin e-postası olduğu yazar.",
          "NE ZAMAN: Yalnız BİR kez, kamp bittikten sonra. İki kez gönderme — tekrar daveti spam olur.",
        ],
      },
      ikili: {
        baslik: "İkili eşleştirme",
        metin: [
          "NE: Sohbet/ortak (ikili) eşleştirmelerini oluşturur — kimin kiminle eşleşeceğini sistem belirler.",
          "NE ZAMAN: Genelde kamp öncesi bir kez. Mevcut eşleşme sayısı kartta görünür; tekrar çalıştırmadan önce mevcut olanı kontrol et.",
        ],
      },
      yedek: {
        baslik: "Veri yedeği",
        metin: [
          "NE: Tüm kamp verisinin (katılımcılar, puanlar, görevler, sözler, ayarlar) yedeğini tek dosya olarak indirir.",
          "NE ZAMAN: Geri alınamaz bir işlemden ÖNCE (ör. test verisini sıfırlamadan, toplu import'tan önce) ve kamp sonunda arşiv için bir kez al. Dosyayı güvenli bir yerde sakla.",
        ],
      },
      zamanlama: {
        baslik: "Otomatik zamanlama",
        metin: [
          "NE: Dalga açma/kapama gibi olayları İLERİ bir saate planlarsın; sistem zamanı gelince otomatik çalıştırır — gece/oturum sırasında elle basmana gerek kalmaz.",
          "ADIM ADIM: Olayı + saatini seç → kaydet. 'Şimdi Tetikle' düğmesi, vakti gelmiş bekleyen olayları beklemeden hemen çalıştırır (provada test için kullanışlı).",
          "DİKKAT: Otomatik zamanlama kursan bile kritik anlarda panelden gözle doğrula; tek başına ona bağımlı kalma.",
        ],
      },
      islemGunlugu: {
        baslik: "İşlem günlüğü",
        metin: [
          "NE: Son 20 kritik admin eylemini listeler — kim, ne zaman, neyi değiştirdi (dalga açtı, rapor açtı vb.).",
          "NEDEN: 'Bunu kim/ne zaman yaptı?' sorusunu yanıtlamak, değişiklikleri denetlemek için bak. Salt okunur.",
        ],
      },
      // ---- Diğer sayfalar ----
      kurulum: {
        baslik: "Kurulum Sihirbazı",
        metin: [
          "NE: Kamp öncesi hazırlığı tek ekrandan adım adım yaptıran sihirbaz: (1) katılımcı listesini CSV ile yükle → (2) herkese 6 haneli giriş kodu üret → (3) yazdırılabilir QR kartları çıkar.",
          "NE ZAMAN: Kamptan önce bir kez. Üstte kaç katılımcı kayıtlı görünür; tamamlayınca Katılımcılar ve QR sayfaları dolar.",
        ],
      },
      katilimcilar: {
        baslik: "Katılımcılar",
        metin: [
          "NE: Tüm katılımcıların ana listesi — ad, takım, şehir, telefon ve 6 haneli giriş kodu. Bir kodun yanındaki düğmeyle panoya kopyalarsın.",
          "Üstteki araçlardan toplu içe aktarma/ekleme yaparsın. Liste isme göre sıralı; birini ararken tarayıcı bul (Ctrl/Cmd+F) işe yarar.",
        ],
      },
      eslestirme: {
        baslik: "Gözlem eşleştirmesi (360°)",
        metin: [
          "NE: Kim kimi gözlemleyip puanlayacak (360°) onu belirler. Her kişiye iki katman atanır: GRUP-İÇİ (🤝 kendi takımından — seni en çok görenler) ve GRUP-DIŞI (🌍 farklı takımlardan — taze, objektif bakış). Tüm gözlemler gizlidir (kişi onu kimin izlediğini bilmez); yük dengeli dağıtılır.",
          "ADIM ADIM: Üstteki formdan grup-içi/grup-dışı sayılarını seç → 'Eşleştir'e bas → sistem atamaları üretir → alttaki tabloda her gözlemcinin hedeflerini gör.",
          "NE ZAMAN: Kamp öncesi bir kez, katılımcı listesi ve takımlar kesinleştikten SONRA. Liste/takım değişirse tekrar çalıştır.",
        ],
      },
      qr: {
        baslik: "QR kartlar",
        metin: [
          "NE: Her katılımcı için yazdırılabilir QR kart üretir (giriş linki + kodu gömülü). QR, kartın açıldığı ortamın adresini taşır.",
          "NASIL: 'Yazdır' ile çıktı al, yaka kartı olarak dağıt; katılımcı telefon kamerasıyla okutunca otomatik giriş yapar — kod yazmaya gerek kalmaz.",
          "NE ZAMAN: Kodlar üretildikten sonra, kamp/kayıt öncesi bas ve yazdır.",
        ],
      },
      kiosk: {
        baslik: "Kayıt masası ekranı",
        metin: [
          "NE: Kayıt masasındaki bir ekranda (laptop/tablet) açık tutulur — canlı katılım sayacı, uygulamayı açan büyük QR ve kodunu kaybedeni isimle bulma.",
          "NASIL: Katılımcı QR'ı okutur, kendi koduyla girer; sayaç anlık ilerler — masada 'kaç kişi girdi' bir bakışta görünür.",
          "NE ZAMAN: Kayıt/karşılama sırasında masadaki ekrana koy.",
        ],
      },
      analiz: {
        baslik: "Analiz panosu",
        metin: [
          "NE: Kampın ölçüm/karar panosu — katılımcıya GÖSTERİLMEZ, yöneticiye özeldir. Üç ekseni AYRI ölçer: kimlik dayanıklılığı, davranış/aktivite, iş sonucu.",
          "Altta takım kırılımı vardır. NE ZAMAN: Kamp boyunca/sonrası gidişatı değerlendirmek, zayıf noktaları yakalamak için bak.",
        ],
      },
      analizKimlik: {
        baslik: "Eksen 1 — Kimlik",
        metin: [
          "NE: Kimlik dönüşümünün izi — Pusula'yı ve Boşluk Anı'nı tamamlayanlar, bir de 'kanıtsız' kişiler.",
          "'KANITSIZ' = hakkında yeterli somut geri bildirim (yorum/takdir) birikmemiş kişi; içi boş bir kapanış riski taşır. Sayı SARIYSA o kişilere kanıt biriktirmeye (görev/takdir) odaklan.",
        ],
      },
      analizDavranis: {
        baslik: "Eksen 2 — Davranış",
        metin: [
          "NE: Hareket/aktivite ölçüsü — görev tamamlama oranı, kayma (churn) riskindekiler, toplam 'reddi kutla' kaydı ve ortalama haftalık momentum.",
          "NE YAPARSIN: Churn ya da düşük momentum yükselirse müdahale (hatırlatma, birebir) zamanı demektir.",
        ],
      },
      analizIs: {
        baslik: "Eksen 3 — İş sonucu",
        metin: [
          "NE: Dış/iş sonucu ekseni. Bu metrikler kamp dışı gerçek aktivitelere bağlıdır; ilgili veri akışı bağlandığında dolar. Şimdilik bilgi amaçlı.",
        ],
      },
      analizTakim: {
        baslik: "Takım kırılımı",
        metin: [
          "NE: Her takımın hazırlık durumu yan yana — Pusula tamamlama, Boşluk tamamlama ve kanıtsız kişi sayısı. Liderler kendi ekibinin nabzını tek bakışta görür; en geride kalan takıma odaklanırsın.",
        ],
      },
      aynaAkis: {
        baslik: "Son Görevler",
        metin: [
          "AYNA'nın canlı ürettiği son 20 görev. Görevler sabit bir listeden değil, her kişiye özel (öz/dış puanları, Pusula nedeni, önceki görevleri) AYNA tarafından canlı ve benzersiz üretilir.",
          "Bir satıra dokununca o kişiye giden TAM mesajı, kişinin yanıtını ve AYNA'nın puan + yorumunu görürsün — kimin ne aldığından haberdar olursun.",
          "Görev türlerini (cesaret, simülasyon, gözlem…) program öncesi 'Olası Görevler' ekranından açıp kapatabilirsin.",
        ],
      },
      aynaDirektor: {
        baslik: "AYNA Kontrol Odası",
        metin: [
          "NE: Kampı yöneten yapay zekâ AYNA'nın kumandası.",
          "UYANDIR/DURDUR: 'AYNA'yı Uyandır' dersen AYNA aktifleşir — 5 dakikada bir uyanıp kişiye özel görevler dağıtır, yanıtları puanlar, programı açıklar, sessizleşeni dürter. 'Durdur' dersen susar.",
          "TEMPO + MOD: Tempo görevlerin sıklığını ayarlar (sürpriz 1–3 saat / sabit 2 / sabit 3). Sistem modu 'Kamp' (3 gün) veya 'Yolculuk' (90 gün saha) — kamp bitince Yolculuğa geçirirsin.",
          "OTOMATİK SESSİZLİK: Kampta gece 00:00–06:30 ve sahnede konuşmacı varken AYNA kendi kendine susar, telefonları rahatsız etmez.",
          "İZLE: Alttaki 'Son Görevler' akışında AYNA'nın o an ne ürettiğini canlı görür, bir satıra basıp detayına bakarsın.",
          "NE ZAMAN: Kamp başlarken 'Uyandır'; kamp biterken 'Durdur' ya da 'Yolculuğu Başlat'. 'Şimdi Tik Çalıştır' provada AYNA'yı elle bir tur döndürür.",
        ],
      },
      komutan: {
        baslik: "Komutan Paneli",
        metin: [
          "NE: Liderin beş eksenli canlı radarı — katılım, görev momentumu, aidiyet, tamamlama ve ret direnci. Topluluğun nabzını tek bakışta verir; her açılışta taze hesaplanır.",
          "Yanında haftalık momentum sıralaması ve son 24 saatte sessizleşenleri (kayma) gösteren listeler vardır. NE ZAMAN: Genel gidişatı görmek ve kime müdahale edeceğine karar vermek için bak.",
        ],
      },
      komutanRadar: {
        baslik: "Beş eksenli radar",
        metin: [
          "NE: Beş davranış ekseninin 0–100 değeri. GENİŞ ve dengeli şekil = sağlıklı topluluk; bir köşe içe çökmüşse orada zayıflık var — o ekseni güçlendiren aksiyon al.",
        ],
      },
      komutanMomentum: {
        baslik: "Haftalık momentum",
        metin: [
          "NE: Kişi başına haftalık momentum skoru (yüksek=yeşil, orta=altın, düşük=kırmızı) ve ekip ortalaması.",
          "NE YAPARSIN: Kırmızı/düşük skorlular desteğe ihtiyaç duyuyor olabilir — onlara öncelik ver.",
        ],
      },
      komutanKayma: {
        baslik: "Kayma radarı",
        metin: [
          "NE: Son 24 saatte sessizleşen / etkinliği düşen kişiler ve kaç saattir sessiz oldukları.",
          "NE YAPARSIN: Listedekilere erken müdahale et (birebir mesaj/arama) — birini kaybetmeden önce yakalamak için.",
        ],
      },
      sahne: {
        baslik: "Sahne Kumandası",
        metin: [
          "NE: Canlı etkinlikte salondaki büyük ekranın (/sahne, projeksiyon) NE göstereceğini buradan yönetirsin.",
          "NASIL: Buradan AYNA'yı sahnede aktif edersin, hangi sahne anı/dalganın gösterileceğini seçersin, 'Açılış Anonsu' gibi sahne anlarını tetiklersin. (Projeksiyondaki ekranda '🔊 Sesi Aç' açık olmalı ki AYNA salona sesli konuşsun.)",
          "NE ZAMAN: Sahne/sunum anlarında, projeksiyon açıkken kullan. Sessizlik gereken oturumda AYNA'nın push göndermemesini de buradan kontrol edersin.",
        ],
      },
      moderasyon: {
        baslik: "Yorum moderasyonu",
        metin: [
          "NE: Katılımcıların BAŞKALARINA yazdığı değerlendirme yorumları buraya düşer (kişinin kendine yazdığı öz-yorumlar kişiye özeldir, burada görünmez).",
          "BASINCA NE OLUR: Uygunsuz/kırıcı bir yorumu 'Gizle' → o yorum raporlarda ve büyük ekranda görünmez olur. İstersen geri gösterirsin. Karar verirken kim→kime ve hangi özellik bilgisine bakabilirsin.",
          "NE ZAMAN: Dalga puanlamaları geldikçe ara ara tara; özellikle raporları açmadan ÖNCE bir kez gözden geçir.",
        ],
      },
      foto: {
        baslik: "Fotoğraf moderasyonu",
        metin: [
          "NE: Katılımcıların yüklediği fotoğraflar ortak Anı Duvarı'na ve büyük ekrana çıkmadan ÖNCE burada onay bekler — yani filtre sensin.",
          "BASINCA NE OLUR: 'Onayla' → fotoğraf anında herkese görünür olur. 'Gizle' → görünmez kalır.",
          "NE ZAMAN: Kamp boyunca, özellikle duvarı/ekranı yansıtmadan önce bekleyenleri temizle.",
        ],
      },
      canliAyna: {
        baslik: "Canlı Ayna — karakter referansları",
        metin: [
          "Katılımcıların Canlı Ayna yüz kareleri (düz/sağ/sol) + selfie burada toplanır. Bulanık/eksik olanları gözden geçirirsin — 'Tam set' yeşil rozetliyse video için hazır demektir.",
          "Üretim: tam set olan kişileri seç → 'Video üret' bas. Sistem 3 açı + selfie'yi çoklu referans olarak kullanıp kimliği tutarlı bir video üretir; Canlı Ayna yoksa eski tek-foto'ya düşer.",
          "Çoklu referansın tam çalışması için HIGGSFIELD_KARAKTER_MODEL ortam değişkeninin ayarlı olması gerekir; ayarlı değilse güvenli şekilde tek-görselli üretime düşer.",
        ],
      },
      sozler: {
        baslik: "Kapanış Sözleri",
        metin: [
          "NE: Kamp kapanışında alınan kişisel sözler — 'Temmuz'da kayıt', 'Ağustos'ta görüşme' gibi hedefler ve sonradan gerçekleşen ilerleme.",
          "AÇINCA NE OLUR: 'Söz ekranını AÇ' dersen katılımcıların telefonunda söz verme ekranı açılır; girdikleri sözler tabloya düşer, toplamları ve kişi bazında ilerleme görünür.",
          "NE ZAMAN: Yalnız kamp KAPANIŞ anında aç. Erken açma.",
        ],
      },
      program: {
        baslik: "Kamp Programı",
        metin: [
          "NE: Resmî kamp akışı (3 gün, saat saat) + AYNA'nın her oturumdaki planı — bu plan yalnız adminde görünür, katılımcı görmez.",
          "SÜRPRİZ DUYURULAR: Altta, programda yazmayan ve AYNA'nın push + sahne anonsuyla açıklayacağı ek etkinlikleri zamanlar/açıklarsın. 'Açıkla' dediğinde katılımcılara duyuru gider. 'Sahne sessizliği' işaretli oturumlarda AYNA hiç bildirim göndermez.",
          "NE ZAMAN: Planı kamptan önce gözden geçir; sürpriz duyuruyu açıklamak istediğin an tetikle.",
        ],
      },
      test: {
        baslik: "Prova / Test paneli",
        metin: [
          "NE: Güvenli deneme alanı — DEMO takımındaki sahte katılımcılarla ve kamp günlerini simüle ederek her şeyi GERÇEK veriye dokunmadan provarsın.",
          "NASIL: Demo kişilerle giriş yapar, görev/dalga akışını test eder, kamp gününü ileri alırsın.",
          "NE ZAMAN: Canlıya geçmeden, akışı öğrenmek/denemek için. Gerçek katılımcıları etkilemez.",
        ],
      },
      sunum: {
        baslik: "Yönetim Sunumu (Demo)",
        metin: [
          "Bir adayın kamp öncesinden başlayıp 6 aya uzanan 360° yolculuğunu yönetim kuruluna/ekiplere göstermek için hazır sunum modu — sistemi satarken en güçlü kozun.",
          "'İleri' (ya da → / boşluk) ile adım adım ilerle; her ekranda adayın o an gördüğü şey + yüksek sesle okuyabileceğin bir 'sunum notu' var. 'Yeniden karıştır' farklı bir aday/varyasyon getirir.",
          "İçerik önceden hazırlanmıştır: internetsiz, anında, hatasız çalışır ve gerçek katılımcı verisine dokunmaz.",
        ],
      },
      gorevTuru: {
        baslik: "Görev Türü Stüdyosu",
        metin: [
          "NE: AYNA görevleri sabit listeden değil, 6 türde (gözlem, cesaret, yansıma, gizli, tahmin, simülasyon) her kişiye özel canlı üretir.",
          "KAPATINCA NE OLUR: Bir türün anahtarını kapatıp 'Kaydet' dersen AYNA program boyunca o türde görev ÜRETMEZ (ör. simülasyon istemiyorsan kapat).",
          "NE ZAMAN: Program öncesi bir kez ayarla. En az bir tür açık kalmalı (hepsi kapatılamaz). Her türün altında örnek görev metni var.",
        ],
      },
      zamanTuneli: {
        baslik: "Kamp Zaman Tüneli",
        metin: [
          "NE: Panelin tepesinde 'şu an neredeyiz' çizgisi — Hazırlık → Gün 1/2/3 → Kapanış → Saha. Altın yanan adım o anki konum, yeşil ✓ geçilenler.",
          "NASIL: Raporlar açıksa Kapanış; bir dalga açıksa o gün; değilse takvim gününe göre belirlenir. Dalga açma / rapor açma gibi hamlelerde otomatik ilerler.",
        ],
      },
    },
    // #9 Hazır duyuru şablonları (tek dokunuşla herkese push)
    duyuru: {
      baslik: "Hızlı Duyuru",
      aciklama: "Tek dokunuşla herkese bildirim gönder.",
      onaySoru: (e: string) => `"${e}" herkese gönderilsin mi?`,
      gonder: "Evet, gönder",
      vazgec: "Vazgeç",
      gonderiliyor: "Gönderiliyor…",
      gonderildi: (e: string) => `"${e}" herkese gönderildi ✓`,
      hata: "Gönderilemedi, tekrar dene.",
    },
    // #7 Tek bakış canlı özet (büyük rakamlar)
    ozet: {
      katilimci: "Katılımcı",
      ozPuan: "Öz-puan",
      gorus: "Puanlama",
      dalga: "Açık dalga",
      dalgaYok: "—",
    },
    // #6 Hızlı kişi/kod bulma
    kodBul: {
      baslik: "Hızlı Kod Bulma",
      aciklama: "Kodunu unutan katılımcıyı isimle bul.",
      yer: "İsim yaz (en az 2 harf)…",
      sonucYok: "Eşleşme yok.",
      araniyor: "Aranıyor…",
    },
    // #5 "Kampa hazır mısın?" tek bakışta hazırlık kontrol listesi
    hazirlik: {
      baslik: "Kampa hazır mısın?",
      hepsiTamam: "Her şey hazır — kampa hazırsın! 🎉",
      eksikVar: "Birkaç adım eksik — aşağıdakileri tamamla.",
      katilimci: "Katılımcılar yüklü",
      katilimciIpucu: "Liste boş — CSV yükle",
      eslestirme: "Eşleştirme yapıldı",
      eslestirmeIpucu: "Henüz eşleştirme yok",
      ayna: "AYNA uyanık",
      aynaIpucu: "AYNA uyuyor — uyandır",
      bildirim: "Bildirimler çalışıyor",
      bildirimIpucu: "Push abonesi/anahtarı yok",
      duzelt: "Düzelt →",
    },
    // #9 Eksikleri tek dokunuşla dürt: öz-puanını bitirmeyenlere hatırlatma push'u
    durt: {
      bildirimBaslik: "🪞 Kendini puanla",
      bildirimGovde: "Kampın ilk adımı seni bekliyor — kendini dürüstçe puanla.",
      dalgaYok: "Şu an açık dalga yok.",
      dugme: (n: number) => `Eksik ${n} kişiyi dürt 🔔`,
      gonderiliyor: "Gönderiliyor…",
      sonuc: (n: number) => `${n} kişiye hatırlatma gönderildi ✓`,
      hata: "Gönderilemedi, tekrar dene.",
    },
    // #10 Eylem tostu mesajları (köşede "✓ yapıldı" geri bildirimi)
    // #3 geriAl: tostta tek dokunuşla son eylemi geri alma
    tost: {
      dalgaAcildi: "Dalga açıldı ✓",
      dalgaKapatildi: "Dalga kapatıldı",
      raporAcildi: "Ayna Raporları açıldı ✓",
      raporGizlendi: "Raporlar yeniden gizlendi",
      geriAl: "↩ Geri al",
      geriAlindi: "Geri alındı",
    },
    // #10 Güvenli geri-alma: kritik anahtarlarda yanlış dokunuş akışı bozmasın
    onay: {
      evet: "Evet, yap",
      vazgec: "Vazgeç",
      dalgaKapat: "Dalgayı kapatınca katılımcılar artık puanlayamaz. Emin misin?",
      raporAc: "Raporları açınca herkes aynasını görür — bu, kapanışın geri alınamaz anı. Emin misin?",
      raporKapat: "Raporları yeniden gizlemek istediğine emin misin?",
    },
    // Fotoğraf anı duvarı moderasyonu (büyük ekran herkese açık → onay şart)
    fotoModerasyon: {
      baslik: "Fotoğraf Moderasyonu",
      aciklama:
        "Onaylanan fotoğraflar ortak Anı Duvarı'nda ve büyük ekranda görünür.",
      yok: "Onay bekleyen fotoğraf yok.",
      onayla: "Onayla",
      gizle: "Gizle",
      calisiyor: "…",
      hata: "İşlem başarısız. Tekrar dene.",
    },
    // Canlı Ayna karakter referansları: kalite kontrol + toplu video üretimi
    canliAyna: {
      baslik: "Canlı Ayna — Karakter Referansları",
      aciklama:
        "Katılımcıların Canlı Ayna yüz kareleri (düz/sağ/sol) + selfie. Bulanık/eksik olanları gözden geçir; tam olanlar için video üretimini buradan başlat.",
      yok: "Henüz Canlı Ayna karesi yükleyen katılımcı yok.",
      tamRozet: "Tam set",
      eksikRozet: "Eksik",
      selfie: "Selfie",
      durumYok: "—",
      durumBekliyor: "Sırada",
      durumUretiliyor: "Üretiliyor…",
      durumHazir: "✓ Video hazır",
      durumHata: "Hata",
      sec: "Seç",
      secilenler: (n: number) => `${n} kişi seçili`,
      uret: "Seçilenler için video üret",
      uretiliyor: "Başlatılıyor…",
      sonuc: (b: number, h: number, g: number) =>
        `${b} üretim başladı${h ? `, ${h} hata` : ""}${g ? `, ${g} girdisiz` : ""}.`,
      higgsKapali: "Higgsfield yapılandırılmadı (HIGGSFIELD_CREDENTIALS yok) — üretim devre dışı.",
      hata: "İşlem başarısız. Tekrar dene.",
    },
    // Kayıt masası kiosk ekranı: canlı katılım + QR + kod bulma
    kiosk: {
      baslik: "Kayıt Masası",
      katildi: "katıldı",
      toplam: (n: number) => `${n} kayıtlı`,
      qrBaslik: "Uygulamayı aç",
      qrAciklama: "Telefon kamerası ile okut veya yaka kartındaki QR'ı kullan.",
      bulBaslik: "Kodunu kaybedeni bul",
      bulYer: "İsim yaz…",
      bulYok: "Eşleşme yok.",
      bulKod: "Kod",
    },
    // Felaket sigortası: tüm verinin tek dosyada yedeği
    yedek: {
      baslik: "Veri Yedeği",
      aciklama:
        "Tüm katılımcı, puan, görev ve rapor verisini tek JSON dosyası olarak indir. Bir şey ters giderse buradan geri yüklenir.",
      indir: "Yedeği İndir (JSON)",
      indiriliyor: "Hazırlanıyor…",
      hata: "Yedek alınamadı. Tekrar dene.",
    },
    // Akran ikilileri: 90 günlük yolculuk için sorumluluk ortakları
    ikili: {
      baslik: "Akran İkilileri",
      aciklama:
        "Katılımcıları 90 günlük yolculuk için ikişerli sorumluluk ortağına eşle. Yeniden çalıştırmak eski ikilileri sıfırlar.",
      mevcut: (n: number) => `Şu an ${n} ikili oluşturulmuş.`,
      olustur: "İkilileri Oluştur",
      olusturuluyor: "Eşleştiriliyor…",
      olusturuldu: (n: number) => `${n} ikili oluşturuldu ✓`,
      hata: "Eşleştirme başarısız. Tekrar dene.",
    },
    // Sahne kumandası: host'un telefonundan canlı kontrol (büyük butonlar)
    sahne: {
      baslik: "🎛 Sahne Kumandası",
      aciklama:
        "Sahnedeyken her şey burada. Büyük butonlar, tek dokunuş — telefondan yönet.",
      duyuruBaslik: "📣 Anlık Duyuru",
      duyuruAciklama:
        "Herkesin telefonuna anında push + büyük ekranda 3 dakika bant olarak çıkar.",
      duyuruYer: "Örn: Herkes salona, başlıyoruz!",
      duyuruGonder: "Herkese Gönder",
      duyuruGonderiliyor: "Gönderiliyor…",
      duyuruGitti: "Duyuru gönderildi ✓",
      onerilenler: "Hazır mesajlar",
      hazir1: "Herkes salona, başlıyoruz! 📣",
      hazir2: "10 dakika mola ☕",
      hazir3: "Telefonları cebe, gözler sahnede 📵",
      aynaBaslik: "🤖 AYNA",
      aynaAktif: "AYNA uyanık — görev/ses üretiyor",
      aynaPasif: "AYNA uykuda — sessiz",
      aynaDuraklat: "AYNA'yı Duraklat",
      aynaSurdur: "AYNA'yı Sürdür",
      dalgaBaslik: "🌊 Dalgalar",
      dalgaAc: "Aç",
      dalgaKapat: "Kapat",
      dalgaAcik: "açık",
      acilBaslik: "🛑 Acil Durdur",
      acilAciklama:
        "AYNA'yı duraklatır VE açık tüm dalgaları kapatır. Bir şeyler ters gittiğinde tek dokunuş.",
      acilDugme: "ACİL DURDUR",
      acilOnay: "Emin misin? Tekrar bas",
      acilOldu: "Durduruldu ✓",
      calisiyor: "Çalışıyor…",
      hata: "İşlem başarısız. Tekrar dene.",
    },
    // Güvenli prova kutusu: kampa girmeden tüm akışı dene (canlıyı etkilemez)
    test: {
      baslik: "🧪 Prova / Test Kutusu",
      aciklama:
        "Kampa girmeden her şeyi dene. Buradaki hiçbir işlem canlı kampı veya gerçek saati etkilemez — gerçek cron tik her zaman gerçek zamanı kullanır.",
      saatBaslik: "Saat Yolculuğu",
      saatAciklama:
        "Bir an seç ve AYNA'nın o anda ne yapacağını (görev, ses, fısıltı) gerçek zamanı değiştirmeden çalıştır.",
      saatEtiket: "Prova anı (İstanbul saati)",
      tikCalistir: "Bu anın tik'ini çalıştır",
      tikCalisiyor: "AYNA çalışıyor…",
      onerilenler: "Hızlı seçimler",
      demoBaslik: "Demo Katılımcı",
      demoAciklama:
        "Sahte bir kişi oluştur, kodunu başka bir telefonda/gizli sekmede gir ve tüm yolculuğu (giriş → öz-puan → ritüel → görev → rapor) prova et.",
      demoOlustur: "Demo katılımcı oluştur",
      demoKod: (kod: string) => `Yeni demo kodu: ${kod} — bu kodla giriş yap.`,
      demoListeBaslik: "Mevcut demo katılımcılar",
      demoYok: "Henüz demo katılımcı yok.",
      demoSil: "Tüm demo katılımcıları sil",
      kilitBaslik: "Pencereleri Sıfırla",
      kilitAciklama:
        "Senkron an, fısıltı, gece ve momentum pencereleri günde bir kez tetiklenir. Provada yeniden tetiklensinler diye bu kilitleri temizle.",
      kilitTemizle: "Zaman kilitlerini temizle",
      calisiyor: "Çalışıyor…",
      tamam: "Tamam ✓",
      hata: "İşlem başarısız. Tekrar dene.",
      sonucBaslik: "Sonuç",
    },
    dalga: {
      baslik: "Dalga Kontrolü",
      aciklama:
        "Aynı anda yalnızca bir dalga açık olur; birini açmak diğerlerini kapatır. Kamp planı: Dalga 1 → Gün 1 · 18:00 (serbest zaman) · Dalga 2 → Gün 2 · 09:00 (kahvaltı) · Dalga 3 → Gün 3 · 07:15 (kahvaltı & oda boşaltma).",
      acik: "Açık",
      kapali: "Kapalı",
      ac: "Aç",
      kapat: "Kapat",
      hata: "Dalga güncellenemedi. Lütfen tekrar dene.",
    },
    ilerleme: {
      baslik: "Canlı İlerleme",
      acikDalgaYok: "Açık dalga yok — ilerleme, bir dalga açıldığında görünür.",
      katilimci: "Katılımcı",
      ozTamam: "Öz değerlendirme",
      toplamPuan: "Toplam puan satırı",
      kisi: "Kişi",
      takim: "Takım",
      oz: "Öz",
      puanladigi: "Puanladığı",
      onuPuanlayan: "Onu puanlayan",
    },
    katilimcilar: {
      baslik: "Katılımcılar",
      toplam: (n: number) => `${n} katılımcı`,
      bosListe: "Henüz katılımcı yok. Aşağıdaki 'Kişi Ekle' ya da 'Dosyadan İçe Aktar' ile başla.",
      takimYok: "Henüz takım atanmamış. Önce 'Takımlara Dağıt' ile dağıt.",
      tablo: { ad: "Ad Soyad", takim: "Takım", sehir: "Şehir", telefon: "Telefon", kod: "Kod" },
      sayfaGeri: "← Geri",
      sayfaIleri: "İleri →",
      sayfaBilgi: (sayfa: number, toplam: number, bas: number, son: number, hepsi: number) =>
        `${bas}–${son} / ${hepsi} · Sayfa ${sayfa}/${toplam}`,
      importBaslik: "Dosyadan İçe Aktar (CSV / Excel)",
      importAciklama:
        "Sütunlar: ad (zorunlu), takim, sehir, telefon, eposta. İlk satır başlık olmalı. CSV veya Excel (.xlsx) yükleyebilirsin; her kişiye benzersiz 6 haneli giriş kodu otomatik üretilir.",
      dosyaSec: "Dosya seç (CSV / Excel)",
      iceAktar: "İçe Aktar",
      iceAktariliyor: "İçe aktarılıyor…",
      basarili: (n: number) => `${n} katılımcı eklendi.`,
      // Manuel tek kişi ekleme
      ekleBaslik: "Kişi Ekle",
      ekleAciklama: "Tek tek de ekleyebilirsin. Sadece ad-soyad zorunlu; kod otomatik üretilir.",
      alanAd: "Ad Soyad *",
      alanTakim: "Takım",
      alanSehir: "Şehir",
      alanTelefon: "Telefon",
      alanEposta: "E-posta",
      ekle: "Ekle",
      ekleniyor: "Ekleniyor…",
      ekleBasarili: (ad: string, kod: string) => `✓ ${ad} eklendi — giriş kodu: ${kod}`,
      excelOkunamadi: "Excel dosyası okunamadı. CSV olarak da deneyebilirsin.",
      // Toplu takım dağıtımı (otomatik, kişi/takım sayısına göre)
      takimDagitBaslik: "Takımlara Dağıt",
      takimDagitAciklama:
        "Takım başına kişi sayısını seç; gruplar otomatik 'Grup Bir, İki, Üç…' oluşur ve rastgele, dengeli dağılır. Adları sonra değiştirebilirsin. Kimse seçili değilse herkese uygulanır.",
      kisiBasiEtiket: "Takım başına kişi",
      otomatikDagit: "🎲 Otomatik Dağıt",
      dagitOnizleme: (kisi: number, takim: number) => `${kisi} kişi → ${takim} takım`,
      dagitiliyor: "Dağıtılıyor…",
      seciliereAtaYer: "Takım adı",
      seciliereAta: "Seçilenleri ata",
      takimTemizle: "Takımları temizle",
      tumunuSec: "Tümünü seç",
      seciliSayi: (n: number) => `${n} seçili`,
      dagitBasarili: (n: number) => `✓ ${n} kişi takımlara dağıtıldı.`,
      kimseYok: "Dağıtılacak kişi yok.",
      // Atama sonrası yeniden adlandırma
      adlandirBaslik: "Takımları Yeniden Adlandır",
      adlandirAciklama: "Atamadan sonra grup adlarını değiştir (örn. Grup Bir → Aslanlar).",
      yeniAd: "Yeni ad",
      kaydet: "Kaydet",
      takimKisi: (n: number) => `${n} kişi`,
      hataBosDosya: "Dosya boş veya okunamadı.",
      hataSatir: (satir: number, neden: string) => `Satır ${satir}: ${neden}`,
      hataAdEksik: "ad alanı boş",
      hataBaslik: "Başlık satırında 'ad' sütunu bulunamadı.",
      hataCokSatir: "Tek seferde en fazla 500 satır içe aktarılabilir.",
      hataSunucu: "İçe aktarma başarısız. Lütfen tekrar dene.",
      silBaslik: "Tehlikeli Bölge",
      silAciklama:
        "Tüm katılımcıları siler — puanları ve atamaları da birlikte gider (admin hesabı kalır). Gerçek liste import edilmeden önce test verisini temizlemek için kullan.",
      silOnayEtiket: (kelime: string) => `Onaylamak için "${kelime}" yaz`,
      silOnayKelime: "SİL",
      sil: "Tüm Katılımcıları Sil",
      siliniyor: "Siliniyor…",
      silBasarili: (n: number) => `${n} katılımcı silindi.`,
      // Satır düzenleme modalı
      duzenleBaslik: "Kişiyi Düzenle",
      duzenleKaydet: "Kaydet",
      duzenleKaydediliyor: "Kaydediliyor…",
      duzenleVazgec: "Vazgeç",
      duzenleKodYer: "Giriş kodu (6 rakam)",
      duzenleBasarili: (ad: string) => `✓ ${ad} güncellendi.`,
      duzenleHata: "Güncelleme başarısız. Lütfen tekrar dene.",
      duzenleKodHata: "Bu kod zaten kullanımda veya geçersiz (6 rakam olmalı).",
      duzenleSil: "🗑 Bu kişiyi sil",
      duzenleSilOnay: "Eminim, sil",
    },
    eslestirme: {
      baslik: "Eşleştirme",
      aciklama:
        "Her katılımcıya iki katman gözlem hedefi atar: kendi grubundan (yakın ayna — seni en çok görenler) ve dış gruplardan (uzak ayna — taze, objektif bakış). Tüm gözlemler gizlidir; herkesin eşit sayıda gözlemlenmesi hedeflenir.",
      grupIciEtiket: "Kişi başı grup-içi gözlem",
      grupDisiEtiket: "Kişi başı grup-dışı gözlem",
      uyari: "Çalıştırmak mevcut TÜM atamaları siler ve yeniden oluşturur.",
      onayEtiket: "Mevcut atamaların silineceğini anladım",
      calistir: "Eşleştirmeyi Çalıştır",
      calisiyor: "Eşleştiriliyor…",
      basarili: (n: number) => `${n} atama oluşturuldu.`,
      hataAzKisi: "Eşleştirme için en az 2 katılımcı gerekir.",
      hataSunucu: "Eşleştirme başarısız. Lütfen tekrar dene.",
      mevcutBaslik: "Mevcut Atamalar",
      atamaYok: "Henüz atama yok.",
      grupIci: "Grup-içi",
      grupDisi: "Grup-dışı",
    },
    grupOdev: {
      baslik: "Grup Ödevleri",
      aciklama:
        "AYNA, her grubun Ön Farkındalık profillerini toplayıp ortak açığa göre ödev üretir. Grup-içi: üyeler birlikte ortak açığı çalışır. Grup-birlikte: tamamlayıcı profiller (güçlü zayıfa koçluk) eşleşir.",
      uyeEtiket: (profilli: number, toplam: number) => `${profilli}/${toplam} üye profilini doldurdu`,
      zayifEtiket: "Baskın zayıf alan",
      acikEtiket: "Ortak en büyük açık",
      ritimEtiket: (duzenli: number, patlayan: number) => `Ritim: ${duzenli} düzenli · ${patlayan} patlayan`,
      yok: "—",
      grupIci: "🤝 Grup-içi ödev üret",
      grupBirlikte: "🔗 Grup-birlikte ödev üret",
      uretiliyor: "AYNA üretiyor…",
      mevcut: "Aktif ödev",
      mevcutYok: "Henüz ödev üretilmedi.",
      profilYok: "Bu grupta henüz Ön Farkındalık dolduran kimse yok — önce çalışma tamamlanmalı.",
      hata: "Geçersiz istek.",
      uretilemedi: "Ödev üretilemedi (profil yok ya da AI yanıt vermedi). Tekrar dene.",
      basarili: "✓ Grup ödevi üretildi.",
    },
    elmas: {
      baslik: "💎 Elmas Seçimi",
      aciklama:
        "Ön Farkındalık + Ekip Aynası verisinden, kampta üzerine yatırım yapılacak yüksek potansiyelli liderleri bulan seçim skoru. Ağırlık: gerçek iş %35, ekip algısı %25, büyüme hızı %20, uygulama %10, öz-değerlendirme %10. Sayımlar grup içi sıraya göre kalibre edilir; kişi kendini ekibinden belirgin yüksek görürse skor düşer.",
      gizliUyari: "Yalnızca yönetim içindir. Bu skor ve sıralama katılımcıya asla gösterilmez.",
      ozetPuanlanan: "Profili dolan",
      ozetAday: "Elmas adayı",
      ozetEsik: "Aday eşiği",
      veriYok: "Henüz Ön Farkındalık dolduran kimse yok — skor için önce çalışma tamamlanmalı.",
      tumTakimlar: "Tüm gruplar",
      yalnizAday: "Yalnız adaylar",
      kayitSayisi: (n: number) => `${n} kişi`,
      adayRozet: "Aday",
      veriYokRozet: "veri yok",
      korNoktaRozet: (fark: number) => `kör nokta +${fark.toFixed(1)}`,
      korNoktaIpucu: "Kişi kendini ekibinin gördüğünden bu kadar yüksek puanlıyor (öz − dış).",
      altK3: "Gerçek iş",
      altMini360: "Ekip algısı",
      altK5: "Büyüme",
      altK2: "Uygulama",
      altK1: "Öz değer.",
      disEtiket: (n: number) => `${n} dış puan`,
      tamlikEtiket: (yuzde: number) => `%${yuzde} veri`,
      hamEtiket: (ham: number) => `ham ${ham}`,
    },
    qr: {
      baslik: "QR Giriş Kartları",
      aciklama:
        "Yaka kartlarının arkasına basılacak kartlar. Yazdır penceresinden 'PDF olarak kaydet' seçebilirsin.",
      yazdir: "Yazdır / PDF Kaydet",
      kartAltyazi: "QR'ı okut veya kodu gir",
      katilimciYok: "Önce katılımcı ekle.",
    },
    moderasyon: {
      baslik: "Yorum Moderasyonu",
      aciklama:
        "6 altı puanlara yazılan zorunlu yorumlar burada listelenir. Uygunsuz yorumları gizleyebilirsin — gizlenen yorum raporda görünmez, puan görünmeye devam eder.",
      yorumYok: "Henüz yorum yok.",
      kimden: "Kimden",
      kime: "Kime",
      gizle: "Gizle",
      gizliEtiket: "Gizli",
      goster: "Göster",
      hata: "Güncellenemedi. Lütfen tekrar dene.",
    },
    aynaAni: {
      baslik: "✨ Ayna Anı",
      aciklama:
        "Gün 3 kapanışında tek düğme: raporlar herkesin telefonunda aynı anda açılır. Açmadan önce mektupları üretmen önerilir.",
      durumAcik: "Aynalar AÇIK — herkes raporunu görebilir",
      durumKapali: "Aynalar kapalı",
      ac: "Aynaları Aç",
      kapat: "Aynaları Kapat",
      hata: "Güncellenemedi. Lütfen tekrar dene.",
      mektupBaslik: "AI Ayna Mektupları",
      mektupDurum: (hazir: number, toplam: number) =>
        `${hazir}/${toplam} mektup hazır`,
      mektupUret: "Eksik Mektupları Üret",
      mektupUretiliyor: (ad: string) => `Yazılıyor: ${ad}…`,
      mektupTamam: "Tüm mektuplar hazır ✓",
      mektupHata: "Mektup üretimi durdu. Tekrar başlatabilirsin.",
      mektupAnahtarYok:
        "ANTHROPIC_API_KEY tanımlı değil — mektuplar üretilemez (Vercel ortam değişkenlerine ekle).",
    },
    yetkisiz: "Bu işlem için yönetici oturumu gerekir.",
    aynaDirektor: {
      modBaslik: "Sistem Modu",
      modAciklama:
        "Kamp bitince Yolculuğu başlat: AYNA 90 gün boyunca günde tek görevle, fazlara göre rehberlik eder.",
      yolculukBaslat: "🗺 Yolculuğu Başlat (90 gün)",
      kampaDon: "🏕 Kamp Moduna Dön",
      baslik: "🤖 AYNA Kontrol Odası",
      aciklama:
        "Kampı yöneten yapay zekâ. Aktifken 5 dakikada bir uyanır: görev dağıtır, yanıtları puanlar, programı açıklar, dürtmeler gönderir. Kampta gece 00:00–06:30 susar; sahnede konuşmacı varken de telefonları titretmez (sahne sessizliği).",
      durumAktif: "AYNA UYANIK — kampı yönetiyor",
      durumPasif: "AYNA uyuyor",
      uyandir: "AYNA'yı Uyandır",
      durdur: "AYNA'yı Durdur",
      tempoEtiket: "Görev temposu",
      tempolar: {
        surpriz: "Sürpriz (1-3 saat)",
        "2": "Sabit 2 saat",
        "3": "Sabit 3 saat",
      },
      aboneSayisi: (n: number, toplam: number) =>
        `${toplam} katılımcının ${n} tanesi bildirime abone`,
      tikCalistir: "Şimdi Tik Çalıştır (test)",
      tikSonuc: (ozet: string) => `Tik tamam: ${ozet}`,
      sozGonder: "🤝 Son Görevi Gönder: SÖZ",
      sozOnay:
        "Herkese 'kendine 90 günlük söz yaz' görevi gider (Gün 3 finali). Onaylıyor musun?",
      sozGonderildi: (n: number) => `SÖZ görevi ${n} kişiye gönderildi.`,
      akisBaslik: "Son Görevler",
      akisYok: "Henüz görev üretilmedi.",
      detayIpucu: "Detay için dokun",
      detayMesaj: "AYNA'nın gönderdiği mesaj",
      detayYanit: "Katılımcının yanıtı",
      detayYanitYok: "Henüz yanıt yok.",
      detayYorum: "AYNA puanlaması",
      detayZorluk: "Zorluk",
      detayOzellik: "Hedef özellik",
      detayKapat: "Kapat",
      sahneBaslik: "Sahne Anları",
      sahneAciklama:
        "Bas → projeksiyondaki /ekran sayfası AYNA'nın marka sesiyle salona konuşur (ekranda '🔊 Sesi Aç' açık olmalı).",
      acilisDugme: "🎬 Açılış Anonsu (Gün 1 · 21:00)",
      acilisOnay:
        "AYNA marka sesiyle kampı açar — perdedeki ekrandan anons çalınır. Sahne hazır mı?",
      acilisGonderildi: "Açılış anonsu sahneye gönderildi — ekran 4 dk içinde çalar.",
      aynaAniDugme: "🪞 Ayna Anı (Gün 2 · 23:20)",
      aynaAniOnay:
        "Günün sayıları (gözlem, görev, fiero) AYNA'nın sesiyle salona okunur. Onaylıyor musun?",
      aynaAniGonderildi: (gozlem: number, teslim: number) =>
        `Ayna Anı sahneye gönderildi: ${gozlem} gözlem, ${teslim} görev anons edildi.`,
      sesYok:
        "ELEVENLABS_API_KEY tanımlı değil ya da ses üretimi başarısız — anons çıkmadı.",
      hata: "İşlem başarısız. Tekrar dene.",
      kurulumUyari:
        "Zamanlayıcı kurulu değilse AYNA kendiliğinden uyanmaz — README'deki cron SQL'ini Supabase'de çalıştır ya da test için 'Şimdi Tik Çalıştır'ı kullan (test tiki sessiz saati yok sayar).",
    },
    program: {
      baslik: "Kamp Programı & AYNA Planı",
      aciklama:
        "Resmî kamp akışı ve AYNA'nın her saat ne yapacağı. Katılımcılar programı kendi panellerinde görür; AYNA planı yalnız burada.",
      aynaPlani: "🤖 AYNA",
      surprizBaslik: "Sürpriz Duyurular",
      surprizAciklama:
        "Programa ek sürpriz madde gir; AYNA başlamadan önce ayarladığın dakika kadar erken push + sahne anonsuyla duyurur. O ana dek katılımcılar yalnızca kilitli kart ve ipucu görür.",
      zaman: "Başlangıç",
      etkinlik: "Etkinlik adı",
      yer: "Yer (opsiyonel)",
      ipucu: "Gizem ipucu (opsiyonel — açıklanmadan önce görünür)",
      acilmaDk: "Kaç dk önce duyurulsun",
      ekle: "Programa Ekle",
      ekleniyor: "Ekleniyor…",
      sil: "Sil",
      bos: "Henüz program maddesi yok.",
      aciklandi: "duyuruldu",
      hata: "Kaydedilemedi. Tekrar dene.",
    },
    doksanGun: {
      baslik: "📬 90 Gün Sonra",
      aciklama:
        "Kamptan ~90 gün sonra: yukarıdan Dalga 4'ü aç, sonra davet e-postalarını gönder. Herkes kendi koduyla geri döner; rapor ve dalga yolculuğu yeni puanlarla kendiliğinden güncellenir.",
      epostali: (n: number, toplam: number) =>
        `${toplam} katılımcının ${n} tanesinde e-posta adresi kayıtlı`,
      epostaYok:
        "Hiçbir katılımcıda e-posta adresi yok — CSV'ye 'eposta' sütunu ekleyip yeniden içe aktarabilirsin.",
      gonder: "Davet E-postalarını Gönder",
      gonderiliyor: (g: number, t: number) => `Gönderiliyor… ${g}/${t}`,
      sonGonderim: (zaman: string) => `Son gönderim: ${zaman}`,
      tekrarOnay: "Davetler daha önce gönderildi — yeniden göndermeyi onaylıyorum",
      basarili: (n: number) => `${n} davet gönderildi.`,
      kismiHata: (n: number) =>
        `${n} e-posta gönderilemedi — adresleri kontrol et.`,
      hata: "Gönderim durdu. Tekrar deneyebilirsin.",
      anahtarYok:
        "POSTMARK_SERVER_TOKEN ve EMAIL_FROM tanımlı değil — Vercel ortam değişkenlerine ekle.",
    },
  },
  gorevler: {
    baslik: "AYNA'nın Görevleri",
    dinle: "🔊 Yansımandan dinle",
    dinleItiraz: "🗣 İtirazı dinle",
    oku: "AYNA'dan dinle",
    okumaDurdur: "Durdur",
    sesliIpucu: "🎤 Yazmak istemiyorsan dokun ve AYNA'ya anlat.",
    durdur: "■ Durdur",
    senkronTesekkur:
      "Tam zamanında. Şu anda onlarca kişi seninle aynı şeyi yaptı — kolektif enerji böyle kurulur. +8 ⚡",
    momentumSatiri: (skor: number) => `📈 Momentum: ${skor}/100`,
    altBaslik: "Kampı yöneten yapay zekâ, sana özel görevler veriyor.",
    aktifYokBaslik: "Şu an görevin yok",
    aktifYok: "AYNA seni izliyor — yeni bir görev her an gelebilir.",
    // #4 Günün özeti: gün sonu kapanış kartı
    bugunBaslik: "🌅 Bugünün Özeti",
    bugunOzet: (gorev: number, kivilcim: number, takdir: number) =>
      `🎯 ${gorev} görev tamamladın · +${kivilcim} ⚡${
        takdir > 0 ? ` · 💛 ${takdir} takdir aldın` : ""
      }`,
    sonTarih: (saat: string) => `Son: ${saat}`,
    suresiGecti: "Süresi geçti",
    yanitEtiket: "Yanıtın",
    yanitPlaceholder: "Ne yaptın, ne gözlemledin, ne hissettin? Birkaç cümle yeter.",
    kanitEkle: "Fotoğrafla kanıtla",
    kanitYukleniyor: "Duvara taşınıyor…",
    kanitGonderildi: "✓ Kanıtın duvara taşındı (onaylanınca görünecek).",
    kanitIpucu: "İstersen bu anı bir fotoğrafla mühürle — duvarda ve büyük ekranda görünür.",
    kanitAltYazi: "Görev kanıtı",
    gonder: "AYNA'ya Gönder",
    gonderiliyor: "AYNA okuyor…",
    puanin: (puan: number) => `AYNA puanın: ${puan}/10`,
    kivilcimKazandin: (n: number) => `+${n} Kıvılcım ⚡`,
    hata: "Gönderilemedi. Lütfen tekrar dene.",
    // Çevrimdışı dayanıklılık: yanıt cihazda saklanır, internet gelince gider
    cevrimdisiBekliyor:
      "⏳ Bağlantı bekleniyor — yanıtın bu cihazda güvende. İnternet gelince otomatik gönderilecek.",
    cevrimdisiTekrar: "Şimdi tekrar dene",
    gecmisBaslik: "Görev Geçmişin",
    gecmisYok: "Henüz tamamlanmış görevin yok.",
    durumlar: {
      pending: "Bekliyor",
      submitted: "AYNA okuyor",
      scored: "Puanlandı",
      expired: "Kaçtı",
    },
    turler: {
      gozlem: "👁 Gözlem",
      cesaret: "🔥 Cesaret",
      yansima: "🪞 Yansıma",
      gizli: "🤫 Gizli Görev",
      tahmin: "🎲 Tahmin",
      simulasyon: "🎭 Simülasyon",
      senkron: "⏱ Senkron An",
      soz: "🤝 Söz",
    },
    sozTesekkur:
      "Sözünü sakladım. 90 gün sonra sana hatırlatacağım. — AYNA",
  },
  kivilcim: {
    ad: "Kıvılcım",
    toplam: (n: number) => `${n} ⚡`,
    unvanin: "Unvanın",
    sonrakiUnvan: (unvan: string, kalan: number) =>
      `${unvan} unvanına ${kalan} Kıvılcım kaldı`,
    zirve: "Zirvedesin — Efsane! 🏆",
  },
  program: {
    baslik: "Kamp Programı",
    altBaslik: "Üç günün tamamı burada. AYNA'nın sürprizleri ise programda yazmaz.",
    gunBaslik: (gun: number, tarihYazi: string) => `GÜN ${gun} — ${tarihYazi}`,
    suAn: "ŞU AN",
    kilitli: "???",
    acilma: (saat: string) => `${saat}'te açıklanacak`,
    bos: "Program henüz yüklenmedi.",
    gecmis: "tamamlandı",
  },
  bildirim: {
    kurBaslik: "📲 AYNA'yı telefonuna kur",
    kurAciklamaIos:
      "Safari'de paylaş düğmesine bas → \"Ana Ekrana Ekle\". Sonra uygulamayı ana ekrandan açıp bildirimlere izin ver — görevlerin cebine düşsün.",
    izinBaslik: "🔔 AYNA seni dürtebilsin mi?",
    izinAciklama:
      "AYNA görevlerini, program anlarını ve sana özel fısıltıları bildirimle ulaştırır — kampta bir an bile kaçırma. Gece seni rahatsız etmez (AYNA da uyur) ve istediğin an tek dokunuşla kapatabilirsin.",
    izinVer: "Bildirimlere İzin Ver",
    izinVerildi: "🔔 AYNA seninle — bildirimler açık.",
    izinReddedildi:
      "Bildirimler şu an kapalı. Yanlışlıkla kapattıysan tekrar açabilirsin — görevlerin ve fısıltıların cebine düşsün.",
    izinTekrarBaslik: "🔕 Bildirimler kapalı",
    izinAcmaAdimlar: [
      "Adres çubuğundaki kilit 🔒 (veya site ayarları) simgesine dokun.",
      "“Bildirimler”i bul ve “İzin ver” yap.",
      "Sonra aşağıdaki “Tekrar dene” düğmesine bas.",
    ] as const,
    izinTekrarDene: "Tekrar dene",
    izinHalaKapali:
      "Bildirimler hâlâ kapalı görünüyor. Tarayıcı ayarından izni açıp tekrar dene.",
    desteklenmiyor: "Bu tarayıcı bildirimleri desteklemiyor — görevlerin uygulamada görünecek.",
    hata: "Abonelik kurulamadı. Tekrar dene.",
  },
  ses: {
    baslat: "Sesle Yaz",
    dinliyor: "Dinliyorum… durdurmak için dokun",
  },
  eposta: {
    davetKonu: "Aynaya tekrar bakma zamanı ✨ — Liderlik Aynası",
    davetBaslik: "90 gün geçti. Ayna seni bekliyor.",
    davetParagraf: (ad: string) =>
      `Merhaba ${ad}, kamptan bu yana 90 gün geçti. Dalga 4 açıldı: arkadaşlarını bugünkü gözünle yeniden puanla, kendi aynanda neyin değiştiğini gör.`,
    davetButon: "Aynaya Tekrar Bak",
    davetKodNotu: (kod: string) =>
      `Buton çalışmazsa giriş kodunla girebilirsin: ${kod}`,
    davetMetin: (ad: string, link: string, kod: string) =>
      `Merhaba ${ad},\n\nKamptan bu yana 90 gün geçti. Dalga 4 açıldı: arkadaşlarını bugünkü gözünle yeniden puanla, kendi aynanda neyin değiştiğini gör.\n\nGiriş: ${link}\nKodun: ${kod}\n\n— Liderlik Aynası`,
    davetSozBaslik: "Bana bir söz vermiştin. Hatırlıyor musun?",
    davetSozMetin: (soz: string) =>
      `Kampın son gecesi kendine şunu yazmıştın:\n\n"${soz}"\n\nTuttun mu? — AYNA`,
  },
  ayna: {
    epikKatki: (n: number) =>
      `🌌 Kampın gökyüzüne ${n} yıldız kattın — her gözlemin bir başkasının aynasını parlattı.`,
    baslik: "Ayna Raporun",
    bekleBaslik: "Aynan henüz örtülü 🔮",
    bekleAciklama:
      "Gün 3 kapanışında herkesin aynası aynı anda açılacak. Bu sayfayı açık tut — an geldiğinde kendiliğinden aydınlanacak.",
    acilis: (ad: string) => `${ad}, işte aynan`,
    acilisAlt: "Kampta seni gözlemleyen arkadaşlarının gözünden sen.",
    // Hatıra: raporu PDF olarak sakla (tarayıcı yazdır → PDF'e kaydet)
    raporKaydet: "🖨 Raporu Kaydet (PDF)",
    // 3B veri portresi: döndürülebilir kristal
    kristalBaslik: "💎 Liderlik Kristalin",
    kristalAciklama: "10 özelliğin bir kristale dönüştü. Parmağınla çevir.",
    gucluBaslik: "✨ En Güçlü Yanların",
    gelisimBaslik: "🌱 Gelişim Alanların",
    gizliGucBaslik: "💎 Gizli Gücün",
    gizliGucAciklama: (ozellik: string) =>
      `Başkaları seni ${ozellik} konusunda senin kendine verdiğinden belirgin şekilde yüksek görüyor. Kendine bu konuda haksızlık ediyor olabilirsin.`,
    korNoktaBaslik: "🔍 Kör Noktan",
    korNoktaAciklama: (ozellik: string) =>
      `${ozellik} konusunda kendine, başkalarının sana verdiğinden belirgin şekilde yüksek puan vermişsin. Buraya bir daha bakmaya değer.`,
    daralmaBaslik: "📉 Açığın Kapanıyor",
    daralmaAciklama: (ozellik: string, oz: string) =>
      `${ozellik} alanında kendini ${oz} gördün. Üç dalga boyunca, başkalarının gözüyle arandaki açık şöyle değişti:`,
    daralmaAcik: (fark: string) => `açık ${fark}`,
    daralmaKapandi: "Açık kapandı — algın gerçekle hizalanıyor. İşte aynanın işi bu.",
    daralmaDevam: "Açık hâlâ açık. Kapatmak senin elinde — yolculuk burada bitmiyor.",
    tabloBaslik: "Özellik Özellik Aynan",
    ozEtiket: "Senin puanın",
    disEtiket: "Başkalarının ortalaması",
    aynaEtiket: "AYNA'nın gözü",
    aynaBaslik: "🤖 AYNA'nın Üç Günü",
    aynaOzeti: (gorev: number, kivilcim: number, unvan: string) =>
      `Üç gün boyunca ${gorev} görevini izledim, ${kivilcim} Kıvılcım topladın. Unvanın: ${unvan}. Görevlerinde gördüklerim yukarıdaki yeşil çubuklarda — insanların gözüyle örtüşen yerlere dikkat et.`,
    kisiSayisi: (n: number) => `${n} kişi puanladı`,
    veriYok: "Henüz yeterli dış puan yok.",
    hikayeBaslik: "📖 Dalga Yolculuğun",
    hikayeAciklama: "Üç gün boyunca algı nasıl değişti?",
    hikayeGelisen: (ozellik: string, fark: string) =>
      `En çok yükselen özelliğin: ${ozellik} (+${fark} puan). Kamp seni değiştirdi — ve insanlar bunu fark etti.`,
    hikayeDalgaOzet: (ort: string) => `Genel ortalama: ${ort}`,
    // #3 Story katmanı
    hikayeIzle: "Hikâye olarak izle",
    hikayeUstAcilis: "AYNA RAPORU",
    hikayeAcilis: (ad: string) => `${ad}, aynan hazır`,
    hikayeAcilisMetin: (n: number) =>
      `Üç gün seni izledik; sen de ${n} kez başkalarını gözledin. İşte gerçek yansıman.`,
    hikayeGucluMetin: "Başkalarının gözünde en parlak yanın bu.",
    hikayeGizliMetin:
      "Kendine az verdin ama başkaları çok gördü — sandığından güçlüsün.",
    hikayeYolculukBaslik: "Nereden nereye",
    hikayeTakdirBaslik: (n: number) => `${n} kişi sana güzel şeyler yazdı`,
    hikayeKapanis: "İşte sen.",
    hikayeKapanisMetin: "Bu yansıma senin. Aşağıda her detayı seni bekliyor.",
    // #4 Ayna Filmi (kutlama/yolculuk)
    filmBaslik: "🎬 Ayna Filmin",
    filmAciklama: "Yolculuğunun kısa filmi — izle, ekran kaydı al, paylaş.",
    filmIzle: "Ayna Filmini izle",
    filmUst: "AYNA FİLMİ",
    filmAcilis: (ad: string) => `${ad}'in yolculuğu`,
    filmAcilisMetin: "Üç gün. Bir dönüşüm. İşte filmi.",
    filmGorevUst: "GÖREVLER",
    filmGorev: (n: number) => `${n} görev tamamladın`,
    filmGorevMetin: "AYNA ile birlikte, adım adım.",
    filmKivilcimUst: "KIVILCIM",
    filmKivilcim: (n: number) => `${n} ⚡`,
    filmKivilcimMetin: (unvan: string) => `Unvanın: ${unvan}`,
    filmTakdirUst: "TAKDİR",
    filmTakdir: (n: number) => `${n} kişi seni takdir etti`,
    filmTakdirMetin: "İnsanlar seni gördü ve sevdi.",
    filmKimlikUst: "KİMLİĞİN",
    filmKimlikMetin: "Senin liderlik arketibin bu.",
    filmKapanis: "Yolculuğun devam ediyor.",
    filmKapanisMetin: "Bu film senin. Ekran kaydı al, paylaş, hatırla.",
    yorumlarBaslik: "💬 Sana Yazılanlar",
    yorumlarAciklama: "Düşük puanların yanına bırakılan isimsiz gözlemler.",
    yorumYok: "Sana yazılmış yorum yok — puanların konuşuyor.",
    tahminBaslik: "🎯 Tahminin vs Gerçek",
    tahminYok: "Tahmin oyununa katılmadın — belki 90 gün sonra!",
    tahminEnYuksek: "En yüksek",
    tahminEnDusuk: "En düşük",
    tahminSenin: "Tahminin",
    tahminGercek: "Gerçek",
    tahminTuttu: "Bildin! Kendini tanıyorsun. 👏",
    tahminTutmadi: "Ayna seni şaşırttı — en güzel kısmı da bu.",
  },
  kelimeKarti: {
    baslik: "🖼️ Kelime Kartın",
    aciklama: "En güçlü özelliğin, paylaşmaya hazır bir kart oldu.",
    altYazi: "kampta arkadaşlarının gözünden",
    indir: "Kartı İndir",
    paylas: "Paylaş",
  },
  // Liderlik arketibi: 10 özelliğin profilinden çıkan kimlik + paylaşılabilir kart
  arketip: {
    raporBaslik: "🧭 Liderlik Arketibin",
    raporAciklama: "Kampta seni gözleyenlerin gözünde sen en çok şusun:",
    superGucEtiket: "Süper gücün",
    buyurkenEtiket: "Büyürken",
    kartBaslik: "🪪 Arketip Kartın",
    kartAciklama: "Seni en iyi anlatan kart — sosyalde paylaşmaya hazır.",
    kartUstYazi: "Liderlik Arketibi",
    indir: "Kartı İndir",
    paylas: "Paylaş",
  },
  yansiman: {
    baslik: "Aynan seni gördü",
    izle: "▶ Suya bak",
    anaSayfa: "🌊 Yansımanı izle",
  },
  sahne: {
    ipucu: "Ayna Anı'nı başlatmak için tıkla",
  },
  soz: {
    baslik: "📜 Sözün",
    aciklama: "Kampın son gecesi aynaya verdiğin söz — kendi sesinden.",
    dinle: "🎧 Sözünü dinle",
  },
  mektup: {
    dinle: "🎧 Mektubunu aynandan dinle",
    izle: "🌊 Mektup Filmi'ni izle — yansıman okuyor",
    baslik: "🤖 Ayna Mektubun",
    aciklama: "Puanlarından ve sana yazılanlardan, yalnızca senin için yazıldı.",
    hazirlaniyor: "Mektubun kaleme alınıyor…",
    hata: "Mektup şu anda hazırlanamadı. Daha sonra tekrar dene.",
    olustur: "Mektubumu Yaz",
  },
  ekran: {
    baslik: "Kampın Nabzı",
    altBaslik: "Liderlik Aynası · canlı",
    dalgaYok: "Şu anda açık dalga yok",
    veriYok: "Puanlar gelmeye başlayınca burası canlanacak…",
    nabiz: {
      katilimci: "katılımcı",
      puan: "puan verildi",
      oz: "öz aynasını tamamladı",
      degerlendirme: "tam değerlendirme yapıldı",
    },
    agBaslik: "🕸️ Takım Kimyası",
    agAciklama:
      "Her nokta bir katılımcı, her çizgi bir gözlem bağı. Altın çizgiler takımlar arası köprüler.",
    agCapraz: (oran: number) => `Gözlem bağlarının %${oran}'i takımlar arası`,
    ozellikBaslik: "Kampın Kasları",
    ozellikAciklama: "Birbirinize verdiğiniz puanların kamp geneli ortalaması",
    ligBaslik: "⚡ Kıvılcım Ligi",
    ligAciklama: "AYNA'nın görevlerinde en çok Kıvılcım toplayanlar",
    ligTakimlar: "Takım Yarışı",
    ligBos: "İlk Kıvılcımlar yakında — AYNA görev dağıtmaya başladığında burası alevlenecek.",
    duvarBaslik: "📸 Anı Duvarı",
    duvarBos: "Anılar yakında — katılımcılar fotoğraf paylaştıkça burası dolacak.",
    yildizSatiri: (n: number) => `Bu salon ${n} yıldız yaktı`,
    sesiAc: "🔊 Sesi Aç",
    sesAcikEtiket: "🔊 Ses açık",
    fiero: (ad: string) => `${ad} AYNAYI PARLATTI`,
    senkronBaslik: "SENKRON AN",
  },
  // A2 — Mühür Açılışı: kamp sonunda onboarding'de mühürlenen söz açılır
  muhur: {
    kapaliUst: "MÜHÜRLÜ SÖZ",
    kapaliBaslik: "Bu yolculuğun başında, buraya bir söz bıraktın",
    kapaliMetin:
      "Daha en başta, kendi sesinle geleceğine bir söz mühürledin. Onu birlikte açmanın vakti geldi.",
    ac: "🔒 Mührü aç",
    sesUst: "EN BAŞTAN — KENDİ SESİN",
    sesBaslik: "İşte o an",
    sesMetin:
      "Bu, bu yolculuğa çıkarken kendine verdiğin sözdü. Dinle — ve ne kadar yol aldığını hisset.",
    sozDinle: "▶ Sözünü dinle",
    sozDurdur: "■ Durdur",
    yaziUst: "MÜHÜRLEDİĞİN SÖZ",
    devam: "Devam",
    adUst: "DÖNÜŞÜMÜN",
    adGeldin: (a: string) => `Kampa “${a}” olarak geldin.`,
    adDonuyorsun: (a: string) => `“${a}” olarak dönüyorsun.`,
    adAyni: (a: string) =>
      `Kampa “${a}” olarak geldin — ve daha derin, daha sağlam bir “${a}” olarak dönüyorsun.`,
    adAciklama:
      "Bu, başkalarının gözünde bıraktığın izdir. Sen baştan beri buydun — kamp onu görünür kıldı.",
    bak: "Aynama bak →",
  },
  rituel: {
    baslik: "Aynaya kendini tanıt",
    aciklama: "Aynan seninle kendi sesinle konuşacak.",
    onayBaslik: "İzin veriyor musun?",
    onay: "Sesin ve fotoğrafın sadece SANA özel deneyim için kullanılır. Kamp bitince hepsi silinir.",
    onayla: "Onaylıyorum, başla",
    basla: "Ritüeli başlat",
    fotoBaslik: "Aynaya yüzünü göster",
    fotoAciklama:
      "Bir fotoğraf çek — aynan onu suya yansıyan hayalet bir silüete çevirecek. Yüzün tanınmaz; sadece izin kalır.",
    fotoCek: "📷 Fotoğraf çek",
    fotoYeniden: "↺ Tekrar çek",
    fotoDevam: "Beğendim, devam et",
    fotoAtla: "Fotoğrafsız devam et",
    sessiz: "Sessiz ayna istiyorum",
    yeminYonerge: "Aşağıdaki yemini doğal bir sesle, acele etmeden oku:",
    yemin:
      "Ben, bu üç gün boyunca kendime dürüst olmaya söz veriyorum. Gördüğümü açıkça söyleyeceğim, duyduğumu adil tartacağım. Arkadaşlarımı yargılamak için değil, anlamak için izleyeceğim. Zor anlarda kolay olanı değil, doğru olanı seçeceğim. Suya baktığımda yalnızca yüzümü değil, yönümü de göreceğim. Bugün burada başlayan yolculuk, kamptan sonra da benimle gelecek. Hazırım: aynanın karşısına çıkıyorum ve yansımamdan saklanmıyorum.",
    soru: "Son bir mühür: geleceğine söz bırak",
    soruAlt:
      "Bu kamptan kim olarak döneceksin? Söyleyeceğin sözü bu aynaya mühürleyeceğiz — kampın son anında, bugünü birlikte açacağız.",
    soruNot: "Sesli söyle — yazıya dökülür",
    devam: "Devam",
    bitir: "Sözümü mühürle",
    inceleBaslik: "Kaydını dinle",
    inceleAciklama: "Sesini beğendin mi? Beğenmediysen tekrar kaydedebilirsin.",
    inceleDinle: "▶ Kaydımı dinle",
    inceleDurdur: "■ Durdur",
    inceleGonder: "Beğendim, aynaya ver",
    inceleTekrar: "↺ Tekrar kaydet",
    uyaniyor: "Aynan uyanıyor…",
    dinle: "▶ Yansımanı dinle",
    seninle: "Yansıman artık seninle. Su her durulduğunda burada.",
    sonra: "Kaydın aynada saklandı. Yansıman kamp başlarken uyanacak.",
    // A1 Mühür: beklenti sözü "geleceğe mühürlü mesaj" olarak kapanışta onaylanır
    muhurUst: "🔒 SÖZÜN MÜHÜRLENDİ",
    muhurMetin:
      "Bugün kendine verdiğin sözü bu aynaya kilitledik. Kampın son anında, onu birlikte açacağız — ve ne kadar yol aldığını göreceksin.",
    hata: "Bir şey ters gitti. Tekrar dene.",
    tekrar: "Tekrar dene",
    // Çevrimdışı dayanıklılık: kaydı kaybetme, bağlantı gelince otomatik gönder
    baglantiBekliyorBaslik: "🔌 Bağlantı bekleniyor",
    baglantiBekliyorMetin:
      "Kaydın bu cihazda güvende — kaybolmadı. İnternet gelince otomatik gönderilecek.",
    baglantiTekrar: "Şimdi tekrar dene",
    mikrofonYok: "Mikrofona erişilemedi. Tarayıcı izinlerini kontrol et.",
    kapat: "Kapat",
  },
  ortak: {
    oturumGerekli: "Oturum gerekli.",
    // Akran ikilisi (sorumluluk ortağı) sayfası
    baslik: "🤝 Ortağın",
    altBaslik:
      "90 günlük yolculukta yalnız değilsin. Sorumluluk ortağınla birbirinizi ayakta tutun.",
    eslesmeYokBaslik: "Henüz ortağın atanmadı",
    eslesmeYokMetin: "Yönetici ikilileri oluşturduğunda ortağın burada belirir.",
    ortaginEtiket: "Ortağın",
    sen: "Sen",
    mesajYer: "Ortağına bir şey yaz…",
    gonder: "Gönder",
    gonderiliyor: "Gönderiliyor…",
    bosSohbet: "Henüz mesaj yok. İlk adımı sen at — bir merhaba bile yeter.",
    geriDon: "← Ana sayfaya dön",
    hata: "Gönderilemedi. Tekrar dene.",
  },
  // #8 PROVA MODU: admin açarsa tüm sayfalarda kırmızı şerit + admin toggle
  provaModu: {
    baslikAcik: "⚠️ PROVA MODU AÇIK",
    baslikKapali: "Prova Modu",
    aciklamaAcik: "Tüm sayfalarda kırmızı şerit görünüyor. Gerçek kamp öncesi kapat.",
    aciklamaKapali: "Açarsan herkes 'test ortamı' uyarısını görür.",
    ac: "Prova Modunu Aç",
    kapat: "Prova Modunu Kapat",
    acildi: "⚠️ PROVA MODU açıldı — tüm sayfalarda kırmızı şerit görünür",
    kapatildi: "Prova modu kapatıldı ✓",
    hata: "Güncellenemedi. Tekrar dene.",
  },
  // #4 Sonraki dalga geri sayımı: bekleme ekranında "14 saat sonra açılıyor"
  geriSayim: {
    baslik: "Sıradaki dalga",
    gun: (n: number) => `${n} gün`,
    saat: (n: number) => `${n} saat`,
    dakika: (n: number) => `${n} dakika`,
    sonra: "sonra açılıyor",
    bugun: (saat: string) => `bugün saat ${saat}'de açılıyor`,
    gecti: "açılması planlanıyor",
    adminEtiket: "Açılış zamanı ayarla",
    adminKaydet: "Zamanı Kaydet",
    adminTemizle: "Zamanlamayı Kaldır",
    adminKaydedildi: "Zamanlama kaydedildi ✓",
    adminHata: "Kaydedilemedi. Tekrar dene.",
  },
  // #6 Toplu seçim & eylem: ilerleme tablosunda çoklu seçim + tek tık dürt
  topluEylem: {
    tumunuSec: "Tümünü Seç",
    hicbiriniSec: "Seçimi Kaldır",
    secilenDurt: (n: number) => `${n} Kişiyi Dürt 🔔`,
    durtSonuc: (n: number) => `${n} kişiye hatırlatma gönderildi ✓`,
    hata: "İşlem başarısız. Tekrar dene.",
  },
  // #7 Otomatik zamanlama: admin belirlediği saatte dalga/rapor açılsın
  zamanlama: {
    baslik: "Otomatik Zamanlama",
    aciklama: "Bir eylem için saat belirle — sistem tam o anda gerçekleştirir.",
    ekle: "Zamanlama Ekle",
    ekleniyor: "Kaydediliyor…",
    eklendi: "Zamanlama eklendi ✓",
    iptal: "İptal Et",
    iptalOnay: "Bu zamanlama iptal edilsin mi?",
    iptalEdildi: "Zamanlama iptal edildi",
    planlanmis: "Planlanmış",
    ateslenecek: (zaman: string) => `${zaman}'de çalışacak`,
    ateslendi: "Gerçekleşti ✓",
    iptalEdilmis: "İptal edildi",
    eventTipler: {
      wave_open: (ad: string) => `${ad} Aç`,
      wave_close: (ad: string) => `${ad} Kapat`,
      report_open: "Raporları Aç",
      report_close: "Raporları Kapat",
      prova_off: "Prova Modunu Kapat",
    },
    hata: "Kaydedilemedi. Tekrar dene.",
    bosYok: "Planlanmış eylem yok.",
    manuelTetikle: "Şimdi Tetikle",
    manuelTetikleniyor: "Tetikleniyor…",
    manuelTetiklendi: "Zamanlanmış eylemler tetiklendi ✓",
    manuelBilgi: "Cron günde bir çalışır — bekleyen eylemleri hemen tetiklemek için bu butonu kullan.",
  },
  // #10 İşlem günlüğü: kritik admin eylemleri zaman damgasıyla
  islemGunlugu: {
    baslik: "İşlem Günlüğü",
    aciklama: "Son kritik admin eylemleri. Kim, ne zaman, ne yaptı.",
    bos: "Henüz kayıtlı işlem yok.",
    eylemler: {
      dalga_acildi: "Dalga açıldı",
      dalga_kapatildi: "Dalga kapatıldı",
      rapor_acildi: "Raporlar açıldı",
      rapor_kapatildi: "Raporlar kapatıldı",
      prova_acildi: "Prova modu açıldı",
      prova_kapatildi: "Prova modu kapatıldı",
      zamanlama_eklendi: "Zamanlama eklendi",
      zamanlama_iptal: "Zamanlama iptal edildi",
      toplu_durt: "Toplu dürtme gönderildi",
      pusula_acildi: "Pusula penceresi açıldı",
      pusula_kapatildi: "Pusula penceresi kapatıldı",
      kamp_kilit_kodu_ayarlandi: "Kamp kilit kodu ayarlandı",
      bosluk_acildi: "Boşluk Anı açıldı",
      bosluk_kapatildi: "Boşluk Anı kapatıldı",
      odev_gonderildi: "Ödev gönderildi",
    } as Record<string, string>,
  },
} as const;

// LİDERLİK VİNYETLERİ — "wow" dedirten görevlerin çekirdeği.
// Her vinyet KISA (2-3 cümle), bir lider KASINA etiketli, gerçek tarihî olay ya
// da zamansız arketip. AYNA bunu görevin AÇILIŞ HİKÂYESİ olarak alır, kişinin
// kimliğine (pusula/kör nokta/hedef) bağlar ve gerçekten zorlayan bir hamleye
// dönüştürür. Doğruluk burada garanti edilir — model taze tarih UYDURMAZ, yalnız
// buradaki vinyeti kişiselleştirir. Yeni vinyet eklemek = bu listeye satır eklemek.
//
// Gerçek figürlerde yalnız yaygın kabul gören, tartışmasız anlar kullanıldı;
// belirsiz/efsane olanlar arketip olarak ya da "anlatılır ki" çerçevesiyle yazıldı.

export type LiderKas =
  | "devretme" // bırakmak, güvenmek, kontrolü salmak
  | "cesaret" // ilk adımı atmak, risk almak
  | "zor_konusma" // gerçeği söylemek, yüzleşmek
  | "yardim_iste" // kırılganlık, mütevazılık, zaafı göstermek
  | "vizyon" // büyük resmi, henüz görülmeyen yarını göstermek
  | "ornek_olma" // istemeden önce kendin yaşamak
  | "dinleme" // önce gerçekten duymak
  | "dayaniklilik" // kırılmadan sebat etmek
  | "sorumluluk" // suçu dışarı atmamak, sahiplenmek
  | "baglanti"; // insanı görmek, "görülmüş" hissettirmek

export type Vinyet = { kod: string; kas: LiderKas; baslik: string; metin: string };

export const VINYETLER: Vinyet[] = [
  // ── DEVRETME ──────────────────────────────────────────────────────────────
  {
    kod: "eisenhower_dday",
    kas: "devretme",
    baslik: "Eisenhower'ın Boş Masası",
    metin:
      "6 Haziran 1944, Normandiya'nın arifesinde Eisenhower çıkarma emrini verdi ve karargâhı terk etti. Yapabileceği başka bir şey kalmamıştı; ordusunun ona ihtiyaç duymadan işlemesini izleyecekti.",
  },
  {
    kod: "washington_kilic",
    kas: "devretme",
    baslik: "Bırakılan Kılıç",
    metin:
      "Savaşı kazanan Washington'a neredeyse kral olması teklif edildi; reddetti, kılıcını teslim edip çiftliğine döndü. Asıl gücün, gücü bırakabilmekte olduğunu biliyordu.",
  },
  {
    kod: "usta_cirak",
    kas: "devretme",
    baslik: "Yarım Kalan Masa",
    metin:
      "Yaşlı usta, hayatının en güzel masasını yarıda bıraktı ve aletleri çırağına uzattı. 'Gerisini sen bitir,' dedi; eli müdahale etmek için kaşınıyordu ama geri çekildi.",
  },
  {
    kod: "bahcivan_fidan",
    kas: "devretme",
    baslik: "Toprağa Bırakılan El",
    metin:
      "Bahçıvan en sevdiği fidanı diktikten sonra elini topraktan çekti. Onu her gün yoklamamak, büyümesini uzaktan izlemek, dikmekten daha zordu.",
  },

  // ── CESARET ───────────────────────────────────────────────────────────────
  {
    kod: "rosa_parks",
    kas: "cesaret",
    baslik: "Kalkmayan Kadın",
    metin:
      "1 Aralık 1955, Rosa Parks otobüste yerinden kalkmadı. Tek yaptığı oturmaktı; ama o sessiz duruş koca bir hareketi ayağa kaldırdı.",
  },
  {
    kod: "ilk_buz",
    kas: "cesaret",
    baslik: "Buza İlk Adım",
    metin:
      "Donmuş gölü ilk geçecek olan, kimsenin denemediği yerde ilk adımı atandır. Arkadakiler ancak onun ağırlığını buzun taşıdığını görünce yürümeye başlar.",
  },
  {
    kod: "meydan_atli",
    kas: "cesaret",
    baslik: "Öne Çıkan Tek Atlı",
    metin:
      "Bütün ordunun donup kaldığı yerde tek bir atlı öne çıktı. Saldırı emri yoktu; sadece birinin ilk hamleyi yapması, gerisinin de yürümesi gerekiyordu.",
  },

  // ── ZOR KONUŞMA ───────────────────────────────────────────────────────────
  {
    kod: "lincoln_rakipler",
    kas: "zor_konusma",
    baslik: "Rakiplerin Masası",
    metin:
      "Lincoln, kabinesine en sert rakiplerini aldı ve katılmadığı her şeyi yüzlerine söyledi. Susmak kolaydı; doğruyu söyleyip yine de birlikte yürümek liderlikti.",
  },
  {
    kod: "ataturk_sathi",
    kas: "zor_konusma",
    baslik: "Duyulmak İstenmeyen Emir",
    metin:
      "Atatürk, Sakarya'da 'Hattı müdafaa yoktur, sathı müdafaa vardır' derken kimsenin duymak istemediği gerçeği söyledi: bir çizgi değil, tüm vatan savunulurdu.",
  },
  {
    kod: "kaptan_firtina",
    kas: "zor_konusma",
    baslik: "Saklanmayan Fırtına",
    metin:
      "Kaptan, ufukta fırtına belirince tayfayı topladı ve gizlemedi: 'Tehlikedeyiz — ama bunu birlikte aşacağız.' Yalan söylemek o gece daha rahat ettirirdi; söylemedi.",
  },

  // ── YARDIM İSTE / KIRILGANLIK ─────────────────────────────────────────────
  {
    kod: "kralin_taci",
    kas: "yardim_iste",
    baslik: "Çıkarılan Taç",
    metin:
      "Kral, kuşatma gecesi tacını çıkardı ve askerlerinin arasına oturdu. 'Ben de korkuyorum,' dedi; tam o an ordusu onun önünde değil, yanında dizildi.",
  },
  {
    kod: "yarali_komutan",
    kas: "yardim_iste",
    baslik: "'Bana Yardım Edin'",
    metin:
      "Komutan yaralandığında saklamaya çalışmadı; sadece 'Bana yardım edin' dedi. Zaafını gösterdiği an ekibi onu sırtladı ve birbirine daha sıkı bağlandı.",
  },
  {
    kod: "gandhi_seker",
    kas: "yardim_iste",
    baslik: "Önce Kendi Zaafı",
    metin:
      "Anlatılır ki Gandhi, şekeri fazla seven bir çocuğa nasihat etmeden önce haftalarca bekledi — önce kendisi bıraktı. İstemeden önce kendi zaafıyla yüzleşti.",
  },

  // ── VİZYON ────────────────────────────────────────────────────────────────
  {
    kod: "mlk_hayal",
    kas: "vizyon",
    baslik: "Bir Hayalim Var",
    metin:
      "1963, Washington. Martin Luther King hazırladığı metni bir kenara bıraktı ve 'Bir hayalim var' dedi. İnsanlara o günü değil, henüz görmedikleri yarını gösterdi.",
  },
  {
    kod: "kennedy_ay",
    kas: "vizyon",
    baslik: "Henüz Yokken Verilen Söz",
    metin:
      "Kennedy, teknolojisi daha yokken 'Bu on yıl bitmeden aya gideceğiz' dedi. Hedefi kolay olduğu için değil, insanları büyüttüğü için seçti.",
  },
  {
    kod: "uc_tas_ustasi",
    kas: "vizyon",
    baslik: "Üç Taş Ustası",
    metin:
      "Üç taş ustasına ne yaptıkları sorulur. İkisi 'taş kesiyorum' der; üçüncüsü 'bir katedral inşa ediyorum' der. Aynı iştir; tek fark, gördükleri resimdir.",
  },

  // ── ÖRNEK OLMA ────────────────────────────────────────────────────────────
  {
    kod: "gandhi_degisim",
    kas: "ornek_olma",
    baslik: "Önce Sen Ol",
    metin:
      "Gandhi'ye atfedilen söz: 'Dünyada görmek istediğin değişim, önce sen ol.' Kimseden, kendisi yapmadığı hiçbir şeyi istemedi.",
  },
  {
    kod: "onden_giren",
    kas: "ornek_olma",
    baslik: "Soğuk Suya İlk Giren",
    metin:
      "Komutan, askerlerinden önce buz gibi nehre girdi. Emir vermedi; sadece ilk o ıslandı, arkasından bütün ordu geçti.",
  },
  {
    kod: "son_yiyen",
    kas: "ornek_olma",
    baslik: "En Son Yiyen",
    metin:
      "Gerçek liderlerin sofrada en son yediği söylenir — ekip doymadan kaşığa uzanmazlar. Otorite emirle değil, bu küçük sırayla kurulur.",
  },

  // ── DİNLEME ───────────────────────────────────────────────────────────────
  {
    kod: "konusma_cubugu",
    kas: "dinleme",
    baslik: "Konuşma Çubuğu",
    metin:
      "Bazı konseylerde yalnız elinde çubuğu tutan konuşurdu; gerisi yalnızca dinlerdi. Lider çoğu zaman en son ve en az konuşandı.",
  },
  {
    kod: "iki_kulak",
    kas: "dinleme",
    baslik: "İki Kulak, Bir Ağız",
    metin:
      "Yaşlı bilge öğrencisine, 'İki kulağın ama bir ağzın var; tam bu oranda kullan' dedi. Dinlemek, sıranı beklemek değil, gerçekten duymaktı.",
  },
  {
    kod: "sessiz_hekim",
    kas: "dinleme",
    baslik: "Önce Soran Hekim",
    metin:
      "Usta hekim reçeteye değil, hastanın anlattığına yaslanırdı. 'Çare çoğu zaman, kimsenin sonuna kadar dinlemediği cümlede saklıdır' derdi.",
  },

  // ── DAYANIKLILIK ──────────────────────────────────────────────────────────
  {
    kod: "mandela",
    kas: "dayaniklilik",
    baslik: "27 Yıl, Sonra Uzlaşma",
    metin:
      "Mandela 27 yılını hapiste geçirdi; çıktığında intikamı değil uzlaşmayı seçti. Asıl güç, kırılmadan beklemek ve öfkeyi tutmaktı.",
  },
  {
    kod: "shackleton",
    kas: "dayaniklilik",
    baslik: "634 Gün, Sıfır Kayıp",
    metin:
      "1914'te gemisi buzda parçalanan Shackleton ekibine tek söz verdi: 'Hepinizi sağ getireceğim.' 634 gün süren çileden sonra 28 kişinin hepsi sağ döndü.",
  },
  {
    kod: "nehir_tas",
    kas: "dayaniklilik",
    baslik: "Suyun Taşı Delmesi",
    metin:
      "Nehir kayayı kuvvetiyle değil sebatıyla deler. Aynı yere her gün düşen damla, en sert taşta eninde sonunda yol açar.",
  },

  // ── SORUMLULUK ────────────────────────────────────────────────────────────
  {
    kod: "truman_masa",
    kas: "sorumluluk",
    baslik: "Fatura Burada Biter",
    metin:
      "Truman'ın masasında küçük bir levha dururdu: 'Sorumluluk burada biter.' Hata kimin olursa olsun, faturayı kesen kişi oydu.",
  },
  {
    kod: "kaptan_karaya",
    kas: "sorumluluk",
    baslik: "Rotayı Ben Verdim",
    metin:
      "Gemi karaya oturduğunda kaptan, dümeni tutan çırağı suçlamadı. 'Rotayı ben verdim,' dedi ve hesabı önce kendinden sordu.",
  },
  {
    kod: "bahce_capa",
    kas: "sorumluluk",
    baslik: "Düşen Meyvenin Sahibi",
    metin:
      "Usta bahçıvan, çürük meyveyi işçiye yıkmadı: 'Budamayı zamanında yapmayan bendim.' Sorumluluğu yukarı taşımak, ekibi rahatlatır.",
  },

  // ── BAĞLANTI ──────────────────────────────────────────────────────────────
  {
    kod: "nightingale_lamba",
    kas: "baglanti",
    baslik: "Lambalı Kadın",
    metin:
      "Florence Nightingale geceleri koğuşları lambasıyla tek tek dolaşırdı. Yaralılar onu 'lambalı kadın' diye andı; iyileştiren çoğu zaman 'görülmüş' hissetmekti.",
  },
  {
    kod: "isim_bilen",
    kas: "baglanti",
    baslik: "Adını Bilen Komutan",
    metin:
      "Eski bir komutanın, binlerce askerinin çoğunun adını bildiği anlatılır. Savaşı kazandıran strateji kadar, herkesin 'beni tanıyor' hissiydi.",
  },
  {
    kod: "iskender_su",
    kas: "baglanti",
    baslik: "Kuma Dökülen Su",
    metin:
      "Anlatılır ki çölde tek bardak su İskender'e uzatıldığında, askerleri içemezken o da içmedi; suyu kuma döktü. Susuzluğu paylaşmak, emirden güçlüydü.",
  },

  // ══ TÜRK & DÜNYA KÖKLERİ — tarihî ve çağdaş ═══════════════════════════════
  // Kültürel kök: katılımcı kendi tarihinden / sevdiği çağdaş bir isimden bir an
  // görünce bağ daha güçlü kurulur. Yalnız yaygın kabul gören, doğru anlar/sözler.

  // — devretme —
  {
    kod: "mevlana_mum",
    kas: "devretme",
    baslik: "Bir Mumun Diğerini Yakması",
    metin:
      "Mevlânâ'dan kalan söz: 'Bir mum, başka bir mumu yakmakla ışığından hiçbir şey kaybetmez.' Bildiğini paylaşmak, öğretmek insanı küçültmez — çoğaltır.",
  },
  {
    kod: "yesevi_ocak",
    kas: "devretme",
    baslik: "Bir Ocak Kuran Pîr",
    metin:
      "Pîr-i Türkistan Hoca Ahmet Yesevî, kendi adına değil, yetiştirip Anadolu'ya gönderdiği yüzlerce dervişe iz bıraktı. Ardında lider değil, lider yetiştirenler kaldı; bir kişi değil, bir ocak kurdu.",
  },
  {
    kod: "sancar_turkevi",
    kas: "devretme",
    baslik: "Işığı Sonrakilere Taşımak",
    metin:
      "Mardin'in köyünden çıkıp DNA onarımını çözen Aziz Sancar, 2015'te Nobel aldı. Ünden çok geleceği düşündü: kazancıyla Türk öğrencilere bir yuva, Carolina Türk Evi'ni kurdu.",
  },

  // — cesaret —
  {
    kod: "fatih_gemiler",
    kas: "cesaret",
    baslik: "Karadan Yürüyen Gemiler",
    metin:
      "1453'te Haliç'in girişi zincirle kapalıyken Fatih, gemilerini bir gecede karadan, yağlı kızaklarla tepelerin üzerinden yürüttü. Herkesin 'imkânsız' dediği yerde kimsenin bakmadığı yola baktı.",
  },
  {
    kod: "curie_baraka",
    kas: "cesaret",
    baslik: "Barakadaki Işık",
    metin:
      "Marie Curie, soğuk ve bozuk bir barakada yıllarca uğraşıp radyumu ayrıştırdı; iki ayrı bilimde Nobel alan ilk insan oldu. 'Hayatta korkulacak bir şey yoktur, yalnızca anlaşılması gereken şeyler vardır' dedi.",
  },
  {
    kod: "naim_herkul",
    kas: "cesaret",
    baslik: "Cep Herkülü",
    metin:
      "Baskı altındaki kimliğini bırakmamak için Bulgaristan'dan kaçıp Türkiye'ye gelen Naim Süleymanoğlu, 1988 Seul'de kendi ağırlığının üç katını kaldırdı. Küçük bedeninde dev bir cesaret taşıdı.",
  },

  // — sorumluluk —
  {
    kod: "kanuni_adalet",
    kas: "sorumluluk",
    baslik: "Kanunu Kendine de Uygulayan",
    metin:
      "Cihana hükmeden Kanuni, kanunu yalnız halka değil kendi sarayına da uyguladı; 'Kanuni' adını buradan aldı. En güçlü olduğu anda bile hesabı önce kendinden sorması, otoritesini büyüttü.",
  },
  {
    kod: "jordan_sut",
    kas: "sorumluluk",
    baslik: "Topu Bana Verin",
    metin:
      "Michael Jordan: '9000'den fazla şut kaçırdım; 26 kez maçı bitirecek şut bana emanet edildi ve kaçırdım. İşte bu yüzden başarıyorum.' Kaçırma korkusuyla değil, sorumluluğu isteyerek büyüdü.",
  },

  // — yardım iste —
  {
    kod: "gazali_bilmiyorum",
    kas: "yardim_iste",
    baslik: "'Bilmiyorum' Diyen Âlim",
    metin:
      "İmam Gazali, Bağdat'ın en saygın kürsüsünde herkesin başvurduğu âlimken bir şüphe kriziyle 'aslında bilmiyorum' dedi. Makamını bırakıp yıllarca aradı; bilmediğini itiraf etmek, bildiğini sanmaktan büyük cesaretti.",
  },

  // — dinleme —
  {
    kod: "yunus_kendini",
    kas: "dinleme",
    baslik: "İlim Kendin Bilmektir",
    metin:
      "Yunus Emre 'İlim ilim bilmektir, ilim kendin bilmektir; sen kendini bilmezsen bu nice okumaktır' dedi. En zor dinlenecek ses, insanın kendi içidir.",
  },
  {
    kod: "einstein_soru",
    kas: "dinleme",
    baslik: "55 Dakika Soruya",
    metin:
      "Einstein'a atfedilen söz: 'Bir problemi çözmek için bir saatim olsa, 55 dakikasını problemi anlamaya ayırırdım.' Acele çözüm değil, doğru anlaşılmış soru kazandırır.",
  },

  // — dayanıklılık —
  {
    kod: "sinan_ustalik",
    kas: "dayaniklilik",
    baslik: "Ustalık Eserim Selimiye",
    metin:
      "Mimar Sinan, 'Şehzade çıraklık, Süleymaniye kalfalık, Selimiye ise ustalık eserimdir' dedi — ve ustalık eserini seksenli yaşlarında verdi. Her yapı bir öncekinin üstüne kondu; ustalık, sabrın uzun yoluydu.",
  },
  {
    kod: "pamuk_masa",
    kas: "dayaniklilik",
    baslik: "Bir Memur Gibi Yazmak",
    metin:
      "Nobel'li yazar Orhan Pamuk, ilhamı beklemeden her gün masasına oturmasıyla bilinir; 'bir memur gibi' yazdığını söyler. Büyük eser esinle değil, tekrar eden disiplinle kuruldu.",
  },
  {
    kod: "ronaldo_calisma",
    kas: "dayaniklilik",
    baslik: "İlk Gelen, Son Çıkan",
    metin:
      "Cristiano Ronaldo, antrenmana ilk gelen ve en son çıkan oyuncu olmasıyla bilinir; 'Çok çalışmadan yetenek hiçbir şeydir' der. Zirvede kalmayı yetenek değil, yıllarca süren tekrar sağladı.",
  },

  // — vizyon —
  {
    kod: "ataturk_emanet",
    kas: "vizyon",
    baslik: "Kendinden Sonra Yaşayan Eser",
    metin:
      "Atatürk 'Benim naçiz vücudum elbet bir gün toprak olacaktır; fakat Türkiye Cumhuriyeti ilelebet payidar kalacaktır' dedi. Kurduğu şeyi kendisi olmadan da yaşayacak biçimde tasarladı — asıl miras, kendinden sonra ayakta kalandır.",
  },
  {
    kod: "ortayli_kok",
    kas: "vizyon",
    baslik: "Önce Geriyi Okumak",
    metin:
      "Tarihçi İlber Ortaylı, geçmişini bilmeyenin geleceğini kuramayacağını söyler; ona göre kökünü tanımayan nereye gideceğini de bilemez. İleriyi görmek, önce geriyi okumakla başlar.",
  },
  {
    kod: "curry_ucsayi",
    kas: "vizyon",
    baslik: "Kimsenin Görmediği Atış",
    metin:
      "Yedinci sıradan seçilen, 'fazla zayıf' diye küçümsenen Stephen Curry, herkesin önemsemediği üç sayılık atışı oyunun merkezine koydu ve basketbolu değiştirdi. Kimsenin görmediği değeri görmek, vizyondu.",
  },

  // — örnek olma —
  {
    kod: "messi_sahada",
    kas: "ornek_olma",
    baslik: "Sözle Değil, Oyunla",
    metin:
      "Çocukken büyüme sorunu yüzünden 'fazla ufak' diye elenen Messi, yıllarca konuşmadan yalnız oyunuyla liderlik etti. Sözle değil, sahadaki işiyle takımı peşinden sürükledi.",
  },

  // ══ KENDİ ALANININ ÖNCÜLERİ — iş, sanat, bilim, spor ══════════════════════
  // Farklı alanlardan lider/öncü figürler: katılımcı kendi dünyasından bir yüz
  // bulsun. Yalnız yaygın kabul gören, doğru anlar/sözler.

  // — vizyon —
  {
    kod: "jobs_hayir",
    kas: "vizyon",
    baslik: "Bin Fikre 'Hayır'",
    metin:
      "1997'de batma eşiğindeki Apple'a dönen Steve Jobs, onlarca ürünü birkaç modele indirdi; 'İnovasyon, bin iyi fikre hayır diyebilmektir' dedi. Odak, neyi yapacağın kadar neyi yapmayacağını bilmekti.",
  },

  // — bağlantı —
  {
    kod: "sabanci_insan",
    kas: "baglanti",
    baslik: "Adını Hatırlayan Patron",
    metin:
      "Türkiye'nin en zengin işadamlarından Sakıp Sabancı, kapısını herkese açık tutar, karşısındakinin adını ve hâlini hatırlamasıyla bilinirdi. 'İşin sırrı insandadır' der; servetiyle değil sıcaklığıyla anılırdı.",
  },
  {
    kod: "manco_kopru",
    kas: "baglanti",
    baslik: "7'den 77'ye",
    metin:
      "Barış Manço dünyayı gezip Türk kültürünü sevdirdi ve müziğiyle '7'den 77'ye' herkese dokundu. Çocukların gözünde bir abi, büyüklerin gözünde bir elçiydi; farkları değil ortak yanı buldu.",
  },

  // — sorumluluk —
  {
    kod: "koc_defter",
    kas: "sorumluluk",
    baslik: "Ülkem Varsa Ben de Varım",
    metin:
      "Bir imparatorluk kuran Vehbi Koç, yıllarca kendi hesap defterini bizzat tuttu, disiplinden ödün vermedi. 'Ülkem varsa ben de varım' diyerek kazancının sorumluluğunu ülkesine kurumlar olarak geri ödedi.",
  },

  // — dayanıklılık —
  {
    kod: "veysel_yol",
    kas: "dayaniklilik",
    baslik: "Uzun İnce Bir Yol",
    metin:
      "Yedi yaşında gözlerini kaybeden Aşık Veysel, karanlığı bir türküye çevirdi: 'Uzun ince bir yoldayım.' Görmeden, sazıyla ve kalbiyle bütün bir ülkeye yol gösterdi.",
  },
  {
    kod: "beethoven_dokuz",
    kas: "dayaniklilik",
    baslik: "Sağırlığın İçinden Senfoni",
    metin:
      "Beethoven, işitme yetisini yavaş yavaş kaybederken en güçlü eseri 9. Senfoni'yi besteledi; duyamadığı 'Sevinç Korosu'nu sağırlığın içinden çıkardı. Susmayı değil, susturulmamayı seçti.",
  },

  // — cesaret —
  {
    kod: "arf_merak",
    kas: "cesaret",
    baslik: "Bilinmeyenin Önünde Durmamak",
    metin:
      "On liralık banknota adı basılan Cahit Arf, kimsenin girmediği soyut sorulara merakla daldı ve kendi adıyla anılan teoremi buldu. Ona göre asıl cesaret, bilinmeyenin önünde durmamaktı.",
  },

  // — zor konuşma —
  {
    kod: "ferguson_kulup",
    kas: "zor_konusma",
    baslik: "Kimse Kulüpten Büyük Değil",
    metin:
      "26 yıl Manchester United'ı yöneten Sir Alex Ferguson'ın tek kuralı vardı: 'Hiçbir oyuncu kulüpten büyük değildir.' En parlak yıldızıyla bile gerekince yüzleşti; takımı, rahatından önce tuttu.",
  },

  // — örnek olma —
  {
    kod: "teresa_kucuk",
    kas: "ornek_olma",
    baslik: "Küçük İşler, Büyük Sevgi",
    metin:
      "Rahibe Teresa, Kalküta'nın sokaklarında kimsenin dokunmadığı hastalara eğildi; 'Büyük işler yapamayız, yalnız küçük işleri büyük sevgiyle yapabiliriz' dedi. Vaaz vermedi, önce kendi elini uzattı.",
  },

  // — dinleme —
  {
    kod: "buffett_oku",
    kas: "dinleme",
    baslik: "Günün Çoğu Okumakla",
    metin:
      "Dünyanın en zengin insanlarından Warren Buffett, gününün çoğunu okuyarak ve anlamadığı işten uzak durarak geçirir. Aynı mütevazı evde yaşar; acele kararı değil, sabırla dinlemeyi servet yaptı.",
  },
];

// Bir kasa ait vinyetler arasında dönerek seçer (tohum = tamamlanan görev sayısı
// gibi artan bir değer → aynı kişide aynı vinyet üst üste gelmez).
export function vinyetSec(kas: LiderKas, tohum: number): Vinyet | null {
  const havuz = VINYETLER.filter((v) => v.kas === kas);
  if (havuz.length === 0) return null;
  const i = ((tohum % havuz.length) + havuz.length) % havuz.length;
  return havuz[i];
}

// Liderlik özelliği (trait_id 1-10) → en yakın lider kası. Görev hedef özelliğe
// göre vinyet seçer; böylece hikâye, çalıştırılan kasla aynı yöne bakar.
export const TRAIT_KAS: Record<number, LiderKas> = {
  1: "ornek_olma", // Örnek Olmak
  2: "dayaniklilik", // Çalışkanlık
  3: "zor_konusma", // Dürüstlük
  4: "vizyon", // Vizyonerlik
  5: "yardim_iste", // Mütevazılık
  6: "baglanti", // Takım Ruhu
  7: "dinleme", // İletişim Gücü
  8: "cesaret", // Cesaret
  9: "sorumluluk", // Sorumluluk Alma
  10: "baglanti", // Pozitif Enerji
};

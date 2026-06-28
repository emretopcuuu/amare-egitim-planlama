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

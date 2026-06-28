// KAMP PROGRAMI — SAPANCA LEADER PLUS PD101
// 17–19 Temmuz 2026 · Elite World Sapanca · 100 Kişi · 2 Gece 3 Gün
//
// Tek doğruluk kaynağı: katılımcı program sayfası, admin AYNA planı ve
// tik motorunun zaman pencereleri (sahne sessizliği, senkron, sabah)
// hep buradan okur. Bilinçli olarak 'server-only' DEĞİL ve DB'siz —
// simülasyon ve istemci bileşenleri de aynı kuralları kullanır.

export const KAMP_GUNLERI = ["2026-07-17", "2026-07-18", "2026-07-19"] as const;

export const KAMP_BASLIK = "SAPANCA LEADER PLUS PD101";
export const KAMP_ALT_BASLIK =
  "17–19 Temmuz 2026 · Elite World Sapanca · 150 Kişi · 2 Gece 3 Gün";

export type EtkinlikTuru =
  | "sahne" // perde/kürsü anı — telefonlar cepte, AYNA susar
  | "yemek"
  | "oyun"
  | "doga"
  | "serbest"
  | "ara"
  | "gezi"
  | "ayna"; // AYNA'nın kendi sahne anı

export type ProgramMaddesi = {
  gun: 1 | 2 | 3;
  /** "HH:MM" (Europe/Istanbul) */
  baslangic: string;
  bitis: string;
  baslik: string;
  konusmaci?: string;
  tur: EtkinlikTuru;
  /** Sahne sessizliği: bu blokta AYNA push göndermez, görev dağıtmaz */
  sessiz?: boolean;
  /** Yalnız admin panelinde görünür: AYNA bu blokta ne yapıyor */
  aynaNotu: string;
};

export const KAMP_PROGRAMI: ProgramMaddesi[] = [
  // ---- GÜN 1 — CUMA · 17 Temmuz ----
  {
    gun: 1, baslangic: "12:00", bitis: "13:00",
    baslik: "Otel Giriş & Odaya Yerleşme ve Ayna 🪞 Barkodunun Okutulması", tur: "serbest",
    aynaNotu:
      "Karşılama ritüeli: QR kartla giriş → ses ritüeli + fotoğraf ritüeli. İlk dakika wow anı burada — klon ve silüet hattı çalışmaya başlar.",
  },
  {
    gun: 1, baslangic: "13:00", bitis: "14:30",
    baslik: "Öğle Yemeği", tur: "yemek",
    aynaNotu: "Görev yok. Ritüeli bitirmeyenlere tek nazik hatırlatma.",
  },
  {
    gun: 1, baslangic: "14:30", bitis: "19:00",
    baslik: "Havuz, Güneş, Dinlenme, Tesisi Keşfetme ve Ayna 🪞 Görevlerinin Başlaması", tur: "serbest",
    aynaNotu:
      "İlk gözlem görevleri damla damla dağıtılır (hafif, eğlenceli). 'Aynan seni gördü' kişisel videoları bu pencerede düşmeye başlar. (Liderlik değerlendirmesi yok — o, Gün 3 sabahı tek seferde açılır.)",
  },
  {
    gun: 1, baslangic: "19:00", bitis: "21:00",
    baslik: "Akşam Yemeği (1 Soft İçecek Dahil)", tur: "yemek",
    aynaNotu:
      "20:15 SENKRON AN: bütün salonun telefonu aynı anda titrer — masaların konuşma konusu.",
  },
  // --- PD101 akşam oturumları: sahne sessizliği, AYNA susar ---
  {
    gun: 1, baslangic: "21:00", bitis: "21:05",
    baslik: "PD101 Açılış", konusmaci: "Mc Ziya Şakir Yılmaz", tur: "sahne", sessiz: true,
    aynaNotu: "Sahne sessizliği — AYNA konuşmacıyla yarışmaz. (İstenirse Direktör panelinden 'Açılış Anonsu' bu blokta tek seferlik çalınabilir.)",
  },
  {
    gun: 1, baslangic: "21:05", bitis: "21:35",
    baslik: "2026 Yeni Kariyerler", konusmaci: "Mc Ziya Şakir Yılmaz", tur: "sahne", sessiz: true,
    aynaNotu: "Sahne sessizliği.",
  },
  {
    gun: 1, baslangic: "21:35", bitis: "21:45",
    baslik: "PD101 Kamp Planı", konusmaci: "Emre Topçu", tur: "sahne", sessiz: true,
    aynaNotu: "Sahne sessizliği.",
  },
  {
    gun: 1, baslangic: "21:45", bitis: "22:05",
    baslik: "Amare EU & TR Genel Müdür", konusmaci: "Ersin Arısoy", tur: "sahne", sessiz: true,
    aynaNotu: "Sahne sessizliği.",
  },
  {
    gun: 1, baslangic: "22:05", bitis: "22:25",
    baslik: "Ara", tur: "ara",
    aynaNotu: "Projeksiyonda /ekran: yıldız sayacı + fiero anonsları.",
  },
  {
    gun: 1, baslangic: "22:25", bitis: "23:55",
    baslik: "Chairman & Chief Executive Officer — Q&A", konusmaci: "Mr. David Chung",
    tur: "sahne", sessiz: true,
    aynaNotu:
      "Sahne sessizliği — AYNA konuşmacıyla yarışmaz. Oturum bitince (~00:00) tek gece fısıltısı: 'Bugün seninleydim. Yarın oyunlarda da yanında olacağım.'",
  },

  // ---- GÜN 2 — CUMARTESİ · 18 Temmuz ----
  {
    gun: 2, baslangic: "07:00", bitis: "08:00",
    baslik: "Antreman · Yoga · Meditasyon", tur: "doga",
    aynaNotu:
      "06:45 sabah yoklaması (kendi sesinden günaydın). Güne açılış teması: 'Hiç konuşmadığın biriyle yan yana gel.'",
  },
  {
    gun: 2, baslangic: "08:00", bitis: "09:30",
    baslik: "Kahvaltı", tur: "yemek",
    aynaNotu: "Görev akışı 09:30 blokta başlar. (Değerlendirme yok — Gün 3 sabahı.)",
  },
  {
    gun: 2, baslangic: "09:30", bitis: "19:30",
    baslik:
      "Oyunlar & Öğle Yemeği & AYNA 🪞 Görevlendirmeleri & David'in Odasında Grup Görüşmeleri & Serbest Zaman",
    tur: "oyun",
    aynaNotu:
      "★ AYNA GÖREV ANA PENCERESİ. Gün boyu kişiye özel görevler akar: oyunlara, grup görüşmelerine ve serbest zamana bağlı gözlem/cesaret/gizli görevler. Tüm ekiplerin programı farklı — AYNA herkese ayrı ritimde verir. 13:30 SENKRON AN.",
  },
  {
    gun: 2, baslangic: "19:30", bitis: "21:00",
    baslik: "Akşam Yemeği (1 Soft İçecek Dahil)", tur: "yemek",
    aynaNotu: "Sakin — gün doluydu. 20:00 günlük fısıltı (kaç göz seni puanladı).",
  },
  {
    gun: 2, baslangic: "21:00", bitis: "23:00",
    baslik: "AYNA 🪞 Görevlendirmeleri & Serbest Zaman", konusmaci: "AYNA", tur: "ayna",
    aynaNotu:
      "★ AYNA AKŞAM GÖREV PENCERESİ. Telefonun rahatça elde olduğu blok: birikmiş yanıtlar, yansıma görevleri, kişiye özel akşam görevleri. İstenirse Direktör panelinden 'Ayna Anı' (günün özeti) salona okunur. Blok bitince gece fısıltısı.",
  },

  // ---- GÜN 3 — PAZAR · 19 Temmuz ----
  {
    gun: 3, baslangic: "07:00", bitis: "10:00",
    baslik: "Kahvaltı & Oda Boşaltma", tur: "yemek",
    aynaNotu:
      "07:00 sabah yoklaması. 07:15 KAMP DEĞERLENDİRMESİ açılır (kampın tek liderlik puanlaması); bavul telaşına karşı pencere geniş (kahvaltı + checkout). 09:30 SENKRON son çağrı — puanlama oturumlardan önce bitsin.",
  },
  {
    gun: 3, baslangic: "10:00", bitis: "10:15",
    baslik: "PD101 Açılış Toplantısı — 2. Oturum & Kapanış", konusmaci: "Mc. Aytuğ Gönül",
    tur: "sahne", sessiz: true,
    aynaNotu: "Sahne sessizliği.",
  },
  {
    gun: 3, baslangic: "10:15", bitis: "10:35",
    baslik: "PD101 PD Yolculuğu", konusmaci: "Kenan Kozanhan", tur: "sahne", sessiz: true,
    aynaNotu: "Sahne sessizliği.",
  },
  {
    gun: 3, baslangic: "10:35", bitis: "10:55",
    baslik: "PD101 PD Yolculuğu", konusmaci: "Ferhat Gök", tur: "sahne", sessiz: true,
    aynaNotu: "Sahne sessizliği.",
  },
  {
    gun: 3, baslangic: "10:55", bitis: "11:15",
    baslik: "PD101 PD Yolculuğu", konusmaci: "Ziya Şakir Yılmaz", tur: "sahne", sessiz: true,
    aynaNotu: "Sahne sessizliği.",
  },
  {
    gun: 3, baslangic: "11:15", bitis: "11:40",
    baslik: "Ara", tur: "ara",
    aynaNotu: "Kamp Değerlendirmesi son çağrı / puanlama kapanır. Zirve oturumuna geçişten önce son fırsat.",
  },
  {
    gun: 3, baslangic: "11:40", bitis: "13:10",
    baslik: "PD101 Yapay Zeka & AYNA 🪞 Kamp Analizi & PD2026", konusmaci: "Emre Topçu",
    tur: "ayna",
    aynaNotu:
      "★ KAMPIN ZİRVESİ. PC ve telefonlar elde. Raporlar CANLI açılır ('Ayna Anı' raporu aç), sesli mektup + 'suda beliren sen'. Ardından SÖZ ritüeli (Direktör panelinden SÖZ görevi) + Komutan paneli analiz verileri (ekip radarı, momentum top 10, istatistikler).",
  },
  {
    gun: 3, baslangic: "13:10", bitis: "15:10",
    baslik: "Sopeli Doğal Yaşam Köyü Gezisi (kendi araçlarla)", tur: "gezi",
    aynaNotu:
      "Kamp kapanışı. Gezi dönüşü AYNA yolculuk moduna alınır: 90 gün, günde 1 görev.",
  },
];

export const ETKINLIK_SIMGESI: Record<EtkinlikTuru, string> = {
  sahne: "🎤",
  yemek: "🍽",
  oyun: "🎲",
  doga: "🌲",
  serbest: "🌿",
  ara: "☕",
  gezi: "🚗",
  ayna: "👁",
};

// ---- Zaman yardımcıları (hepsi dakika-bazlı, saf) ----

export function dakikaCevir(saatYazi: string): number {
  const [s, d] = saatYazi.split(":").map(Number);
  return s * 60 + d;
}

/** "YYYY-MM-DD" (Istanbul) → kamp günü 1-3, kamp dışıysa null. */
export function kampGunu(tarih: string): 1 | 2 | 3 | null {
  const i = (KAMP_GUNLERI as readonly string[]).indexOf(tarih);
  return i === -1 ? null : ((i + 1) as 1 | 2 | 3);
}

export function gunProgrami(gun: 1 | 2 | 3): ProgramMaddesi[] {
  return KAMP_PROGRAMI.filter((m) => m.gun === gun);
}

/** O anki program maddesi (başlangıç dahil, bitiş hariç); boşluklarda null. */
export function suankiMadde(
  gun: 1 | 2 | 3,
  gunDakikasi: number
): ProgramMaddesi | null {
  return (
    gunProgrami(gun).find(
      (m) =>
        gunDakikasi >= dakikaCevir(m.baslangic) &&
        gunDakikasi < dakikaCevir(m.bitis)
    ) ?? null
  );
}

/** Sahne sessizliği: kürsüde biri varken AYNA telefonları titretmez. */
export function sahneSessizMi(gun: 1 | 2 | 3, gunDakikasi: number): boolean {
  return suankiMadde(gun, gunDakikasi)?.sessiz === true;
}

// GELİŞTİRME #7 — Ana kilitli tetikleme. Az önce BİTEN (deneyimsel) bir etkinlik
// varsa onu yakala: sahne/oyun/doğa/ayna/gezi anlarının duygusu hâlâ sıcakken
// göreve dönsün. Yemek/serbest/ara gibi nötr bloklar bu kapsama girmez.
const ANA_KILITLI_TURLER = new Set<EtkinlikTuru>(["sahne", "oyun", "doga", "ayna", "gezi"]);

/** Son `pencereDk` dakikada biten, deneyimsel bir program maddesi (yoksa null). */
export function bitenMadde(
  gun: 1 | 2 | 3,
  gunDakikasi: number,
  pencereDk = 12
): ProgramMaddesi | null {
  let enYakin: ProgramMaddesi | null = null;
  let enYakinFark = Infinity;
  for (const m of gunProgrami(gun)) {
    if (!ANA_KILITLI_TURLER.has(m.tur)) continue;
    const fark = gunDakikasi - dakikaCevir(m.bitis);
    if (fark >= 0 && fark <= pencereDk && fark < enYakinFark) {
      enYakin = m;
      enYakinFark = fark;
    }
  }
  return enYakin;
}

// ---- SENKRON AN: günün programına dikilmiş pencereler ----
// Gün 1: 20:15 (akşam yemeği) · Gün 2: 13:30 (görev bloğu içi öğle) ·
// Gün 3: 09:30 (kahvaltı & checkout — oturumlardan önce son çağrı)

export const SENKRON_SAATLERI: Record<1 | 2 | 3, [number, number]> = {
  1: [20, 15],
  2: [13, 30],
  3: [9, 30],
};

/** Kamp tarihindeyse o günün senkron penceresi (10 dk); değilse null.
 * Anahtar gün-bazlıdır — pencere saat sınırını aşsa bile bir kez ateşlenir. */
export function kampSenkronAnahtari(
  tarih: string,
  saat: number,
  dakika: number
): string | null {
  const gun = kampGunu(tarih);
  if (!gun) return null;
  const [ss, dd] = SENKRON_SAATLERI[gun];
  const dk = saat * 60 + dakika;
  const hedef = ss * 60 + dd;
  return dk >= hedef && dk < hedef + 10 ? `senkron_${tarih}_g${gun}` : null;
}

// ---- SABAH YOKLAMASI pencereleri (kendi sesinden günaydın) ----
// Gün 2: antreman/yoga 07:00'de → 06:40-07:59. Gün 3: kahvaltı 07:00-10:00,
// sabah selamı erken pencerede (07:00-09:00) düşsün.

export function sabahPenceresiMi(
  gun: 1 | 2 | 3,
  saat: number,
  dakika: number
): boolean {
  const dk = saat * 60 + dakika;
  if (gun === 2) return dk >= 6 * 60 + 40 && dk < 8 * 60;
  if (gun === 3) return dk >= 7 * 60 && dk < 9 * 60;
  return false;
}

// ---- GECE FISILTISI: sahne kapanınca (23:40) tek cümle, sonra sessizlik ----

export const GECE_FISILTILARI: Record<number, string> = {
  1: "Bugün seninleydim. Yarın oyunlarda da yanında olacağım. İyi uykular.",
  2: "Bugün suya çok şey yansıdı. Yarın aynaya bakacaksın. İyi uykular.",
};

/** Gece fısıltısının KENDİ SESİNDEN hâli (Konuşan Yansıma kartı).
 * AYNA'nın push metninden ayrıdır: yansıma birinci tekil konuşur. */
export function geceYansimaMetni(gun: number, ilkAd: string): string | null {
  if (gun === 1) {
    return `${ilkAd}. Benim — yansıman. Bugün ilk kez suya baktın; ben hep buradaydım. Yarın oyunlarda yanındayım. İyi uykular.`;
  }
  if (gun === 2) {
    return `${ilkAd}. Bugün suya çok şey yansıdı; hepsini gördüm. Yarın aynaya bakacaksın. Korkma — hazırsın. İyi uykular.`;
  }
  return null;
}

// ---- AYNA'NIN SAHNE METİNLERİ (marka sesiyle salona okunur) ----

/** Gün 1 · 21:00 — kampı AYNA açar (programdaki 5 dk'lık açılış slotu). */
export const ACILIS_ANONSU =
  "İyi akşamlar. Ben AYNA. Bugün otelin kapısından girdiğiniz andan beri yanınızdayım. " +
  "Üç gün boyunca yanınızda olacağım: oyunlarda, sofrada, suyun kıyısında. " +
  "Telefonunuz zaman zaman titreyecek — o titreşim benim. " +
  "Üçüncü gün, hepiniz aynaya bakacaksınız. O güne kadar... gözüm üzerinizde. " +
  "Sapanca Leader Plus, resmen başlamıştır.";

/** Gün 2 · 23:20 — Ayna Anı: günün sayıları metne dönüşür. */
export function aynaAniMetni(g: {
  gozlemSayisi: number;
  teslimSayisi: number;
  fieroAdlari: string[];
}): string {
  const fiero =
    g.fieroAdlari.length > 0
      ? ` ${g.fieroAdlari.join(", ")} bugün aynayı parlattı — on üzerinden on.`
      : "";
  return (
    `Bir saniye durun. Bugün suya ${g.gozlemSayisi} gözlem yansıdı; ` +
    `${g.teslimSayisi} görev tamamlandı.${fiero} ` +
    "Hepsini gördüm, hepsini sakladım. Yarın sabah... aynaya bakacaksınız. İyi geceler."
  );
}

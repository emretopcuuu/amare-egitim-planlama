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
  "17–19 Temmuz 2026 · Elite World Sapanca · 100 Kişi · 2 Gece 3 Gün";

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
  // ---- GÜN 1 — CUMA ----
  {
    gun: 1, baslangic: "12:00", bitis: "13:00",
    baslik: "Otel Giriş & Karşılama", tur: "serbest",
    aynaNotu:
      "Karşılama ritüeli: QR kartla giriş → ses ritüeli + fotoğraf ritüeli. İlk dakika wow anı burada — klon ve silüet hattı çalışmaya başlar.",
  },
  {
    gun: 1, baslangic: "13:00", bitis: "14:30",
    baslik: "Öğle Yemeği", tur: "yemek",
    aynaNotu: "Görev yok. Ritüeli bitirmeyenlere tek nazik hatırlatma.",
  },
  {
    gun: 1, baslangic: "14:30", bitis: "18:00",
    baslik: "Havuz, Güneş & Dinlenme — Tesisi Keşfedin", tur: "serbest",
    aynaNotu:
      "İlk gözlem görevleri damla damla dağıtılır (hafif, eğlenceli). 'Aynan seni gördü' kişisel videoları bu pencerede düşmeye başlar.",
  },
  {
    gun: 1, baslangic: "18:00", bitis: "19:00",
    baslik: "Serbest Zaman", tur: "serbest",
    aynaNotu:
      "DALGA 1 — İlk İzlenim açılır (sinematik + push). Akşam yemeğinden önce puanlama biter.",
  },
  {
    gun: 1, baslangic: "19:00", bitis: "21:00",
    baslik: "Akşam Yemeği (1 Soft İçecek Dahil)", tur: "yemek",
    aynaNotu:
      "20:15 SENKRON AN: bütün salonun telefonu aynı anda titrer — masaların konuşma konusu.",
  },
  {
    gun: 1, baslangic: "21:00", bitis: "21:05",
    baslik: "PD101 Açılış — AYNA Konuşuyor", konusmaci: "AYNA", tur: "ayna", sessiz: true,
    aynaNotu:
      "Işıklar kararır, göl perdeye düşer; AYNA marka sesiyle kampı açar (Direktör panelindeki 'Açılış Anonsu' düğmesi).",
  },
  {
    gun: 1, baslangic: "21:05", bitis: "21:45",
    baslik: "Chairman & Chief Executive Officer", konusmaci: "Mr. David Chung",
    tur: "sahne", sessiz: true,
    aynaNotu: "Sahne sessizliği — AYNA konuşmacıyla yarışmaz.",
  },
  {
    gun: 1, baslangic: "21:45", bitis: "22:05",
    baslik: "Amare EU & General Manager", konusmaci: "Ersin Ansoy",
    tur: "sahne", sessiz: true,
    aynaNotu: "Sahne sessizliği.",
  },
  {
    gun: 1, baslangic: "22:05", bitis: "22:35",
    baslik: "Ara", tur: "ara",
    aynaNotu: "Projeksiyonda /ekran: yıldız sayacı + fiero anonsları.",
  },
  {
    gun: 1, baslangic: "22:35", bitis: "23:35",
    baslik: "Presidential Diamond Paneli", konusmaci: "Emre Topçu",
    tur: "sahne", sessiz: true,
    aynaNotu:
      "Sahne sessizliği. Panel bitince (23:40) tek gece fısıltısı: 'Bugün seni izledim. Yarın oyunlarda gözüm üzerinde.'",
  },

  // ---- GÜN 2 — CUMARTESİ ----
  {
    gun: 2, baslangic: "07:00", bitis: "08:00",
    baslik: "3 km Trekking — Tesis Etrafı Doğa Yürüyüşü", tur: "doga",
    aynaNotu:
      "06:45 sabah yoklaması (kendi sesinden günaydın). Trekking temalı cesaret görevi: 'Hiç konuşmadığın biriyle yan yana gel.'",
  },
  {
    gun: 2, baslangic: "08:00", bitis: "10:00",
    baslik: "Kahvaltı", tur: "yemek",
    aynaNotu: "09:00 DALGA 2 — Gözlem açılır (sinematik + push).",
  },
  {
    gun: 2, baslangic: "10:00", bitis: "13:00",
    baslik: "Oyun I — Canlı Langırt · Rodeo–Şişme Parkur · Ahşap Oyunlar (7 adet)",
    tur: "oyun",
    aynaNotu:
      "Görevler oyunlara bağlanır: 'Langırtta hedefin kaybedince ne yaptı?' Kısa görevler, yanıt sonra.",
  },
  {
    gun: 2, baslangic: "13:00", bitis: "14:30",
    baslik: "Öğle Yemeği", tur: "yemek",
    aynaNotu: "13:30 SENKRON AN + Dalga 2 puanlama hatırlatması.",
  },
  {
    gun: 2, baslangic: "14:30", bitis: "18:00",
    baslik: "Oyun II — Halat Çekme · Koca Ayak · Su Taşıma · Dev Satranç · Drone & Photobooth",
    tur: "oyun",
    aynaNotu:
      "Gizli görevlerin altın penceresi: 'Su taşımada en çok yardım edeni izle — kimseye söyleme.'",
  },
  {
    gun: 2, baslangic: "18:00", bitis: "19:30",
    baslik: "Serbest Zaman — Oda & Duş Molası", tur: "serbest",
    aynaNotu:
      "Telefonun elde olduğu en uzun pencere: birikmiş görev yanıtları, Dalga 2 son çağrı, yansıma görevi.",
  },
  {
    gun: 2, baslangic: "19:30", bitis: "20:30",
    baslik: "Akşam Yemeği (1 Soft İçecek Dahil)", tur: "yemek",
    aynaNotu: "Sessiz — gün doluydu. 20:00 günlük fısıltı (kaç göz seni puanladı).",
  },
  {
    gun: 2, baslangic: "21:00", bitis: "23:20",
    baslik: "Tecrübe Paylaşımı", tur: "sahne", sessiz: true,
    aynaNotu:
      "Sahne sessizliği. Projeksiyonda /ekran: konuşmacılar arası fiero anonsları + yıldız sayacı.",
  },
  {
    gun: 2, baslangic: "23:20", bitis: "23:30",
    baslik: "Ayna Anı", konusmaci: "AYNA", tur: "ayna", sessiz: true,
    aynaNotu:
      "Günün özeti AYNA'nın marka sesiyle salona (Direktör panelindeki 'Ayna Anı' düğmesi): yakılan yıldızlar, günün sayıları.",
  },

  // ---- GÜN 3 — PAZAR ----
  {
    gun: 3, baslangic: "07:00", bitis: "08:45",
    baslik: "Kahvaltı & Oda Boşaltma", tur: "yemek",
    aynaNotu:
      "07:00 sabah yoklaması. 07:15 DALGA 3 — Gerçek Algı açılır; bavul telaşına karşı pencere geniş (kahvaltı + ara).",
  },
  {
    gun: 3, baslangic: "09:00", bitis: "09:05",
    baslik: "PD101 Açılış Toplantısı — 2. Oturum & Kapanış", konusmaci: "Mos",
    tur: "sahne", sessiz: true,
    aynaNotu: "Sahne sessizliği.",
  },
  {
    gun: 3, baslangic: "09:05", bitis: "09:20",
    baslik: "PD101 1. Eğitim", konusmaci: "Kenan Kozanhan", tur: "sahne", sessiz: true,
    aynaNotu: "Sahne sessizliği.",
  },
  {
    gun: 3, baslangic: "09:20", bitis: "09:35",
    baslik: "PD101 2. Eğitim", konusmaci: "Ferhat Gök", tur: "sahne", sessiz: true,
    aynaNotu: "Sahne sessizliği.",
  },
  {
    gun: 3, baslangic: "09:35", bitis: "09:50",
    baslik: "PD101 3. Eğitim", konusmaci: "Ziya Şakir Yılmaz", tur: "sahne", sessiz: true,
    aynaNotu: "Sahne sessizliği.",
  },
  {
    gun: 3, baslangic: "09:50", bitis: "10:20",
    baslik: "Ara", tur: "ara",
    aynaNotu: "09:55 SENKRON AN + Dalga 3 son çağrı push. Puanlama kapanır.",
  },
  {
    gun: 3, baslangic: "10:20", bitis: "11:50",
    baslik: "PD101 Uygulamalı Yapay Zeka — Aynanı Gör", konusmaci: "Emre Topçu",
    tur: "ayna",
    aynaNotu:
      "Kampın zirvesi: PC'ler ve telefonlar zaten ellerde. Raporlar CANLI açılır ('Ayna Anı' raporu aç), sesli mektup + 'suda beliren sen'. Ardından SÖZ ritüeli (Direktör panelinden SÖZ görevi).",
  },
  {
    gun: 3, baslangic: "11:50", bitis: "12:40",
    baslik: "PD101 Kamp Analiz", konusmaci: "Aytuğ Gönül", tur: "sahne", sessiz: true,
    aynaNotu:
      "Komutan paneli verileri analiz oturumuna servis edilir: ekip radarı, momentum top 10, kamp istatistikleri.",
  },
  {
    gun: 3, baslangic: "14:00", bitis: "16:00",
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
  ayna: "🪞",
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
// Gün 1: 20:15 (akşam yemeği) · Gün 2: 13:30 (öğle) · Gün 3: 09:55 (ara)

export const SENKRON_SAATLERI: Record<1 | 2 | 3, [number, number]> = {
  1: [20, 15],
  2: [13, 30],
  3: [9, 55],
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
// Gün 2: trekking 07:00'de → 06:40-07:59. Gün 3: kahvaltı boyunca 07:00-08:44.

export function sabahPenceresiMi(
  gun: 1 | 2 | 3,
  saat: number,
  dakika: number
): boolean {
  const dk = saat * 60 + dakika;
  if (gun === 2) return dk >= 6 * 60 + 40 && dk < 8 * 60;
  if (gun === 3) return dk >= 7 * 60 && dk < 8 * 60 + 45;
  return false;
}

// ---- GECE FISILTISI: sahne kapanınca (23:40) tek cümle, sonra sessizlik ----

export const GECE_FISILTILARI: Record<number, string> = {
  1: "Bugün seni izledim. Yarın oyunlarda gözüm üzerinde olacak. İyi uykular.",
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
  "İyi akşamlar. Ben AYNA. Bugün otelin kapısından girdiğiniz andan beri sizi izliyorum. " +
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

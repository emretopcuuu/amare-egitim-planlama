// CUMARTESİ (Gün 2) GRUP PROGRAMI — SAPANCA LEADER PLUS PD101
// 150 kişi = 15 grup × 10. Her grup: 3 oyun (Bowling + 2) + 1 David seansı +
// öğle yemeği. Bu dosya tek doğruluk kaynağıdır: admin Cumartesi görünümü,
// aday grup HUD'u ve AYNA çakışmasız grup-görev motoru hep buradan okur.
//
// VERİ ÜRETİMİ: scripts/cumartesi_excel_to_ts.py <xlsx>  (yeni Excel gelince
// CUMARTESI_PROGRAMI + DAVID_SEANSLARI bloklarını yeniden üret, buraya yapıştır).
// 'server-only' DEĞİL ve DB'siz — istemci bileşenleri de aynı kuralları kullanır.

export const CUMARTESI_GRUP_SAYISI = 15;
export const CUMARTESI_TARIH = "2026-07-18"; // Gün 2 (KAMP_GUNLERI[1] ile aynı)

export type CmtTur =
  | "david_hazirlik"
  | "david_toplanti"
  | "bowling"
  | "big_bubble"
  | "atv"
  | "hazine_avi"
  | "yemek"
  | "diger";

export type CmtBlok = {
  grup: number;
  /** "HH:MM" (Europe/Istanbul) */
  baslangic: string;
  bitis: string;
  tur: CmtTur;
  baslik: string;
  detay?: string;
};

export type DavidSeans = {
  ad: string;
  baslangic: string;
  bitis: string;
  gruplar: number[];
};

export const ETKINLIK_SIMGE: Record<CmtTur, string> = {
  david_hazirlik: "🚪",
  david_toplanti: "👤",
  bowling: "🎳",
  big_bubble: "🫧",
  atv: "🏍",
  hazine_avi: "🗺",
  yemek: "🍽",
  diger: "•",
};

// ÜRETİLDİ: scripts/cumartesi_excel_to_ts.py — elle düzenleme, Excel'den yeniden üret.
export const CUMARTESI_PROGRAMI: CmtBlok[] = [
  { grup: 1, baslangic: "09:00", bitis: "09:30", tur: "david_hazirlik", baslik: 'David Hazırlık', detay: 'Üst baş / el yüz / odaya geçiş' },
  { grup: 1, baslangic: "09:30", bitis: "10:15", tur: "david_toplanti", baslik: 'David Toplantısı', detay: '30 kişilik seans' },
  { grup: 1, baslangic: "10:50", bitis: "11:50", tur: "hazine_avi", baslik: 'Hazine Avı', detay: '30 kişi' },
  { grup: 1, baslangic: "12:10", bitis: "13:00", tur: "bowling", baslik: 'Bowling', detay: 'Grup 1.1' },
  { grup: 1, baslangic: "12:10", bitis: "13:00", tur: "bowling", baslik: 'Bowling', detay: 'Grup 1.2' },
  { grup: 1, baslangic: "13:10", bitis: "13:30", tur: "big_bubble", baslik: 'Big Bubble', detay: '10 kişi' },
  { grup: 1, baslangic: "13:30", bitis: "14:30", tur: "yemek", baslik: 'Öğle yemeği', detay: 'Minimum 50 dk hedef' },
  { grup: 2, baslangic: "09:30", bitis: "09:50", tur: "big_bubble", baslik: 'Big Bubble', detay: '10 kişi' },
  { grup: 2, baslangic: "10:50", bitis: "11:50", tur: "hazine_avi", baslik: 'Hazine Avı', detay: '30 kişi' },
  { grup: 2, baslangic: "12:10", bitis: "13:00", tur: "bowling", baslik: 'Bowling', detay: 'Grup 2.1' },
  { grup: 2, baslangic: "12:10", bitis: "14:00", tur: "yemek", baslik: 'Öğle yemeği', detay: 'Minimum 50 dk hedef' },
  { grup: 2, baslangic: "13:00", bitis: "13:50", tur: "bowling", baslik: 'Bowling', detay: 'Grup 2.2' },
  { grup: 2, baslangic: "15:45", bitis: "16:15", tur: "david_hazirlik", baslik: 'David Hazırlık', detay: 'Üst baş / el yüz / odaya geçiş' },
  { grup: 2, baslangic: "16:15", bitis: "17:00", tur: "david_toplanti", baslik: 'David Toplantısı', detay: '30 kişilik seans' },
  { grup: 3, baslangic: "10:50", bitis: "11:50", tur: "hazine_avi", baslik: 'Hazine Avı', detay: '30 kişi' },
  { grup: 3, baslangic: "12:00", bitis: "13:30", tur: "yemek", baslik: 'Öğle yemeği', detay: 'Minimum 50 dk hedef' },
  { grup: 3, baslangic: "14:00", bitis: "14:45", tur: "atv", baslik: 'ATV', detay: '10 kişi' },
  { grup: 3, baslangic: "15:30", bitis: "16:20", tur: "bowling", baslik: 'Bowling', detay: 'Grup 3.1' },
  { grup: 3, baslangic: "15:30", bitis: "16:20", tur: "bowling", baslik: 'Bowling', detay: 'Grup 3.2' },
  { grup: 3, baslangic: "17:15", bitis: "17:45", tur: "david_hazirlik", baslik: 'David Hazırlık', detay: 'Üst baş / el yüz / odaya geçiş' },
  { grup: 3, baslangic: "17:45", bitis: "18:30", tur: "david_toplanti", baslik: 'David Toplantısı', detay: '30 kişilik seans' },
  { grup: 4, baslangic: "09:30", bitis: "10:20", tur: "bowling", baslik: 'Bowling', detay: 'Grup 4.1' },
  { grup: 4, baslangic: "09:30", bitis: "10:20", tur: "bowling", baslik: 'Bowling', detay: 'Grup 4.2' },
  { grup: 4, baslangic: "10:30", bitis: "10:50", tur: "big_bubble", baslik: 'Big Bubble', detay: '10 kişi' },
  { grup: 4, baslangic: "12:00", bitis: "13:30", tur: "yemek", baslik: 'Öğle yemeği', detay: 'Minimum 50 dk hedef' },
  { grup: 4, baslangic: "14:00", bitis: "14:30", tur: "david_hazirlik", baslik: 'David Hazırlık', detay: 'Üst baş / el yüz / odaya geçiş' },
  { grup: 4, baslangic: "14:30", bitis: "15:15", tur: "david_toplanti", baslik: 'David Toplantısı', detay: '30 kişilik seans' },
  { grup: 4, baslangic: "16:40", bitis: "17:40", tur: "hazine_avi", baslik: 'Hazine Avı', detay: '40 kişi' },
  { grup: 5, baslangic: "09:30", bitis: "10:20", tur: "bowling", baslik: 'Bowling', detay: 'Grup 5.1' },
  { grup: 5, baslangic: "10:45", bitis: "11:15", tur: "david_hazirlik", baslik: 'David Hazırlık', detay: 'Üst baş / el yüz / odaya geçiş' },
  { grup: 5, baslangic: "11:15", bitis: "12:00", tur: "david_toplanti", baslik: 'David Toplantısı', detay: '30 kişilik seans' },
  { grup: 5, baslangic: "12:30", bitis: "12:50", tur: "big_bubble", baslik: 'Big Bubble', detay: '10 kişi' },
  { grup: 5, baslangic: "13:00", bitis: "14:00", tur: "yemek", baslik: 'Öğle yemeği', detay: 'Minimum 50 dk hedef' },
  { grup: 5, baslangic: "15:30", bitis: "16:20", tur: "bowling", baslik: 'Bowling', detay: 'Grup 5.2' },
  { grup: 5, baslangic: "16:40", bitis: "17:40", tur: "hazine_avi", baslik: 'Hazine Avı', detay: '40 kişi' },
  { grup: 6, baslangic: "09:00", bitis: "09:30", tur: "david_hazirlik", baslik: 'David Hazırlık', detay: 'Üst baş / el yüz / odaya geçiş' },
  { grup: 6, baslangic: "09:30", bitis: "10:15", tur: "david_toplanti", baslik: 'David Toplantısı', detay: '30 kişilik seans' },
  { grup: 6, baslangic: "10:20", bitis: "11:10", tur: "bowling", baslik: 'Bowling', detay: 'Grup 6.1' },
  { grup: 6, baslangic: "11:20", bitis: "11:40", tur: "big_bubble", baslik: 'Big Bubble', detay: '10 kişi' },
  { grup: 6, baslangic: "12:00", bitis: "13:00", tur: "yemek", baslik: 'Öğle yemeği', detay: 'Minimum 50 dk hedef' },
  { grup: 6, baslangic: "13:00", bitis: "13:50", tur: "bowling", baslik: 'Bowling', detay: 'Grup 6.2' },
  { grup: 6, baslangic: "16:40", bitis: "17:40", tur: "hazine_avi", baslik: 'Hazine Avı', detay: '40 kişi' },
  { grup: 7, baslangic: "10:20", bitis: "11:10", tur: "bowling", baslik: 'Bowling', detay: 'Grup 7.1' },
  { grup: 7, baslangic: "10:20", bitis: "11:10", tur: "bowling", baslik: 'Bowling', detay: 'Grup 7.2' },
  { grup: 7, baslangic: "11:50", bitis: "12:10", tur: "big_bubble", baslik: 'Big Bubble', detay: '10 kişi' },
  { grup: 7, baslangic: "12:00", bitis: "13:00", tur: "yemek", baslik: 'Öğle yemeği', detay: 'Minimum 50 dk hedef' },
  { grup: 7, baslangic: "14:00", bitis: "14:30", tur: "david_hazirlik", baslik: 'David Hazırlık', detay: 'Üst baş / el yüz / odaya geçiş' },
  { grup: 7, baslangic: "14:30", bitis: "15:15", tur: "david_toplanti", baslik: 'David Toplantısı', detay: '30 kişilik seans' },
  { grup: 7, baslangic: "16:40", bitis: "17:40", tur: "hazine_avi", baslik: 'Hazine Avı', detay: '40 kişi' },
  { grup: 8, baslangic: "09:30", bitis: "10:15", tur: "atv", baslik: 'ATV', detay: '10 kişi' },
  { grup: 8, baslangic: "10:50", bitis: "11:10", tur: "big_bubble", baslik: 'Big Bubble', detay: '10 kişi' },
  { grup: 8, baslangic: "12:10", bitis: "13:20", tur: "yemek", baslik: 'Öğle yemeği', detay: 'Minimum 50 dk hedef' },
  { grup: 8, baslangic: "13:50", bitis: "14:40", tur: "bowling", baslik: 'Bowling', detay: 'Grup 8.1' },
  { grup: 8, baslangic: "13:50", bitis: "14:40", tur: "bowling", baslik: 'Bowling', detay: 'Grup 8.2' },
  { grup: 8, baslangic: "15:45", bitis: "16:15", tur: "david_hazirlik", baslik: 'David Hazırlık', detay: 'Üst baş / el yüz / odaya geçiş' },
  { grup: 8, baslangic: "16:15", bitis: "17:00", tur: "david_toplanti", baslik: 'David Toplantısı', detay: '30 kişilik seans' },
  { grup: 9, baslangic: "10:15", bitis: "11:00", tur: "atv", baslik: 'ATV', detay: '10 kişi' },
  { grup: 9, baslangic: "12:50", bitis: "13:10", tur: "big_bubble", baslik: 'Big Bubble', detay: '10 kişi' },
  { grup: 9, baslangic: "13:10", bitis: "14:10", tur: "yemek", baslik: 'Öğle yemeği', detay: 'Minimum 50 dk hedef' },
  { grup: 9, baslangic: "13:50", bitis: "14:40", tur: "bowling", baslik: 'Bowling', detay: 'Grup 9.1' },
  { grup: 9, baslangic: "14:40", bitis: "15:30", tur: "bowling", baslik: 'Bowling', detay: 'Grup 9.2' },
  { grup: 9, baslangic: "17:15", bitis: "17:45", tur: "david_hazirlik", baslik: 'David Hazırlık', detay: 'Üst baş / el yüz / odaya geçiş' },
  { grup: 9, baslangic: "17:45", bitis: "18:30", tur: "david_toplanti", baslik: 'David Toplantısı', detay: '30 kişilik seans' },
  { grup: 10, baslangic: "09:00", bitis: "09:30", tur: "david_hazirlik", baslik: 'David Hazırlık', detay: 'Üst baş / el yüz / odaya geçiş' },
  { grup: 10, baslangic: "09:30", bitis: "10:15", tur: "david_toplanti", baslik: 'David Toplantısı', detay: '30 kişilik seans' },
  { grup: 10, baslangic: "11:00", bitis: "11:45", tur: "atv", baslik: 'ATV', detay: '10 kişi' },
  { grup: 10, baslangic: "12:10", bitis: "12:30", tur: "big_bubble", baslik: 'Big Bubble', detay: '10 kişi' },
  { grup: 10, baslangic: "12:30", bitis: "13:30", tur: "yemek", baslik: 'Öğle yemeği', detay: 'Minimum 50 dk hedef' },
  { grup: 10, baslangic: "16:20", bitis: "17:10", tur: "bowling", baslik: 'Bowling', detay: 'Grup 10.1' },
  { grup: 10, baslangic: "16:20", bitis: "17:10", tur: "bowling", baslik: 'Bowling', detay: 'Grup 10.2' },
  { grup: 11, baslangic: "09:50", bitis: "10:10", tur: "big_bubble", baslik: 'Big Bubble', detay: '10 kişi' },
  { grup: 11, baslangic: "11:45", bitis: "12:30", tur: "atv", baslik: 'ATV', detay: '10 kişi' },
  { grup: 11, baslangic: "13:10", bitis: "14:00", tur: "yemek", baslik: 'Öğle yemeği', detay: 'Minimum 50 dk hedef' },
  { grup: 11, baslangic: "14:40", bitis: "15:30", tur: "bowling", baslik: 'Bowling', detay: 'Grup 11.1' },
  { grup: 11, baslangic: "14:40", bitis: "15:30", tur: "bowling", baslik: 'Bowling', detay: 'Grup 11.2' },
  { grup: 11, baslangic: "15:45", bitis: "16:15", tur: "david_hazirlik", baslik: 'David Hazırlık', detay: 'Üst baş / el yüz / odaya geçiş' },
  { grup: 11, baslangic: "16:15", bitis: "17:00", tur: "david_toplanti", baslik: 'David Toplantısı', detay: '30 kişilik seans' },
  { grup: 12, baslangic: "09:30", bitis: "10:30", tur: "hazine_avi", baslik: 'Hazine Avı', detay: '40 kişi' },
  { grup: 12, baslangic: "11:10", bitis: "12:00", tur: "bowling", baslik: 'Bowling', detay: 'Grup 12.1' },
  { grup: 12, baslangic: "12:00", bitis: "12:30", tur: "yemek", baslik: 'Öğle yemeği', detay: 'Minimum 50 dk hedef' },
  { grup: 12, baslangic: "12:30", bitis: "13:15", tur: "atv", baslik: 'ATV', detay: '10 kişi' },
  { grup: 12, baslangic: "13:00", bitis: "13:50", tur: "bowling", baslik: 'Bowling', detay: 'Grup 12.2' },
  { grup: 12, baslangic: "14:00", bitis: "14:30", tur: "david_hazirlik", baslik: 'David Hazırlık', detay: 'Üst baş / el yüz / odaya geçiş' },
  { grup: 12, baslangic: "14:30", bitis: "15:15", tur: "david_toplanti", baslik: 'David Toplantısı', detay: '30 kişilik seans' },
  { grup: 13, baslangic: "09:30", bitis: "10:30", tur: "hazine_avi", baslik: 'Hazine Avı', detay: '40 kişi' },
  { grup: 13, baslangic: "10:45", bitis: "11:15", tur: "david_hazirlik", baslik: 'David Hazırlık', detay: 'Üst baş / el yüz / odaya geçiş' },
  { grup: 13, baslangic: "11:15", bitis: "12:00", tur: "david_toplanti", baslik: 'David Toplantısı', detay: '30 kişilik seans' },
  { grup: 13, baslangic: "12:00", bitis: "13:00", tur: "yemek", baslik: 'Öğle yemeği', detay: 'Minimum 50 dk hedef' },
  { grup: 13, baslangic: "13:15", bitis: "14:00", tur: "atv", baslik: 'ATV', detay: '10 kişi' },
  { grup: 13, baslangic: "16:20", bitis: "17:10", tur: "bowling", baslik: 'Bowling', detay: 'Grup 13.2' },
  { grup: 13, baslangic: "17:10", bitis: "18:00", tur: "bowling", baslik: 'Bowling', detay: 'Grup 13.1' },
  { grup: 14, baslangic: "09:30", bitis: "10:30", tur: "hazine_avi", baslik: 'Hazine Avı', detay: '40 kişi' },
  { grup: 14, baslangic: "11:10", bitis: "12:00", tur: "bowling", baslik: 'Bowling', detay: 'Grup 14.1' },
  { grup: 14, baslangic: "11:10", bitis: "12:00", tur: "bowling", baslik: 'Bowling', detay: 'Grup 14.2' },
  { grup: 14, baslangic: "12:00", bitis: "13:00", tur: "yemek", baslik: 'Öğle yemeği', detay: 'Minimum 50 dk hedef' },
  { grup: 14, baslangic: "14:45", bitis: "15:30", tur: "atv", baslik: 'ATV', detay: '10 kişi' },
  { grup: 14, baslangic: "17:15", bitis: "17:45", tur: "david_hazirlik", baslik: 'David Hazırlık', detay: 'Üst baş / el yüz / odaya geçiş' },
  { grup: 14, baslangic: "17:45", bitis: "18:30", tur: "david_toplanti", baslik: 'David Toplantısı', detay: '30 kişilik seans' },
  { grup: 15, baslangic: "09:30", bitis: "10:30", tur: "hazine_avi", baslik: 'Hazine Avı', detay: '40 kişi' },
  { grup: 15, baslangic: "10:45", bitis: "11:15", tur: "david_hazirlik", baslik: 'David Hazırlık', detay: 'Üst baş / el yüz / odaya geçiş' },
  { grup: 15, baslangic: "11:15", bitis: "12:00", tur: "david_toplanti", baslik: 'David Toplantısı', detay: '30 kişilik seans' },
  { grup: 15, baslangic: "12:00", bitis: "13:00", tur: "yemek", baslik: 'Öğle yemeği', detay: 'Minimum 50 dk hedef' },
  { grup: 15, baslangic: "15:30", bitis: "16:15", tur: "atv", baslik: 'ATV', detay: '10 kişi' },
  { grup: 15, baslangic: "17:10", bitis: "18:00", tur: "bowling", baslik: 'Bowling', detay: 'Grup 15.1' },
  { grup: 15, baslangic: "17:10", bitis: "18:00", tur: "bowling", baslik: 'Bowling', detay: 'Grup 15.2' },
];

export const DAVID_SEANSLARI: DavidSeans[] = [
  { ad: 'Sabah 1', baslangic: "09:30", bitis: "10:15", gruplar: [1, 6, 10] },
  { ad: 'Sabah 2', baslangic: "11:15", bitis: "12:00", gruplar: [5, 13, 15] },
  { ad: 'Öğleden sonra 1', baslangic: "14:30", bitis: "15:15", gruplar: [4, 7, 12] },
  { ad: 'Öğleden sonra 2', baslangic: "16:15", bitis: "17:00", gruplar: [2, 8, 11] },
  { ad: 'Öğleden sonra 3', baslangic: "17:45", bitis: "18:30", gruplar: [3, 9, 14] },
];

// ---- Zaman yardımcıları (dakika-bazlı, saf) ----

export function cmtDk(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function grupBloklari(grup: number): CmtBlok[] {
  return CUMARTESI_PROGRAMI.filter((b) => b.grup === grup).sort(
    (a, b) => cmtDk(a.baslangic) - cmtDk(b.baslangic)
  );
}

/** O an grubun içinde olduğu sabit blok (başlangıç dahil, bitiş hariç) — yoksa null. */
export function grupAktifBlok(grup: number, gunDk: number): CmtBlok | null {
  return (
    grupBloklari(grup).find(
      (b) => gunDk >= cmtDk(b.baslangic) && gunDk < cmtDk(b.bitis)
    ) ?? null
  );
}

/** Grup şu an sabit bir programda mı (David/oyun/yemek)? → AYNA görev VERMEZ. */
export function grupMesgulMu(grup: number, gunDk: number): boolean {
  return grupAktifBlok(grup, gunDk) !== null;
}

/** Grubun şu andan sonra başlayan ilk bloğu (sıradaki) — yoksa null. */
export function grupSiradaki(grup: number, gunDk: number): CmtBlok | null {
  return grupBloklari(grup).find((b) => cmtDk(b.baslangic) > gunDk) ?? null;
}

/** Az önce biten blok (son `pencereDk` dk) — ana-bağlı görev tetiği için. */
export function grupBitenBlok(
  grup: number,
  gunDk: number,
  pencereDk = 12
): CmtBlok | null {
  let yakin: CmtBlok | null = null;
  let fark = Infinity;
  for (const b of grupBloklari(grup)) {
    const f = gunDk - cmtDk(b.bitis);
    if (f >= 0 && f <= pencereDk && f < fark) {
      yakin = b;
      fark = f;
    }
  }
  return yakin;
}

/** Grubun boş pencereleri: ardışık meşgul aralıkları arası ≥ minDk boşluk.
 *  AYNA grup görevleri YALNIZ bu pencerelerde verilir (çakışma olmaz). */
export function grupBosPencereler(
  grup: number,
  minDk = 15
): { bas: number; bit: number }[] {
  const mesgul: [number, number][] = grupBloklari(grup).map((b) => [
    cmtDk(b.baslangic),
    cmtDk(b.bitis),
  ]);
  mesgul.sort((a, b) => a[0] - b[0]);
  const birlesik: [number, number][] = [];
  for (const [s, e] of mesgul) {
    const son = birlesik[birlesik.length - 1];
    if (son && s <= son[1]) son[1] = Math.max(son[1], e);
    else birlesik.push([s, e]);
  }
  const pencere: { bas: number; bit: number }[] = [];
  for (let i = 0; i < birlesik.length - 1; i++) {
    const bas = birlesik[i][1];
    const bit = birlesik[i + 1][0];
    if (bit - bas >= minDk) pencere.push({ bas, bit });
  }
  return pencere;
}

/** Grup şu an boş pencerede mi (AYNA görev verebilir mi)? */
export function grupBostaMi(grup: number, gunDk: number): boolean {
  return grupBosPencereler(grup).some((p) => gunDk >= p.bas && gunDk < p.bit);
}

export function grupAdi(grup: number): string {
  return `Grup ${grup}`;
}

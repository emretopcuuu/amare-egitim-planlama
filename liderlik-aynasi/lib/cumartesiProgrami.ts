// CUMARTESİ (Gün 2) GRUP PROGRAMI — SAPANCA LEADER PLUS PD101
// 150 kişi = 15 grup × 10. Her grup: 3 oyun (Bowling + 2) + 1 David seansı +
// öğle yemeği. Bu dosya tek doğruluk kaynağıdır: admin Cumartesi görünümü,
// aday grup HUD'u ve AYNA çakışmasız grup-görev motoru hep buradan okur.
//
// VERİ ÜRETİMİ: scripts/cumartesi_excel_to_ts.py <xlsx>  (yeni Excel gelince
// CUMARTESI_PROGRAMI + DAVID_SEANSLARI bloklarını yeniden üret, buraya yapıştır).
// 'server-only' DEĞİL ve DB'siz — istemci bileşenleri de aynı kuralları kullanır.

import type { EtkinlikTuru, ProgramMaddesi } from "./kampProgrami";

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

// ---- AYNA ETKİNLİK-FARKINDALIĞI (Slice 3) ----
// AYNA Cumartesi günü grup SESSİZ KALMAZ; tam tersine grubun O ANKİ etkinliğine
// göre o grup+kişiye ÖZEL görev üretir. Etkinliğin içine oturan, akışı bozmayan
// ama liderliği çalıştıran küçük adımlar (David'le foto/soru, oyunda gözlem...).

/** CmtTur → genel EtkinlikTuru (görev türü seçimini yönlendirir, sessizlik YOK). */
const CMT_ETKINLIK_TURU: Record<CmtTur, EtkinlikTuru> = {
  david_hazirlik: "ara",
  david_toplanti: "sahne",
  bowling: "oyun",
  big_bubble: "oyun",
  atv: "oyun",
  hazine_avi: "oyun",
  yemek: "yemek",
  diger: "serbest",
};

/** Etkinliğe özel görev yönergesi — AYNA bunu görevin İÇİNE diker. */
export const TUR_GOREV_IPUCU: Record<CmtTur, string> = {
  david_hazirlik:
    "Grup birazdan David Chung'un odasına geçecek. Kısa, sessiz bir hazırlık/niyet görevi ver: David'e soracağı tek soruyu ya da oturumdan almak istediği tek şeyi şimdi netleştirsin.",
  david_toplanti:
    "Grup ŞU AN David Chung ile aynı odada. Görevi bu ana dik: David'le birlikte bir an yakalasın — ona içten, kişisel bir soru sormak; oturumdan aklında kalan tek cümleyi yazmak; ya da uygun bir anda birlikte bir fotoğraf karesi. Oturumu bölmeyen, saygılı ama cesaret isteyen küçük bir adım olsun.",
  bowling:
    "Grup bowling oynuyor. Görevi oyunun içine dik: takımdan birinin nasıl liderlik ettiğini / nasıl destek olduğunu gözlemlesin ya da kendisi ortamın enerjisini yükselten kişi olsun.",
  big_bubble:
    "Grup Big Bubble'da (yüksek enerji, fiziksel oyun). Cesaret/pozitif enerji görevi: oyunun içinde küçük bir liderlik ya da takım ruhu anı yaratsın ve gözlemlesin.",
  atv:
    "Grup ATV parkurunda. Cesaret/sorumluluk görevi: parkurda öne çıkanı ya da geride kalanı bekleyeni gözlemlesin; kendi cesaret anını fark edip not etsin.",
  hazine_avi:
    "Grup Hazine Avı'nda (takım problem çözme). Takım ruhu/iletişim görevi: kimin yön verdiğini, kimin sessiz kaldığını gözlemlesin; kendisi bir köprü kursun.",
  yemek:
    "Grup öğle yemeğinde. Sıcak, sohbet temelli görev: henüz tanışmadığı biriyle masada gerçek bir bağ kursun ya da birine içten bir takdir iletsin.",
  diger: "",
};

function cmtMadde(blok: CmtBlok): ProgramMaddesi {
  return {
    gun: 2,
    baslangic: blok.baslangic,
    bitis: blok.bitis,
    baslik: blok.detay ? `${blok.baslik} (${blok.detay})` : blok.baslik,
    tur: CMT_ETKINLIK_TURU[blok.tur],
    aynaNotu: TUR_GOREV_IPUCU[blok.tur],
  };
}

/** O an grubun içinde olduğu etkinlik → ProgramMaddesi + etkinliğe özel ipucu. */
export function cumartesiGrupEtkinligi(
  grup: number,
  gunDk: number
): { madde: ProgramMaddesi; ipucu: string } | null {
  const blok = grupAktifBlok(grup, gunDk);
  if (!blok) return null;
  return { madde: cmtMadde(blok), ipucu: TUR_GOREV_IPUCU[blok.tur] };
}

/** Az önce biten grup etkinliği (ana-bağlı tetik) — nötr bloklar hariç. */
export function cumartesiGrupBitenEtkinlik(
  grup: number,
  gunDk: number,
  pencereDk = 12
): ProgramMaddesi | null {
  const blok = grupBitenBlok(grup, gunDk, pencereDk);
  if (!blok) return null;
  // Yemek/hazırlık nötrdür — duygusal sıcaklık taşımaz, ana-bağlı tetiklemez.
  if (blok.tur === "yemek" || blok.tur === "david_hazirlik") return null;
  return cmtMadde(blok);
}

/** "Grup N" takım adından grup numarasını çöz (1..15) — yoksa null. */
export function grupNoCozumle(takim: string | null | undefined): number | null {
  if (!takim) return null;
  const m = takim.match(/(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= CUMARTESI_GRUP_SAYISI ? n : null;
}

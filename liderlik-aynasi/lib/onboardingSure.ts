// [E2] ONBOARDING SÜRE HARİTASI — tek doğruluk kaynağı. Her adımın tahmini
// süresi (dk) ve görünen adı buradan okunur: adım başlıklarındaki "⏱ ~N dk"
// rozetleri, OnboardingRayi'daki satır süreleri + "toplam ~N dk kaldı" ve
// ana sayfadaki "kaldığın yerden devam" kartı [E1] hep aynı sayıyı söyler.
// (İstemciden de import edilir — "server-only" YOK.)

export const ONBOARDING_SURE_DK = {
  hazirlik: 2,
  sesSecimi: 1,
  rituel: 5,
  oyun: 2,
  // Değerler 41 adımlık bir çalışma — akış içindeki mevcut "~15 dk" beklentisi
  // gerçeğe daha yakın; haritada da aynı sayı korunur (beklenti tutarlılığı).
  degerler: 15,
  pusula: 12,
  hedef: 8,
  onFarkindalik: 8,
} as const;

export type OnboardingAdimKod = keyof typeof ONBOARDING_SURE_DK;

// Katılımcıya görünen adım adları (kart/rozet/hatırlatma metinlerinde).
export const ONBOARDING_ADIM_AD: Record<OnboardingAdimKod, string> = {
  hazirlik: "Hazırlık",
  sesSecimi: "Ayna sesi seçimi",
  rituel: "Ses Ritüeli",
  oyun: "Oyun Seçimi",
  degerler: "Değerler çalışması",
  pusula: "Pusula",
  hedef: "Hedef",
  onFarkindalik: "Ön Farkındalık",
};

/** Başlık bölgesi rozeti: "⏱ ~N dk". */
export function sureRozeti(kod: OnboardingAdimKod): string {
  return `⏱ ~${ONBOARDING_SURE_DK[kod]} dk`;
}

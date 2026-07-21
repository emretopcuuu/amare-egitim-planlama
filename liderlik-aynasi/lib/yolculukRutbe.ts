// [B#21] 90-GÜN YOLCULUK RÜTBE MERDİVENİ — kampın kıvılcım unvanlarından (Çırak…
// Efsane, lib/kivilcim.ts) AYRI, yolculuğa özel bir ilerleme merdiveni. Eşikler
// kişinin ADIM ATTIĞI GÜN sayısına bağlı (takvim değil eylem) — 21/66 gün
// alışkanlık bilimine gönderme yapar. Hem sunucu hem istemci kullanır.

export type YolculukRutbe = { ad: string; ikon: string; esik: number };

export const YOLCULUK_RUTBELERI: readonly YolculukRutbe[] = [
  { ad: "Tohum", ikon: "🌱", esik: 0 },
  { ad: "Filiz", ikon: "🌿", esik: 7 },
  { ad: "Kök Salan", ikon: "🌳", esik: 21 }, // ~3 hafta: ilk kök
  { ad: "Gövde", ikon: "🪵", esik: 45 },
  { ad: "Dal Veren", ikon: "🌲", esik: 66 }, // ~alışkanlık eşiği
  { ad: "Meyve", ikon: "🍎", esik: 90 }, // yolun sonu: ürün
];

// Adım atılan gün sayısından mevcut rütbe + sonraki eşiğe kalan.
export function yolculukRutbeBul(adimGunu: number) {
  let mevcut: YolculukRutbe = YOLCULUK_RUTBELERI[0];
  for (const r of YOLCULUK_RUTBELERI) if (adimGunu >= r.esik) mevcut = r;
  const sonraki = YOLCULUK_RUTBELERI.find((r) => r.esik > adimGunu) ?? null;
  return { mevcut, sonraki, kalan: sonraki ? sonraki.esik - adimGunu : 0 };
}

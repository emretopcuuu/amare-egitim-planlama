// Kıvılcım oyunlaştırması: görev puanından puan hesabı + unvan merdiveni.
// Hem sunucu hem istemci kullanır — 'server-only' bilinçli olarak yok.

export type Unvan = { ad: string; esik: number };

export const UNVANLAR: readonly Unvan[] = [
  { ad: "Çırak", esik: 0 },
  { ad: "Kaşif", esik: 50 },
  { ad: "Alev", esik: 120 },
  { ad: "Kor", esik: 220 },
  { ad: "Efsane", esik: 350 },
];

export function unvanBul(kivilcim: number) {
  let mevcut: Unvan = UNVANLAR[0];
  for (const u of UNVANLAR) if (kivilcim >= u.esik) mevcut = u;
  const sonraki = UNVANLAR.find((u) => u.esik > kivilcim) ?? null;
  return { mevcut, sonraki, kalan: sonraki ? sonraki.esik - kivilcim : 0 };
}

/** Görev Kıvılcımı: taban 10 + AYNA puanı + zamanında bitirme bonusu 5. */
export function kivilcimHesapla(aiPuan: number, zamaninda: boolean, streak = 0): number {
  return 10 + aiPuan + (zamaninda ? 5 : 0) + streakBonus(streak);
}

/** Ard arda tamamlama (streak) basamak bonusu — momentum SOMUT ödüllenir
 *  (öneri #5). Eskiden streak yalnız prompt tonunu değiştiriyordu, kıvılcıma
 *  hiç etkisi yoktu. Basamaklı: 3→+3, 5→+6, 7+→+10. streak=0 → bonus yok. */
export function streakBonus(streak: number): number {
  if (streak >= 7) return 10;
  if (streak >= 5) return 6;
  if (streak >= 3) return 3;
  return 0;
}

export const SOZ_KIVILCIMI = 25;

/** Senkron An: kolektif ana katılmanın kendisi ödüldür — AI puanlaması yok. */
export const SENKRON_KIVILCIMI = 8;

/** Sesli Mektup: 90 güne mühürlenen ses kaydının kendisi ödüldür — söz gibi
 *  sabit Kıvılcım, AI puanlaması yok. */
export const MEKTUP_KIVILCIMI = 25;

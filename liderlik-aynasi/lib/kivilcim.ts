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
export function kivilcimHesapla(aiPuan: number, zamaninda: boolean): number {
  return 10 + aiPuan + (zamaninda ? 5 : 0);
}

export const SOZ_KIVILCIMI = 25;

/** Senkron An: kolektif ana katılmanın kendisi ödüldür — AI puanlaması yok. */
export const SENKRON_KIVILCIMI = 8;

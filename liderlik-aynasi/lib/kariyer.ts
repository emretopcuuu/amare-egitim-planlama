// KARİYER BASAMAKLARI + GELİR TABLOSU (Amare / One Team kariyer planı).
// Hedef modülünün "somutlaştırma" aşamasında kişi TÜM kariyerleri ve ortalama
// aylık gelirlerini görür, hedefini seçer; 3 soruyla kişisel kariyer planı çıkar.
// Rakamlar aylık TL gelir. "+" işaretli ortalamalar alt/üst aralık yayınlanmadan
// taban değerdir (ör. "625.000+").

export type KariyerRutbe = {
  ad: string;
  rozet?: string; // "İlk aylar", "Popüler", "3-6 ay", "Zirve"
  enDusuk: number | null;
  enYuksek: number | null;
  ortalama: number;
  arti?: boolean; // ortalama bir taban mı ("625.000+")
};

export const KARIYER_BASAMAKLARI: KariyerRutbe[] = [
  { ad: "Brand Partner", enDusuk: 126, enYuksek: 16610, ortalama: 1039 },
  { ad: "Brand Builder", enDusuk: 86, enYuksek: 39054, ortalama: 2020 },
  { ad: "Bronze", enDusuk: 428, enYuksek: 34061, ortalama: 6425 },
  { ad: "Silver", rozet: "İlk aylar", enDusuk: 3251, enYuksek: 62644, ortalama: 17541 },
  { ad: "Gold", rozet: "Popüler", enDusuk: 13486, enYuksek: 139256, ortalama: 35959 },
  { ad: "Platinum", enDusuk: 18184, enYuksek: 136019, ortalama: 42665 },
  { ad: "Leader", enDusuk: 38845, enYuksek: 207603, ortalama: 71894 },
  { ad: "Senior Leader", enDusuk: 76814, enYuksek: 201838, ortalama: 101811 },
  { ad: "Exec. Leader", enDusuk: 108418, enYuksek: 164220, ortalama: 136263 },
  { ad: "Diamond", rozet: "3-6 ay", enDusuk: 238626, enYuksek: 362643, ortalama: 288926 },
  { ad: "1 Star Diamond", enDusuk: 370548, enYuksek: 518500, ortalama: 421220 },
  { ad: "2 Star Diamond", enDusuk: null, enYuksek: null, ortalama: 625000, arti: true },
  { ad: "3 Star Diamond", enDusuk: null, enYuksek: null, ortalama: 812500, arti: true },
  { ad: "Presidential Diamond", rozet: "Zirve", enDusuk: null, enYuksek: null, ortalama: 1125000, arti: true },
];

// Günlük saat seçenekleri → haftalık saat (7 gün üzerinden, ekrandaki gibi:
// "Günde 5+ saat → Haftalık ~35 saat").
export const GUNLUK_SAAT_SECENEKLERI = [
  { anahtar: "1", etiket: "Günde 1 saat", gunluk: 1 },
  { anahtar: "2", etiket: "Günde 2 saat", gunluk: 2 },
  { anahtar: "3-4", etiket: "Günde 3-4 saat", gunluk: 3.5 },
  { anahtar: "5+", etiket: "Günde 5+ saat", gunluk: 5 },
] as const;

export const SURE_SECENEKLERI = [
  { anahtar: "1", etiket: "1 ay içinde", ay: 1 },
  { anahtar: "3", etiket: "3 ay içinde", ay: 3 },
  { anahtar: "6", etiket: "6 ay içinde", ay: 6 },
  { anahtar: "12", etiket: "12 ay içinde", ay: 12 },
] as const;

// Ortalama hafta/ay ve başlangıç yatırımı (kayıt + ürün paketi tahmini).
const HAFTA_PER_AY = 4.3;
const BASLANGIC_YATIRIM = 30000; // TL

export function tlFormat(n: number, arti = false): string {
  return new Intl.NumberFormat("tr-TR").format(n) + (arti ? "+" : "");
}

export type KilometreTasi = { ay: number; rutbe: string; gelir: number; arti?: boolean };
export type KariyerPlani = {
  hedefIndex: number;
  rutbe: string;
  gelir: number;
  gelirArti: boolean;
  sureAy: number;
  gunlukSaatEtiket: string;
  gunlukSaat: number;
  haftalikSaat: number;
  kilometreTaslari: KilometreTasi[];
  toplamSaat: number;
  toplamPara: number;
  geriDonusAy: number; // 0 → "1 ay içinde"
  saatlikKazanc: number;
};

// Kişisel kariyer planını hesapla (ekrandaki "Kişisel kariyer planın" kartı).
// Ara hedefler: hedefin hemen altındaki iki basamak, sürenin 1/3 ve 2/3'ünde.
export function kariyerPlaniHesapla(
  hedefIndex: number,
  sureAy: number,
  gunlukSaat: number,
  gunlukSaatEtiket: string
): KariyerPlani | null {
  const hedef = KARIYER_BASAMAKLARI[hedefIndex];
  if (!hedef || sureAy <= 0 || gunlukSaat <= 0) return null;

  const haftalikSaat = Math.round(gunlukSaat * 7);
  const kilometreTaslari: KilometreTasi[] = [];
  // Hedefin altındaki iki basamağı ara hedef yap (varsa).
  const alt2 = KARIYER_BASAMAKLARI[hedefIndex - 2];
  const alt1 = KARIYER_BASAMAKLARI[hedefIndex - 1];
  if (alt2)
    kilometreTaslari.push({
      ay: Math.max(1, Math.round(sureAy / 3)),
      rutbe: alt2.ad,
      gelir: alt2.ortalama,
      arti: alt2.arti,
    });
  if (alt1)
    kilometreTaslari.push({
      ay: Math.max(1, Math.round((2 * sureAy) / 3)),
      rutbe: alt1.ad,
      gelir: alt1.ortalama,
      arti: alt1.arti,
    });
  kilometreTaslari.push({ ay: sureAy, rutbe: hedef.ad, gelir: hedef.ortalama, arti: hedef.arti });

  const toplamSaat = Math.round(haftalikSaat * sureAy * HAFTA_PER_AY);
  const aylikSaat = haftalikSaat * HAFTA_PER_AY;
  const saatlikKazanc = aylikSaat > 0 ? Math.round(hedef.ortalama / aylikSaat) : 0;
  const geriDonusAy = Math.max(0, Math.ceil(BASLANGIC_YATIRIM / hedef.ortalama) - 1);

  return {
    hedefIndex,
    rutbe: hedef.ad,
    gelir: hedef.ortalama,
    gelirArti: !!hedef.arti,
    sureAy,
    gunlukSaatEtiket,
    gunlukSaat,
    haftalikSaat,
    kilometreTaslari,
    toplamSaat,
    toplamPara: BASLANGIC_YATIRIM,
    geriDonusAy,
    saatlikKazanc,
  };
}

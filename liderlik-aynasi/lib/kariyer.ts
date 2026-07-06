// KARİYER BASAMAKLARI + GELİR TABLOSU (Amare / One Team kariyer planı).
// Hedef modülünün "somutlaştırma" aşamasında kişi TÜM kariyerleri ve ortalama
// aylık gelirlerini görür, hedefini seçer; 3 soruyla kişisel kariyer planı çıkar.
// Rakamlar aylık TL gelir. "+" işaretli ortalamalar alt/üst aralık yayınlanmadan
// taban değerdir (ör. "625.000+").
// OV (Omset Volume) ve VOLL (Volume of your own Line Levels) değerleri OV bazlı
// simülasyon için eklendi; saf fonksiyonlar server-only içermez.

export type KariyerRutbe = {
  ad: string;
  rozet?: string; // "İlk aylar", "Popüler", "3-6 ay", "Zirve"
  enDusuk: number | null;
  enYuksek: number | null;
  ortalama: number;
  arti?: boolean; // ortalama bir taban mı ("625.000+")
  ov: number;        // bu basamak için gereken minimum OV
  voll: number | null; // gereken minimum VOLL (null = henüz gerekli değil)
};

export const KARIYER_BASAMAKLARI: KariyerRutbe[] = [
  { ad: "Brand Partner",       enDusuk: 126,    enYuksek: 16610,  ortalama: 1039,    ov: 100,     voll: null   },
  { ad: "Brand Builder",       enDusuk: 86,     enYuksek: 39054,  ortalama: 2020,    ov: 1000,    voll: null   },
  { ad: "Bronze",              enDusuk: 428,    enYuksek: 34061,  ortalama: 6425,    ov: 3000,    voll: 600    },
  { ad: "Silver",    rozet: "İlk aylar", enDusuk: 3251,  enYuksek: 62644,  ortalama: 17541, ov: 5000,    voll: 1500   },
  { ad: "Gold",      rozet: "Popüler",   enDusuk: 13486, enYuksek: 139256, ortalama: 35959, ov: 10000,   voll: 3000   },
  { ad: "Platinum",            enDusuk: 18184,  enYuksek: 136019, ortalama: 42665,   ov: 15000,   voll: 4500   },
  { ad: "Leader",              enDusuk: 38845,  enYuksek: 207603, ortalama: 71894,   ov: 25000,   voll: 7500   },
  { ad: "Senior Leader",       enDusuk: 76814,  enYuksek: 201838, ortalama: 101811,  ov: 50000,   voll: 15000  },
  { ad: "Exec. Leader",        enDusuk: 108418, enYuksek: 164220, ortalama: 136263,  ov: 75000,   voll: 22500  },
  { ad: "Diamond",   rozet: "3-6 ay",    enDusuk: 238626, enYuksek: 362643, ortalama: 288926, ov: 125000,  voll: 37500  },
  { ad: "1 Star Diamond",      enDusuk: 370548, enYuksek: 518500, ortalama: 421220,  ov: 250000,  voll: 75000  },
  { ad: "2 Star Diamond",      enDusuk: null,   enYuksek: null,   ortalama: 625000,  arti: true, ov: 500000,  voll: 150000 },
  { ad: "3 Star Diamond",      enDusuk: null,   enYuksek: null,   ortalama: 812500,  arti: true, ov: 750000,  voll: 225000 },
  { ad: "Presidential Diamond", rozet: "Zirve", enDusuk: null, enYuksek: null, ortalama: 1125000, arti: true, ov: 1000000, voll: 300000 },
];

// Günlük saat seçenekleri → haftalık saat (7 gün üzerinden, ekrandaki gibi:
// "Günde 5+ saat → Haftalık ~35 saat").
// HIZLI BAŞLANGIÇ (HBB): yeni başlayanın ilk 3 ayı. Her ay bir rütbe (Bronze →
// Silver → Gold) + HBB bonusu + ortalama kazanç. Bonus + ortalama = aylık toplam.
// Rakamlar Amare HBB tablosundan (ilk 3 ay ortalama toplam kazanç senaryosu).
export type HbbAy = { ay: number; rutbe: string; bonus: number; ortalama: number; toplam: number };
export const HBB_AYLAR: HbbAy[] = [
  { ay: 1, rutbe: "Bronze", bonus: 5175, ortalama: 24825, toplam: 30000 },
  { ay: 2, rutbe: "Silver", bonus: 20700, ortalama: 39300, toplam: 60000 },
  { ay: 3, rutbe: "Gold", bonus: 74520, ortalama: 47480, toplam: 122000 },
];
export const HBB_TOPLAM = HBB_AYLAR.reduce((t, a) => t + a.toplam, 0); // 212.000
export const HBB_BONUS_TOPLAM = HBB_AYLAR.reduce((t, a) => t + a.bonus, 0); // 100.395

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

// ─── OV BAZLI BÜYÜME SİMÜLASYONU (saf, DB'siz) ───────────────────────────
// Bileşik büyüme formülü: OV(ay) = OV₀ × (1 + g)^ay

// OV₀'dan başlayarak `ay` ay sonraki OV değerini hesapla.
export function ovSimulasyonu(ov0: number, ay: number, buyume: number): number {
  if (ov0 <= 0 || ay < 0) return 0;
  return Math.round(ov0 * Math.pow(1 + buyume, ay));
}

// OV₀'dan `ovHedef`'e `ay` ayda ulaşmak için gereken aylık büyüme oranı.
export function gerekliTempo(ov0: number, ovHedef: number, ay: number): number {
  if (ov0 <= 0 || ay <= 0 || ovHedef <= ov0) return 0;
  return Math.pow(ovHedef / ov0, 1 / ay) - 1;
}

// OV₀'dan `ovHedef`'e %20 aylık büyüme ile kaç ayda ulaşılır.
export function makuSure(ov0: number, ovHedef: number): number {
  if (ov0 <= 0 || ovHedef <= ov0) return 0;
  return Math.ceil(Math.log(ovHedef / ov0) / Math.log(1.2));
}

// OV₀'a göre mevcut kariyer basamağının indeksini döndür.
export function mevcutRutbeIndex(ov0: number): number {
  let idx = 0;
  for (let i = KARIYER_BASAMAKLARI.length - 1; i >= 0; i--) {
    if (ov0 >= KARIYER_BASAMAKLARI[i].ov) {
      idx = i;
      break;
    }
  }
  return idx;
}

// Simülasyonda gösterilecek 3 senaryonun büyüme oranları.
export const OV_SENARYOLAR = [
  { etiket: "%20 / ay", buyume: 0.2 },
  { etiket: "%30 / ay", buyume: 0.3 },
  { etiket: "%40 / ay", buyume: 0.4 },
] as const;

// Kişi tempo (aylık OV artışı) seçer; süre buna göre TÜRETİLİR.
export const TEMPO_SECENEKLERI = [
  { anahtar: "20", etiket: "%20 / ay", buyume: 0.2 },
  { anahtar: "30", etiket: "%30 / ay", buyume: 0.3 },
  { anahtar: "40", etiket: "%40 / ay", buyume: 0.4 },
] as const;

// Seçilen tempoyla OV₀'dan hedef OV'ye kaç ayda ulaşılır (en az 1 ay).
export function tempoSure(ov0: number, ovHedef: number, buyume: number): number {
  if (ov0 <= 0 || buyume <= 0 || ovHedef <= ov0) return 1;
  return Math.max(1, Math.ceil(Math.log(ovHedef / ov0) / Math.log(1 + buyume)));
}

// ─── KARİYER KAPISI: OV + VOLL birlikte (Aytug Gönül geri bildirimi) ─────────
// Bir kariyer basamağının şartı hem OV hem VOLL (dengeli hacim). Kayıt kariyeri
// için gereken OV zaten fazlasıyla varsa (surplus OV), asıl darboğaz VOLL'dür —
// süre ve simülasyon VOLL'ye göre kurulur. Ayrıca Diamond ve üstünde aylık %20+
// büyüme yüksek ciroda sürdürülemez; seçilen tempo yarılanır (%20 → ~%10 ort.).

export const DIAMOND_INDEX = KARIYER_BASAMAKLARI.findIndex((r) => r.ad === "Diamond");
export const VOLL_SIM_SINIR = 300_000; // Presidential Diamond VOLL şartı

// Diamond ve üstünde seçilen tempoyu yarıya indir (gerçekçi yüksek-hacim büyüme).
export function etkinBuyume(hedefIndex: number, buyume: number): number {
  return hedefIndex >= DIAMOND_INDEX ? buyume / 2 : buyume;
}

export type PlanKapisi = {
  metrik: "OV" | "VOLL";
  baslangic: number;
  hedef: number;
  buyume: number; // etkin (Diamond+ yarılanmış) büyüme
  sinir: number; // simülasyon üst sınırı (OV: 1M, VOLL: 300k)
  sureAy: number;
};

// Bağlayıcı (daha uzun süren) kapıyı bul: OV zaten fazlaysa VOLL, aksi halde OV.
export function planKapisi(
  ov0: number,
  vol0: number,
  hedefIndex: number,
  buyume: number
): PlanKapisi {
  const rutbe = KARIYER_BASAMAKLARI[hedefIndex];
  const g = etkinBuyume(hedefIndex, buyume);
  const ovSure = rutbe ? tempoSure(ov0, rutbe.ov, g) : 1;
  const volHedef = rutbe?.voll ?? null;
  const volSure = volHedef ? tempoSure(vol0, volHedef, g) : 1;
  // VOLL kapısı en az OV kapısı kadar bağlayıcıysa (>=) VOLL'yi esas al: yüksek
  // basamakta dengeli hacim asıl darboğazdır, kişi "1 ayda PD" yanılgısı görmesin.
  if (volHedef && volSure >= ovSure) {
    return { metrik: "VOLL", baslangic: vol0, hedef: volHedef, buyume: g, sinir: VOLL_SIM_SINIR, sureAy: Math.max(1, volSure) };
  }
  return { metrik: "OV", baslangic: ov0, hedef: rutbe?.ov ?? 0, buyume: g, sinir: OV_SIM_SINIR, sureAy: Math.max(1, ovSure) };
}

// Kariyer hedefine ulaşma süresi — bağlayıcı kapıdan (OV veya VOLL) türetilir.
export function planSuresi(ov0: number, vol0: number, hedefIndex: number, buyume: number): number {
  return planKapisi(ov0, vol0, hedefIndex, buyume).sureAy;
}

// Simülasyon tablosu 1.000.000 OV'yi geçince afaki büyümeyi GÖSTERMESİN: sınırı
// ilk geçtiği aya kadar olan ayları döndür (o ay dahil), en fazla maxAy.
export const OV_SIM_SINIR = 1_000_000;
export function simulasyonSinirliAylar(
  ov0: number,
  buyume: number,
  maxAy: number,
  sinir = OV_SIM_SINIR
): number[] {
  const n = Math.max(1, Math.round(maxAy));
  const aylar: number[] = [];
  for (let ay = 1; ay <= n; ay++) {
    aylar.push(ay);
    if (ovSimulasyonu(ov0, ay, buyume) >= sinir) break;
  }
  return aylar;
}

// Simülasyon ayları: HER ay (1, 2, 3 … süre) — büyümeyi ay ay göster ki kişi
// merdiveni adım adım hissetsin (¼/½/¾ atlamaları yerine sürekli).
export function simulasyonMilestonelari(ay: number): number[] {
  const n = Math.max(1, Math.round(ay));
  return Array.from({ length: n }, (_, i) => i + 1);
}

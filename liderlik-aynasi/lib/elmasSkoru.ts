// FAZ E — Elmas Seçim Skoru (Diamond). YALNIZCA ADMIN; katılımcıya asla gösterilmez.
// Ön Farkındalık + Mini 360 verisinden, kampta üzerine yatırım yapılacak yüksek
// potansiyelli liderleri ("Elmas adayı") bulmak için tek bir skor üretir.
//
// Tasarım ilkeleri:
//  • Ağırlıklar (kilitli): gerçek iş (Katman 3) en ağır; sonra dış algı (Mini 360),
//    büyüme hızı (Katman 5), uygulama gerçeği (Katman 2), öz-değerlendirme (Katman 1).
//  • Sınırsız sayımlar (aktivite üretimi, öğrenme hızı) MUTLAK eşikle değil, KOHORT
//    içi yüzdelik sırayla normalize edilir → "pilot kalibreli": gerçek ~160 kişilik
//    grupta anlam kazanır, tek bir kişiyle değil.
//  • Tutarlılık çarpanı: kişi kendini ekibinin gördüğünden belirgin yüksek puanlıyorsa
//    (ölçülmüş kör nokta) skor düşer — kendini göremeyen lider seçim riskidir.
//  • Saf fonksiyon; veri okuma çağıranda. Böylece test edilebilir, sunucu/istemci nötr.

import { KATMAN1_MADDE_SAYISI } from "@/lib/onFarkindalik";

export type OFProfil = {
  katman1?: { bloklar?: { kod?: string; puan?: number }[]; enZayif?: string | null };
  katman2?: { acikar?: { kod?: string; gercek?: number }[] };
  katman3?: { ritim?: string; sayilar?: Record<string, number | null> };
  katman5?: {
    ogrenme?: { beceri?: number | null; kitap?: number | null; egitim?: number | null };
    aciklik?: number | null;
  };
  tamamMi?: boolean;
};

export type ElmasGirdi = {
  pid: string;
  ad: string;
  takim: string | null;
  profil: OFProfil | null;
  mini360: { ozAvg: number | null; disAvg: number | null; disSayi: number };
};

export type AltSkor = { k3: number | null; mini360: number | null; k5: number | null; k2: number | null; k1: number | null };

export type ElmasSonuc = {
  pid: string;
  ad: string;
  takim: string | null;
  puanlandi: boolean; // Ön Farkındalık profili var mı
  elmas: number; // 0-100 (tutarlılık çarpanı uygulanmış)
  ham: number; // 0-100 (çarpan öncesi)
  carpan: number; // tutarlılık çarpanı (0.70-1.00)
  alt: AltSkor;
  ritim: string | null;
  disSayi: number;
  korNoktaFarki: number | null; // öz − dış (Mini 360); + = kendini fazla görüyor
  veriTamlik: number; // 0-1 (kaç alt-skorun verisi var)
  aday: boolean;
};

export const ELMAS_AGIRLIK = { k3: 0.35, mini360: 0.25, k5: 0.2, k2: 0.1, k1: 0.1 } as const;
const MIN_DIS = 3; // güvenilir dış algı için en az bu kadar anonim puan
const ADAY_YUZDELIK = 85; // bu yüzdeliğin üstü + temiz tutarlılık = aday
const ADAY_TAMLIK = 0.6; // en az bu kadar alt-skor dolu olmalı

// Katman 3 üretim ağırlıkları: ham aktivite < sonuç. Sonuçlar (ortak/Silver/Gold)
// gerçek lider çıktısı olduğu için daha ağır.
const URETIM_AGIRLIK: Record<string, number> = {
  "k3.ilk_gorusme": 1,
  "k3.birebir_kocluk": 1.5,
  "k3.yeni_ortak": 3,
  "k3.silver": 5,
};

const RITIM_PUAN: Record<string, number> = { duzenli: 100, patlayan: 45, belirsiz: 25 };

function kelepce(x: number, alt: number, ust: number) {
  return Math.max(alt, Math.min(ust, x));
}

// Mid-rank yüzdelik: x'in kohort dağılımındaki konumu (0-100). Beraberlikte yarı
// pay. Boş/tek dağılımda nötr 50 döner.
function yuzdelikSira(x: number, dagilim: number[]): number {
  const n = dagilim.length;
  if (n === 0) return 50;
  let kucuk = 0;
  let esit = 0;
  for (const v of dagilim) {
    if (v < x) kucuk++;
    else if (v === x) esit++;
  }
  return ((kucuk + 0.5 * esit) / n) * 100;
}

// Dizinin p. yüzdelik değeri (lineer interpolasyon).
function yuzdelikDeger(sirali: number[], p: number): number {
  const n = sirali.length;
  if (n === 0) return 0;
  if (n === 1) return sirali[0];
  const idx = (p / 100) * (n - 1);
  const alt = Math.floor(idx);
  const ust = Math.ceil(idx);
  if (alt === ust) return sirali[alt];
  return sirali[alt] + (sirali[ust] - sirali[alt]) * (idx - alt);
}

function uretimHam(p: OFProfil): number | null {
  const s = p.katman3?.sayilar;
  if (!s) return null;
  let varMi = false;
  let toplam = 0;
  for (const [kod, agirlik] of Object.entries(URETIM_AGIRLIK)) {
    const v = s[kod];
    if (typeof v === "number") {
      varMi = true;
      toplam += v * agirlik;
    }
  }
  return varMi ? toplam : null;
}

function ogrenmeHam(p: OFProfil): number | null {
  const o = p.katman5?.ogrenme;
  if (!o) return null;
  const parts = [o.beceri, o.kitap, o.egitim].filter((v): v is number => typeof v === "number");
  return parts.length ? parts.reduce((a, b) => a + b, 0) : null;
}

// Katman 1 azamisi madde sayısından türetilir (set kısalsa eşik kendiliğinden uyar).
const K1_MIN = KATMAN1_MADDE_SAYISI; // her madde en az 1
const K1_MAX = KATMAN1_MADDE_SAYISI * 5; // en çok 5
function k1Skor(p: OFProfil): number | null {
  const b = p.katman1?.bloklar;
  if (!b || b.length < 3) return null;
  const toplam = b.reduce((t, x) => t + (typeof x.puan === "number" ? x.puan : 0), 0);
  return kelepce(((toplam - K1_MIN) / (K1_MAX - K1_MIN)) * 100, 0, 100);
}

function k2Skor(p: OFProfil): number | null {
  const a = p.katman2?.acikar;
  if (!a || !a.length) return null;
  const gercekler = a.map((x) => x.gercek).filter((v): v is number => typeof v === "number");
  if (!gercekler.length) return null;
  const ort = gercekler.reduce((s, v) => s + v, 0) / gercekler.length; // 1-10
  return kelepce(((ort - 1) / 9) * 100, 0, 100);
}

// Tek kohortu skorlar. Yüzdelik normalizasyon, profili olan herkesin dağılımına
// göre yapılır; aday eşiği skor dağılımından türetilir.
export function elmasSkorla(girdiler: ElmasGirdi[]): {
  sonuclar: ElmasSonuc[];
  esik: number | null;
  adaySayisi: number;
  puanlananSayisi: number;
} {
  // Yüzdelik dağılımları (yalnız ilgili katmanı dolduranlardan).
  const uretimDag: number[] = [];
  const ogrenmeDag: number[] = [];
  for (const g of girdiler) {
    if (!g.profil) continue;
    const u = uretimHam(g.profil);
    if (u !== null) uretimDag.push(u);
    const o = ogrenmeHam(g.profil);
    if (o !== null) ogrenmeDag.push(o);
  }

  const sonuclar: ElmasSonuc[] = girdiler.map((g) => {
    if (!g.profil) {
      return {
        pid: g.pid, ad: g.ad, takim: g.takim, puanlandi: false,
        elmas: 0, ham: 0, carpan: 1,
        alt: { k3: null, mini360: null, k5: null, k2: null, k1: null },
        ritim: null, disSayi: g.mini360.disSayi, korNoktaFarki: null, veriTamlik: 0, aday: false,
      };
    }
    const p = g.profil;

    // K3 — Gerçek İş: üretim yüzdeliği + ritim.
    const u = uretimHam(p);
    const ritim = p.katman3?.ritim ?? null;
    let k3: number | null = null;
    if (u !== null) {
      const uretimPuan = yuzdelikSira(u, uretimDag);
      const ritimPuan = RITIM_PUAN[ritim ?? "belirsiz"] ?? 25;
      k3 = kelepce(0.82 * uretimPuan + 0.18 * ritimPuan, 0, 100);
    }

    // Mini 360 — Dış algı (yeterli anonim puan varsa).
    const { ozAvg, disAvg, disSayi } = g.mini360;
    let mini360: number | null = null;
    if (disSayi >= MIN_DIS && disAvg !== null) {
      mini360 = kelepce(((disAvg - 1) / 4) * 100, 0, 100);
    }

    // K5 — Büyüme: öğrenme hızı yüzdeliği + geri bildirime açıklık.
    const o = ogrenmeHam(p);
    const aciklik = p.katman5?.aciklik ?? null;
    let k5: number | null = null;
    const ogrenmePuan = o !== null ? yuzdelikSira(o, ogrenmeDag) : null;
    const aciklikPuan = typeof aciklik === "number" ? kelepce(((aciklik - 1) / 4) * 100, 0, 100) : null;
    if (ogrenmePuan !== null && aciklikPuan !== null) k5 = 0.6 * ogrenmePuan + 0.4 * aciklikPuan;
    else if (ogrenmePuan !== null) k5 = ogrenmePuan;
    else if (aciklikPuan !== null) k5 = aciklikPuan;

    const k2 = k2Skor(p);
    const k1 = k1Skor(p);

    const alt: AltSkor = { k3, mini360, k5, k2, k1 };

    // Ağırlıklı ham skor — eksik alt-skorların ağırlığı yeniden dağıtılır.
    const ciftler: [number | null, number][] = [
      [k3, ELMAS_AGIRLIK.k3], [mini360, ELMAS_AGIRLIK.mini360], [k5, ELMAS_AGIRLIK.k5],
      [k2, ELMAS_AGIRLIK.k2], [k1, ELMAS_AGIRLIK.k1],
    ];
    let agirlikToplam = 0;
    let skorToplam = 0;
    let dolu = 0;
    for (const [s, w] of ciftler) {
      if (s !== null) { skorToplam += s * w; agirlikToplam += w; dolu++; }
    }
    const ham = agirlikToplam > 0 ? skorToplam / agirlikToplam : 0;

    // Tutarlılık çarpanı: öz − dış farkı (ölçülmüş kör nokta).
    let carpan = 1;
    let korNoktaFarki: number | null = null;
    if (disSayi >= MIN_DIS && ozAvg !== null && disAvg !== null) {
      const fark = ozAvg - disAvg;
      korNoktaFarki = Math.round(fark * 100) / 100;
      if (fark > 1) carpan = kelepce(1 - (fark - 1) * 0.15, 0.7, 1);
    }

    const elmas = Math.round(ham * carpan);
    const veriTamlik = dolu / 5;

    return {
      pid: g.pid, ad: g.ad, takim: g.takim, puanlandi: true,
      elmas, ham: Math.round(ham), carpan: Math.round(carpan * 100) / 100,
      alt, ritim, disSayi, korNoktaFarki, veriTamlik, aday: false,
    };
  });

  // Aday eşiği: yeterli veriye sahip puanlananların skor dağılımının üst yüzdeliği.
  const uygun = sonuclar.filter((s) => s.puanlandi && s.veriTamlik >= ADAY_TAMLIK);
  const skorlar = uygun.map((s) => s.elmas).sort((a, b) => a - b);
  const esik = skorlar.length ? Math.round(yuzdelikDeger(skorlar, ADAY_YUZDELIK)) : null;
  let adaySayisi = 0;
  if (esik !== null) {
    for (const s of sonuclar) {
      if (s.puanlandi && s.veriTamlik >= ADAY_TAMLIK && s.elmas >= esik && s.carpan >= 0.85) {
        s.aday = true;
        adaySayisi++;
      }
    }
  }

  sonuclar.sort((a, b) => {
    if (a.puanlandi !== b.puanlandi) return a.puanlandi ? -1 : 1;
    return b.elmas - a.elmas;
  });

  return { sonuclar, esik, adaySayisi, puanlananSayisi: sonuclar.filter((s) => s.puanlandi).length };
}

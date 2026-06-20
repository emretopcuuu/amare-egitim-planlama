// AYNA EŞİ — tamamlayıcı akran eşleştirmesinin çekirdek mantığı (saf fonksiyonlar).
// Mevcut 360 puanlarından her kişinin 10 özellikte "dış" (akran) ortalaması
// çıkarılır; güçlü/zayıf profiller belirlenir; A'nın güçlü olduğu = B'nin zayıf
// olduğu (ve tersi) olan FARKLI ekip çiftleri 3 tura yerleştirilir.

export const TRAIT_ADLARI: Record<number, string> = {
  1: "Örnek Olmak",
  2: "Çalışkanlık",
  3: "Dürüstlük",
  4: "Vizyonerlik",
  5: "Mütevazılık",
  6: "Takım Ruhu",
  7: "İletişim Gücü",
  8: "Cesaret",
  9: "Sorumluluk Alma",
  10: "Pozitif Enerji",
};

// Bir özellikte GÜÇLÜ birine, ondan öğrenmek için sorulacak sorular.
export const SORU_BANKASI: Record<number, string[]> = {
  1: ["Zor anlarda duruşunu nasıl koruyorsun?", "Söylediğini önce kendin yaşamak için ne yapıyorsun?"],
  2: ["Kendini nasıl çalıştırıyorsun, disiplinini nasıl kuruyorsun?", "Yorgunken bile devam etmeni sağlayan ne?"],
  3: ["Hatanı açıkça kabul etmeyi nasıl başarıyorsun?", "Sözünle davranışını tutarlı tutmak için ne yapıyorsun?"],
  4: ["Büyük resmi nasıl görüyorsun, geleceği nasıl kuruyorsun?", "Hedefini başkalarına nasıl heyecanla anlatıyorsun?"],
  5: ["Başarıyı paylaşmayı nasıl öğrendin?", "Konuşmaktan çok dinlemek için ne yapıyorsun?"],
  6: ["Zorlanan ekip arkadaşına nasıl destek oluyorsun?", "Ortak işte kendini nasıl konumlandırıyorsun?"],
  7: ["Derdini sade ve net anlatmak için ne yapıyorsun?", "Karşındakine göre dilini nasıl ayarlıyorsun?"],
  8: ["Korktuğun halde ilk adımı nasıl atıyorsun?", "Reddedilmeyi nasıl karşılayıp devam ediyorsun?"],
  9: ["Bir işi nasıl sahipleniyorsun, ne zaman 'bu benim' diyorsun?", "Beklemeden harekete geçmeni sağlayan ne?"],
  10: ["Ortama enerjiyi nasıl katıyorsun?", "Yorgunken çevreni nasıl ayağa kaldırıyorsun?"],
};

export const SLOTLAR = ["21:00", "21:50", "22:40"] as const;
const TUR_SAYISI = 3;
const EN_AZ_PUAN = 3; // yeterli veri eşiği (toplam akran puanı)

export type Katilimci = { id: string; full_name: string; team: string | null };
export type RatingSatir = {
  target_id: string;
  trait_id: number;
  score: number;
  is_self: boolean | null;
  is_hidden: boolean;
};

export type Profil = {
  id: string;
  ad: string;
  takim: string | null;
  dis: Record<number, number>; // trait_id -> akran ortalaması
  gucluler: number[]; // en yüksek 3 özellik (trait_id)
  zayiflar: number[]; // en düşük 3 özellik (trait_id)
};

export type Eslesme = {
  tur: number;
  slot: string;
  aId: string;
  bId: string;
  aVerir: number; // A'nın B'ye güçlü olduğu trait_id
  bVerir: number; // B'nin A'ya güçlü olduğu trait_id
};

// Her kişi için 10 özellikte akran (dış) ortalaması + güçlü/zayıf profil.
// Yeterli veri olmayanlar (toplam akran puanı < EN_AZ_PUAN) elenir.
export function profilleriHesapla(
  katilimcilar: Katilimci[],
  ratings: RatingSatir[],
  enAzPuan = EN_AZ_PUAN
): Profil[] {
  // target_id -> trait_id -> {toplam, adet}
  const harita = new Map<string, Map<number, { t: number; n: number }>>();
  for (const r of ratings) {
    if (r.is_self || r.is_hidden) continue;
    if (r.trait_id == null || r.score == null) continue;
    let traitMap = harita.get(r.target_id);
    if (!traitMap) {
      traitMap = new Map();
      harita.set(r.target_id, traitMap);
    }
    const k = traitMap.get(r.trait_id) ?? { t: 0, n: 0 };
    k.t += r.score;
    k.n += 1;
    traitMap.set(r.trait_id, k);
  }

  const profiller: Profil[] = [];
  for (const k of katilimcilar) {
    const traitMap = harita.get(k.id);
    if (!traitMap) continue;
    const dis: Record<number, number> = {};
    let toplamAdet = 0;
    for (const [tid, { t, n }] of traitMap) {
      dis[tid] = t / n;
      toplamAdet += n;
    }
    if (toplamAdet < enAzPuan) continue;
    const sirali = Object.keys(dis)
      .map(Number)
      .sort((x, y) => dis[y] - dis[x]);
    profiller.push({
      id: k.id,
      ad: k.full_name,
      takim: k.team,
      dis,
      gucluler: sirali.slice(0, 3),
      zayiflar: sirali.slice(-3).reverse(),
    });
  }
  return profiller;
}

// A ile B ne kadar birbirini besler? aVerir = A'nın güçlü, B'nin zayıf olduğu
// en belirgin özellik; bVerir = tersi. skor = iki yöndeki açığın toplamı.
// Her iki yön de pozitif değilse (tek taraflı) null döner.
export function tamamlayicilik(
  a: Profil,
  b: Profil
): { skor: number; aVerir: number; bVerir: number } | null {
  const ortakTraitler = new Set([...Object.keys(a.dis), ...Object.keys(b.dis)].map(Number));
  let aVerir = -1;
  let aEnIyi = 0;
  let bVerir = -1;
  let bEnIyi = 0;
  for (const t of ortakTraitler) {
    const av = a.dis[t];
    const bv = b.dis[t];
    if (av == null || bv == null) continue;
    const aFark = av - bv; // A bu özellikte ne kadar daha güçlü
    if (aFark > aEnIyi) {
      aEnIyi = aFark;
      aVerir = t;
    }
    const bFark = bv - av;
    if (bFark > bEnIyi) {
      bEnIyi = bFark;
      bVerir = t;
    }
  }
  if (aVerir < 0 || bVerir < 0) return null; // çift yönlü tamamlayıcılık yok
  return { skor: aEnIyi + bEnIyi, aVerir, bVerir };
}

function ciftAnahtar(x: string, y: string): string {
  return x < y ? `${x}|${y}` : `${y}|${x}`;
}

// 3 tur eşleştirme: her turda kişi tek bir eşle; turlar arası tekrar yok;
// yalnız FARKLI ekipler; tamamlayıcılığı yüksek çiftler önce. Açgözlü ama
// ~150 kişide pratikte optimumun çok yakını.
export function turlariOlustur(
  profiller: Profil[],
  turSayisi = TUR_SAYISI,
  slotlar: readonly string[] = SLOTLAR
): Eslesme[] {
  // Tüm farklı-ekip aday kenarları + tamamlayıcılık skoru.
  type Kenar = { a: Profil; b: Profil; skor: number; aVerir: number; bVerir: number };
  const kenarlar: Kenar[] = [];
  for (let i = 0; i < profiller.length; i++) {
    for (let j = i + 1; j < profiller.length; j++) {
      const a = profiller[i];
      const b = profiller[j];
      if (a.takim && b.takim && a.takim === b.takim) continue; // farklı ekip şartı
      const tc = tamamlayicilik(a, b);
      if (!tc || tc.skor <= 0) continue;
      kenarlar.push({ a, b, skor: tc.skor, aVerir: tc.aVerir, bVerir: tc.bVerir });
    }
  }
  kenarlar.sort((x, y) => y.skor - x.skor);

  const kullanildi = new Set<string>(); // turlar arası tekrar engeli
  const eslesmeler: Eslesme[] = [];
  for (let tur = 1; tur <= turSayisi; tur++) {
    const dolu = new Set<string>(); // bu turda eşleşmiş kişiler
    const slot = slotlar[tur - 1] ?? slotlar[slotlar.length - 1];
    for (const k of kenarlar) {
      if (dolu.has(k.a.id) || dolu.has(k.b.id)) continue;
      const anahtar = ciftAnahtar(k.a.id, k.b.id);
      if (kullanildi.has(anahtar)) continue;
      kullanildi.add(anahtar);
      dolu.add(k.a.id);
      dolu.add(k.b.id);
      eslesmeler.push({
        tur,
        slot,
        aId: k.a.id,
        bId: k.b.id,
        aVerir: k.aVerir,
        bVerir: k.bVerir,
      });
    }
  }
  return eslesmeler;
}

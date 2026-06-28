// ÖN FARKINDALIK — Kamp öncesi "Ayna/Kalibrasyon" çalışması (Pusula'nın kardeşi).
// 5 katman + Sonuç Kartı. Algı (kendini nasıl görüyorsun) ile gerçeği (davranış/
// veri) yan yana koyar; kişiye özel görev motorunun yakıtıdır.
//
// İlke: her ekranda TEK ifade, büyük dokunma hedefi, kademe kademe, kısmi kayıt.
// Ters maddeler kişiye gösterilmez; puanlama SUNUCUDA yapılır (düz-çizgi cevabı kırar).
//
// NOT: Soru seti bilinçli olarak kısa tutulur (tekrar eden / aynı amaca hizmet
// eden maddeler ayıklanmıştır). Eşikler madde sayısından türetilir — set
// değişse bile skorlama bozulmaz.

export type Olcek = 1 | 2 | 3 | 4 | 5;

export type Madde = {
  kod: string; // ör. "k1.oz_saygi.2"
  metin: string;
  ters?: boolean; // tersten puanlanır (6 - değer)
};

export type Blok = {
  kod: "oz_saygi" | "oz_guven" | "oz_yeterlilik";
  ad: string;
  aciklama: string;
  maddeler: Madde[];
};

// Katman 1 — Liderlik Pusulası. Üç blok × beş madde (3 düz + 2 ters). Metinler ölçekten.
export const KATMAN1_BLOKLAR: Blok[] = [
  {
    kod: "oz_saygi",
    ad: "Öz Saygı",
    aciklama:
      "Son birkaç ayını düşün. İçinden geçeni değil, gerçekten yaptığını işaretle.",
    maddeler: [
      { kod: "k1.oz_saygi.1", metin: "Kendi koyduğum standardın altına düştüğümde fark eder, düzeltirim." },
      { kod: "k1.oz_saygi.4", metin: "Değerimin, başkalarının onayına bağlı olmadığını hissederim." },
      { kod: "k1.oz_saygi.5", metin: "Onaylanmadığımda kendimi sorgulamaya başlarım.", ters: true },
      { kod: "k1.oz_saygi.7", metin: "Net sınır koyarım ve sınırlarıma sahip çıkarım." },
      { kod: "k1.oz_saygi.9", metin: "İnsanları kırmamak için kendi hedefimden vazgeçtiğim olur.", ters: true },
    ],
  },
  {
    kod: "oz_guven",
    ad: "Öz Güven",
    aciklama: "Zorlukların ve fırsatların karşısındaki duruşunu düşün.",
    maddeler: [
      { kod: "k1.oz_guven.1", metin: "Benden güçlü insanların yanında küçülmeden durabilirim." },
      { kod: "k1.oz_guven.2", metin: "Başarısız görünmemek için bazı fırsatlara hiç girmem.", ters: true },
      { kod: "k1.oz_guven.3", metin: "Büyük bir hedefi yüksek sesle söylemekten çekinmem." },
      { kod: "k1.oz_guven.7", metin: "Bir işi ilk kez yapacak olsam bile başlayabilirim." },
      { kod: "k1.oz_guven.8", metin: "Hata yapma ihtimali beni harekete geçmekten alıkoyar.", ters: true },
    ],
  },
  {
    kod: "oz_yeterlilik",
    ad: "Öz Yeterlilik",
    aciklama: "Bir işi sonuca götürme gücüne dair gerçek davranışını düşün.",
    maddeler: [
      { kod: "k1.oz_yeterlilik.1", metin: "Gerekeni yaparsam istediğim sonuca ulaşabileceğime inanırım." },
      { kod: "k1.oz_yeterlilik.3", metin: "Zorlandığım bir beceriyi öğrenene kadar üzerinde dururum." },
      { kod: "k1.oz_yeterlilik.5", metin: "İşler kötü gittiğinde “elimden bir şey gelmez” hissine kapılırım.", ters: true },
      { kod: "k1.oz_yeterlilik.7", metin: "Başladığım işi, motivasyonum düşse bile bitiririm." },
      { kod: "k1.oz_yeterlilik.8", metin: "Yeni ve zor bir görev verildiğinde önce yapamayacağımı düşünürüm.", ters: true },
    ],
  },
];

export const KATMAN1_MADDELER: Madde[] = KATMAN1_BLOKLAR.flatMap((b) => b.maddeler);
export const KATMAN1_KODLAR = new Set(KATMAN1_MADDELER.map((m) => m.kod));
// Madde sayısı (eşik/normalizasyon bundan türetilir — set değişince kendiliğinden uyar).
export const KATMAN1_MADDE_SAYISI = KATMAN1_MADDELER.length;
const TERS_KODLAR = new Set(KATMAN1_MADDELER.filter((m) => m.ters).map((m) => m.kod));

// Tek maddenin etkin puanı (ters maddede 6 - değer).
export function maddePuani(kod: string, deger: Olcek): number {
  return TERS_KODLAR.has(kod) ? 6 - deger : deger;
}

export type BlokSonuc = {
  kod: Blok["kod"];
  ad: string;
  puan: number; // blok toplamı (madde sayısı × 1..5)
  bant: "guclu" | "orta" | "kirilgan";
};

// Bant eşikleri blok azamisinden türetilir: %80+ güçlü, %60+ orta, altı kırılgan.
function bant(puan: number, azami: number): BlokSonuc["bant"] {
  if (puan >= azami * 0.8) return "guclu";
  if (puan >= azami * 0.6) return "orta";
  return "kirilgan";
}

// Katman 1 puanlaması: blok blok toplam + en zayıf alan (liderlik kasının
// en kırılgan noktası — saha başarısızlıklarının çoğu burada başlar).
export function katman1Hesapla(
  yanitlar: Record<string, number>
): { bloklar: BlokSonuc[]; enZayif: Blok["kod"] | null; tamamMi: boolean } {
  const bloklar: BlokSonuc[] = KATMAN1_BLOKLAR.map((b) => {
    const puan = b.maddeler.reduce((t, m) => {
      const d = yanitlar[m.kod];
      return t + (d ? maddePuani(m.kod, d as Olcek) : 0);
    }, 0);
    return { kod: b.kod, ad: b.ad, puan, bant: bant(puan, b.maddeler.length * 5) };
  });
  const tamamMi = KATMAN1_MADDELER.every((m) => yanitlar[m.kod]);
  const enZayif = tamamMi
    ? bloklar.reduce((a, b) => (b.puan < a.puan ? b : a)).kod
    : null;
  return { bloklar, enZayif, tamamMi };
}

// #10 Veri dürüstlüğü: Katman 1 HAM yanıtlarının varyansı. Ters maddeler
// sayesinde düz-çizgi cevap (hep aynı şık) DÜŞÜK varyans verir — düşünmeden
// doldurma sinyali. Düşünülmüş, ayrıştırılmış cevap yüksek varyans üretir.
export function katman1Tutarlilik(
  yanitlar: Record<string, number>
): { dolu: number; stdev: number; dusukVaryans: boolean } {
  const degerler = KATMAN1_MADDELER.map((m) => yanitlar[m.kod]).filter(
    (v): v is number => v !== undefined
  );
  if (degerler.length < KATMAN1_MADDELER.length) {
    return { dolu: degerler.length, stdev: 1, dusukVaryans: false };
  }
  const ort = degerler.reduce((a, b) => a + b, 0) / degerler.length;
  const varyans = degerler.reduce((a, b) => a + (b - ort) ** 2, 0) / degerler.length;
  const stdev = Math.sqrt(varyans);
  return { dolu: degerler.length, stdev: Math.round(stdev * 100) / 100, dusukVaryans: stdev < 0.6 };
}

// ============================================================================
// KATMAN 2 — Liderlik Açık Analizi: her başlık için "Önem" (1-10) ve "Son 30
// günde gerçekte" (1-10). Açık = Önem − Gerçek. En büyük iki açık = kampta
// üzerine gidilecek alanlar. (Katman 3 sayımlarıyla örtüşen başlıklar elendi.)
// ============================================================================

export type Katman2Baslik = { kod: string; ad: string; anlam: string };

export const KATMAN2_BASLIKLAR: Katman2Baslik[] = [
  { kod: "takip", ad: "Takip", anlam: "Bağ kurduğun kişiyle iletişimi koparmadan, değer vererek takipte kalmak." },
  { kod: "yeni_lider", ad: "Yeni lider geliştirme", anlam: "Kendi yerine geçebilecek, kendi başına üreten lider yetiştirmek." },
  { kod: "zor_konusma", ad: "Zor konuşmalar", anlam: "Zor konuyu ertelemeden, net ama kırmadan konuşmak." },
  { kod: "ekip_kocluk", ad: "Ekip koçluğu", anlam: "Kişinin önündeki engeli görüp onunla birebir çalışıp geliştirmek." },
];

export type AcikSonuc = { kod: string; ad: string; onem: number; gercek: number; acik: number };

export function katman2Hesapla(
  yanitlar: Record<string, number>
): { acikar: AcikSonuc[]; enBuyukIki: AcikSonuc[]; tamamMi: boolean } {
  const acikar: AcikSonuc[] = KATMAN2_BASLIKLAR.map((b) => {
    const onem = yanitlar[`k2.${b.kod}.onem`] ?? 0;
    const gercek = yanitlar[`k2.${b.kod}.gercek`] ?? 0;
    return { kod: b.kod, ad: b.ad, onem, gercek, acik: onem - gercek };
  });
  const tamamMi = KATMAN2_BASLIKLAR.every(
    (b) => yanitlar[`k2.${b.kod}.onem`] && yanitlar[`k2.${b.kod}.gercek`]
  );
  const enBuyukIki = [...acikar].sort((a, b) => b.acik - a.acik).slice(0, 2);
  return { acikar, enBuyukIki, tamamMi };
}

// ============================================================================
// KATMAN 3 — Liderlik Gerçeklik Kontrolü: görüş değil, sadece rakam (arka
// ofisten doğrulanabilir). Aktivite sayıları + ritim. Algıyı değil davranışı
// ölçer. (Birbiriyle örtüşen sayımlar elendi: huni + gelişim + sonuç + ritim.)
// ============================================================================

export type Katman3Soru = { kod: string; metin: string; max: number };

export const KATMAN3_AKTIVITE: Katman3Soru[] = [
  { kod: "k3.ilk_gorusme", metin: "Son 30 günde kaç yeni kişiyle ilk görüşme yaptın?", max: 999 },
  { kod: "k3.birebir_kocluk", metin: "Kaç kişiyle birebir (koçluk) çalıştın?", max: 999 },
];

export const KATMAN3_RITIM: Katman3Soru[] = [
  { kod: "k3.gelir_gun", metin: "Son 30 günün kaçında gelir getirici bir aktivite yaptın? (0-30)", max: 30 },
  { kod: "k3.uzak_gun", metin: "En uzun kaç gün üst üste sahadan tamamen uzak kaldın?", max: 30 },
];

export const KATMAN3_SORULAR: Katman3Soru[] = [...KATMAN3_AKTIVITE, ...KATMAN3_RITIM];

export function katman3Hesapla(yanitlar: Record<string, number>): {
  ritim: "duzenli" | "patlayan" | "belirsiz";
  tamamMi: boolean;
} {
  const tamamMi = KATMAN3_SORULAR.every((s) => yanitlar[s.kod] !== undefined);
  const gelirGun = yanitlar["k3.gelir_gun"] ?? 0;
  const uzakGun = yanitlar["k3.uzak_gun"] ?? 0;
  // Ritim: çok gün aktif + kısa kopuş = düzenli; az gün + uzun kopuş = patlayıp sönen.
  let ritim: "duzenli" | "patlayan" | "belirsiz" = "belirsiz";
  if (tamamMi) ritim = gelirGun >= 15 && uzakGun <= 5 ? "duzenli" : "patlayan";
  return { ritim, tamamMi };
}

// ============================================================================
// KATMAN 4 — Kör Nokta Haritası: puan yok, yazılı. Seni sabote eden görünmez
// inanç. Dört madde de zorunlu (hedef → ters davranış → kalkan → varsayım).
// ============================================================================

export type MetinSoru = { kod: string; metin: string; zorunlu: boolean };

export const KATMAN4_SORULAR: MetinSoru[] = [
  { kod: "k4.hedef", metin: "Önümüzdeki 12 ayda gerçekten ulaşmak istediğin sonuç ya da kariyer nedir?", zorunlu: true },
  { kod: "k4.ters_davranis", metin: "Bu hedefe ters düşen, yapman gerektiğini bildiğin halde yapmadığın davranış nedir?", zorunlu: true },
  { kod: "k4.kalkan", metin: "Bu davranışı sürdürmek seni neyden koruyor? Hangi korku ya da riski senden uzak tutuyor?", zorunlu: true },
  { kod: "k4.varsayim", metin: "Seni durduran gizli inanç: “Eğer ___ yaparsam, ___ olur.” Bu cümleyi kendine göre tamamla.", zorunlu: true },
];

// ============================================================================
// KATMAN 5 — Büyüme Katsayısı: öğrenme hızı (sayı) + geri bildirime açıklık
// (1-5) + yansıma (yazılı). Diamond'ın gerçek yakıtı: bugünkü değil, hız.
// ============================================================================

export const KATMAN5A_SORULAR: Katman3Soru[] = [
  { kod: "k5a.egitim", metin: "Son 12 ayda kaç eğitim, seminer ya da kursu tamamladın?", max: 999 },
];

export const KATMAN5B_MADDELER: Madde[] = [
  { kod: "k5b.1", metin: "Geri bildirimi savunmaya geçmeden dinleyebilirim." },
  { kod: "k5b.4", metin: "Beni zorlayan bir geri bildirimi davranışıma dönüştürürüm." },
];

export const KATMAN5C_SORULAR: MetinSoru[] = [
  { kod: "k5c.2", metin: "Son bir yılda değiştirdiğin bir davranış var mı? Yaz.", zorunlu: false },
];

// ============================================================================
// SONUÇ KARTI — kişi tek cümleyle doldurur. Profilden öneriyle pre-fill edilir.
// ============================================================================

export const SONUC_KARTI: MetinSoru[] = [
  { kod: "sonuc.guclu", metin: "Kendini güçlü gördüğün yönler neler? Biraz bunlardan bahset.", zorunlu: true },
  { kod: "sonuc.kor_nokta", metin: "Kör Noktan nedir? Seni en çok zorlayan, fark etmen gereken yanını tek cümleyle yaz.", zorunlu: true },
  { kod: "sonuc.kamp_gorevi", metin: "Kamp Görevin: bu kamp boyunca atacağın, başkalarının da görebileceği iki somut adım.", zorunlu: true },
];

// ============================================================================
// MINI 360 — Ekip Aynası (opt-in). Aynı 6 ifade: kişi kendine, ekip üyeleri
// anonim puanlar (1-5). Sen-ekip farkı = ölçülmüş kör nokta.
// ============================================================================

export type Mini360Ifade = { kod: "m1" | "m2" | "m3" | "m4" | "m5" | "m6"; oz: string; dis: string };

export const MINI360_IFADELER: Mini360Ifade[] = [
  { kod: "m1", oz: "Güvenilirimdir, söz verdiğimi yaparım.", dis: "Güvenilirdir, söz verdiğini yapar." },
  { kod: "m2", oz: "Sorumluluğu üstlenirim, suçu dışarı atmam.", dis: "Sorumluluğu üstlenir, suçu dışarı atmaz." },
  { kod: "m3", oz: "Zor konuşmaları ertelemem, yüzleşirim.", dis: "Zor konuşmaları ertelemez, yüzleşir." },
  { kod: "m4", oz: "İnsan yetiştiririm, kendi yerime lider bırakırım.", dis: "İnsan yetiştirir, kendi yerine lider bırakır." },
  { kod: "m5", oz: "Davranışımla örnek olurum.", dis: "Davranışıyla örnek olur." },
  { kod: "m6", oz: "Çevremdekileri daha iyi versiyonu olmaya teşvik ederim.", dis: "Çevresindekileri daha iyi versiyonu olmaya teşvik eder." },
];

const METIN_KODLAR = new Set<string>([
  ...KATMAN4_SORULAR.map((s) => s.kod),
  ...KATMAN5C_SORULAR.map((s) => s.kod),
  ...SONUC_KARTI.map((s) => s.kod),
]);
const ZORUNLU_METIN = new Set<string>([
  ...KATMAN4_SORULAR.filter((s) => s.zorunlu).map((s) => s.kod),
  ...SONUC_KARTI.filter((s) => s.zorunlu).map((s) => s.kod),
]);
export const METIN_MAX = 600;

// ============================================================================
// BİRLEŞİK AKIŞ — sihirbazın adım adım gezdiği liste (Katman 1→2→3→4→5→Sonuç).
// ============================================================================

export type Adim =
  | { tip: "likert5"; kod: string; grup: string; metin: string }
  | { tip: "ikili10"; grup: string; ad: string; anlam: string; onemKod: string; gercekKod: string }
  | { tip: "sayi"; kod: string; grup: string; metin: string; max: number }
  | { tip: "metin"; kod: string; grup: string; metin: string; zorunlu: boolean };

export const ADIMLAR: Adim[] = [
  ...KATMAN1_BLOKLAR.flatMap((b) =>
    b.maddeler.map((m): Adim => ({ tip: "likert5", kod: m.kod, grup: b.ad, metin: m.metin }))
  ),
  ...KATMAN2_BASLIKLAR.map(
    (b): Adim => ({
      tip: "ikili10",
      grup: "Liderlik Açığı",
      ad: b.ad,
      anlam: b.anlam,
      onemKod: `k2.${b.kod}.onem`,
      gercekKod: `k2.${b.kod}.gercek`,
    })
  ),
  ...KATMAN3_SORULAR.map(
    (s): Adim => ({ tip: "sayi", kod: s.kod, grup: "Gerçeklik", metin: s.metin, max: s.max })
  ),
  ...KATMAN4_SORULAR.map(
    (s): Adim => ({ tip: "metin", kod: s.kod, grup: "Kör Nokta", metin: s.metin, zorunlu: s.zorunlu })
  ),
  ...KATMAN5A_SORULAR.map(
    (s): Adim => ({ tip: "sayi", kod: s.kod, grup: "Büyüme", metin: s.metin, max: s.max })
  ),
  ...KATMAN5B_MADDELER.map(
    (m): Adim => ({ tip: "likert5", kod: m.kod, grup: "Büyüme", metin: m.metin })
  ),
  ...KATMAN5C_SORULAR.map(
    (s): Adim => ({ tip: "metin", kod: s.kod, grup: "Büyüme", metin: s.metin, zorunlu: s.zorunlu })
  ),
  ...SONUC_KARTI.map(
    (s): Adim => ({ tip: "metin", kod: s.kod, grup: "Sonuç Kartı", metin: s.metin, zorunlu: s.zorunlu })
  ),
];

// Bir adım tamamlandı mı. ikili10 iki kodu ister; opsiyonel metin boş geçilebilir.
export function adimDolu(a: Adim, sayilar: Record<string, number>, metinler: Record<string, string>): boolean {
  if (a.tip === "ikili10") return sayilar[a.onemKod] !== undefined && sayilar[a.gercekKod] !== undefined;
  if (a.tip === "metin") return a.zorunlu ? !!(metinler[a.kod] ?? "").trim() : true;
  return sayilar[a.kod] !== undefined;
}

export function metinKodMu(kod: string): boolean {
  return METIN_KODLAR.has(kod);
}

// Sayısal yanıt değeri geçerli mi (kod'a göre aralık).
export function gecerliYanit(kod: string, deger: number): boolean {
  if (!Number.isInteger(deger)) return false;
  if (kod.startsWith("k1.") || kod.startsWith("k5b.")) return deger >= 1 && deger <= 5;
  if (kod.startsWith("k2.")) return deger >= 1 && deger <= 10;
  if (kod.startsWith("k3.")) {
    const soru = KATMAN3_SORULAR.find((s) => s.kod === kod);
    return deger >= 0 && deger <= (soru?.max ?? 999);
  }
  if (kod.startsWith("k5a.")) return deger >= 0 && deger <= 999;
  return false;
}

// Katman 5 özeti: öğrenme hızı (ham sayılar) + geri bildirime açıklık ortalaması.
function katman5Hesapla(sayilar: Record<string, number>) {
  const aciklikMaddeler = KATMAN5B_MADDELER.map((m) => sayilar[m.kod]).filter((v) => v !== undefined);
  const aciklik = aciklikMaddeler.length
    ? Math.round((aciklikMaddeler.reduce((a, b) => a + b, 0) / aciklikMaddeler.length) * 10) / 10
    : null;
  return {
    ogrenme: {
      beceri: sayilar["k5a.beceri"] ?? null,
      egitim: sayilar["k5a.egitim"] ?? null,
    },
    aciklik, // 1-5 ortalama
  };
}

// Tüm katmanları profile damıtır (kişiye özel görev motorunun yakıtı).
export function profilHesapla(
  sayilar: Record<string, number>,
  metinler: Record<string, string> = {}
) {
  const k1 = katman1Hesapla(sayilar);
  const k2 = katman2Hesapla(sayilar);
  const k3 = katman3Hesapla(sayilar);
  const k5 = katman5Hesapla(sayilar);

  const sayiTamam =
    k1.tamamMi &&
    k2.tamamMi &&
    k3.tamamMi &&
    KATMAN5A_SORULAR.every((s) => sayilar[s.kod] !== undefined) &&
    KATMAN5B_MADDELER.every((m) => sayilar[m.kod] !== undefined);
  const metinTamam = [...ZORUNLU_METIN].every((k) => (metinler[k] ?? "").trim());

  return {
    katman1: { bloklar: k1.bloklar, enZayif: k1.enZayif },
    // #10 Veri dürüstlüğü sinyali (admin/şeffaflık için profile mühürlenir).
    guven: katman1Tutarlilik(sayilar),
    katman2: { acikar: k2.acikar, enBuyukIki: k2.enBuyukIki },
    katman3: {
      ritim: k3.ritim,
      sayilar: Object.fromEntries(KATMAN3_SORULAR.map((s) => [s.kod, sayilar[s.kod] ?? null])),
    },
    katman4: Object.fromEntries(KATMAN4_SORULAR.map((s) => [s.kod, metinler[s.kod] ?? null])),
    katman5: { ...k5, yansima: Object.fromEntries(KATMAN5C_SORULAR.map((s) => [s.kod, metinler[s.kod] ?? null])) },
    sonucKarti: Object.fromEntries(SONUC_KARTI.map((s) => [s.kod, metinler[s.kod] ?? null])),
    tamamMi: sayiTamam && metinTamam,
  };
}

// Sonuç Kartı için profilden tek cümlelik öneriler (pre-fill).
export function sonucOnerileri(sayilar: Record<string, number>): Record<string, string> {
  const k1 = katman1Hesapla(sayilar);
  const k2 = katman2Hesapla(sayilar);
  const guclu = k1.bloklar.reduce((a, b) => (b.puan > a.puan ? b : a), k1.bloklar[0]);
  const zayif = k1.enZayif ? k1.bloklar.find((b) => b.kod === k1.enZayif) : null;
  const enAcik = k2.enBuyukIki[0];
  return {
    "sonuc.guclu": guclu ? `En güçlü alanım ${guclu.ad}.` : "",
    "sonuc.kor_nokta":
      zayif && enAcik
        ? `${zayif.ad} alanım kırılgan ve "${enAcik.ad}" başlığında söylediğimle yaptığım arasında büyük açık var.`
        : "",
    "sonuc.kamp_gorevi": "",
  };
}

// ÖN FARKINDALIK — Kamp öncesi "Ayna/Kalibrasyon" çalışması (Pusula'nın kardeşi).
// Bu dosya YALNIZCA Katman 1'i (Liderlik Pusulası: Öz Saygı / Öz Güven /
// Öz Yeterlilik) tanımlar. Sonraki katmanlar (2-5, Mini 360) ayrı fazlarda eklenir.
//
// İlke: her ekranda TEK ifade, büyük 1-5 buton, kademe kademe, kısmi kayıt.
// Ters maddeler kişiye gösterilmez; puanlama SUNUCUDA yapılır (düz-çizgi cevabı kırar).

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

// Katman 1 — Liderlik Pusulası. Üç blok × on madde. Metinler birebir ölçekten.
export const KATMAN1_BLOKLAR: Blok[] = [
  {
    kod: "oz_saygi",
    ad: "Öz Saygı",
    aciklama:
      "Son birkaç ayını düşün. İçinden geçeni değil, gerçekten yaptığını işaretle.",
    maddeler: [
      { kod: "k1.oz_saygi.1", metin: "Kendi koyduğum standardın altına düştüğümde fark eder, düzeltirim." },
      { kod: "k1.oz_saygi.2", metin: "İnsanları kaybetmemek için bazen sınırlarımı esnetirim.", ters: true },
      { kod: "k1.oz_saygi.3", metin: "Bana saygısız davranıldığında sessizce geçiştirmem." },
      { kod: "k1.oz_saygi.4", metin: "Değerimin, başkalarının onayına bağlı olmadığını hissederim." },
      { kod: "k1.oz_saygi.5", metin: "Onaylanmadığımda kendimi sorgulamaya başlarım.", ters: true },
      { kod: "k1.oz_saygi.6", metin: "Sözümü tutmadığımda kılıf uydurmam, kendimle yüzleşirim." },
      { kod: "k1.oz_saygi.7", metin: "Net sınır koyarım ve sınırlarıma sahip çıkarım." },
      { kod: "k1.oz_saygi.8", metin: "Hayır demem gerektiğinde suçluluk duymadan hayır derim." },
      { kod: "k1.oz_saygi.9", metin: "İnsanları kırmamak için kendi hedefimden vazgeçtiğim olur.", ters: true },
      { kod: "k1.oz_saygi.10", metin: "Başarımı abartmadan, küçümsemeden sahiplenebilirim." },
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
      { kod: "k1.oz_guven.4", metin: "Reddedildiğimde geri çekilmem, ertesi gün yine sahadayım." },
      { kod: "k1.oz_guven.5", metin: "Eleştiri aldığımda önce savunmaya geçerim.", ters: true },
      { kod: "k1.oz_guven.6", metin: "Başarılı insanlara ulaşmayı gözümde büyütmem." },
      { kod: "k1.oz_guven.7", metin: "Bir işi ilk kez yapacak olsam bile başlayabilirim." },
      { kod: "k1.oz_guven.8", metin: "Hata yapma ihtimali beni harekete geçmekten alıkoyar.", ters: true },
      { kod: "k1.oz_guven.9", metin: "Kalabalık önünde fikrimi net savunabilirim." },
      { kod: "k1.oz_guven.10", metin: "Ekibimdeki güçlü birinin beni geçmesinden rahatsız olmam." },
    ],
  },
  {
    kod: "oz_yeterlilik",
    ad: "Öz Yeterlilik",
    aciklama: "Bir işi sonuca götürme gücüne dair gerçek davranışını düşün.",
    maddeler: [
      { kod: "k1.oz_yeterlilik.1", metin: "Gerekeni yaparsam sonucu üretebileceğime inanırım." },
      { kod: "k1.oz_yeterlilik.2", metin: "Plan bozulduğunda bazen tamamen bırakırım.", ters: true },
      { kod: "k1.oz_yeterlilik.3", metin: "Zorlandığım bir beceriyi öğrenene kadar üzerinde dururum." },
      { kod: "k1.oz_yeterlilik.4", metin: "Bir hedefi küçük adımlara bölüp ilerleyebilirim." },
      { kod: "k1.oz_yeterlilik.5", metin: "İşler kötü gittiğinde “elimden bir şey gelmez” hissine kapılırım.", ters: true },
      { kod: "k1.oz_yeterlilik.6", metin: "Yeni bir duruma hızla uyum sağlayabilirim." },
      { kod: "k1.oz_yeterlilik.7", metin: "Başladığım işi, motivasyonum düşse bile bitiririm." },
      { kod: "k1.oz_yeterlilik.8", metin: "Yeni ve zor bir görev verildiğinde önce yapamayacağımı düşünürüm.", ters: true },
      { kod: "k1.oz_yeterlilik.9", metin: "Bana bağlı sonuçların sorumluluğunu alırım." },
      { kod: "k1.oz_yeterlilik.10", metin: "Plan tutmadığında yeni bir yol bulup devam ederim." },
    ],
  },
];

export const KATMAN1_MADDELER: Madde[] = KATMAN1_BLOKLAR.flatMap((b) => b.maddeler);
export const KATMAN1_KODLAR = new Set(KATMAN1_MADDELER.map((m) => m.kod));
const TERS_KODLAR = new Set(KATMAN1_MADDELER.filter((m) => m.ters).map((m) => m.kod));

// Tek maddenin etkin puanı (ters maddede 6 - değer).
export function maddePuani(kod: string, deger: Olcek): number {
  return TERS_KODLAR.has(kod) ? 6 - deger : deger;
}

export type BlokSonuc = {
  kod: Blok["kod"];
  ad: string;
  puan: number; // 10-50
  bant: "guclu" | "orta" | "kirilgan";
};

function bant(puan: number): BlokSonuc["bant"] {
  if (puan >= 40) return "guclu";
  if (puan >= 30) return "orta";
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
    return { kod: b.kod, ad: b.ad, puan, bant: bant(puan) };
  });
  const tamamMi = KATMAN1_MADDELER.every((m) => yanitlar[m.kod]);
  const enZayif = tamamMi
    ? bloklar.reduce((a, b) => (b.puan < a.puan ? b : a)).kod
    : null;
  return { bloklar, enZayif, tamamMi };
}

// ============================================================================
// KATMAN 2 — Liderlik Açık Analizi: her başlık için "Önem" (1-10) ve "Son 30
// günde gerçekte" (1-10). Açık = Önem − Gerçek. En büyük iki açık = kampta
// üzerine gidilecek alanlar.
// ============================================================================

export type Katman2Baslik = { kod: string; ad: string; anlam: string };

export const KATMAN2_BASLIKLAR: Katman2Baslik[] = [
  { kod: "takip", ad: "Takip", anlam: "Bağ kurduğun kişiyi bırakmadan, değer vererek izlemek." },
  { kod: "yeni_lider", ad: "Yeni lider geliştirme", anlam: "Kendi yerine geçecek, bağımsız üreten lider yetiştirmek." },
  { kod: "zor_konusma", ad: "Zor konuşmalar", anlam: "Ertelemeden, net ama şefkatli yüzleşmek." },
  { kod: "ekip_kocluk", ad: "Ekip koçluğu", anlam: "İnsanın önündeki engeli görüp birebir geliştirmek." },
  { kod: "hedef", ad: "Hedef koydurma", anlam: "Ekibe net, ölçülebilir hedef koyup takip etmek." },
  { kod: "gunluk_aktivite", ad: "Günlük aktivite", anlam: "Her gün sahada görünür ve üretken olmak." },
  { kod: "ornek_olma", ad: "Örnek olma", anlam: "Ekibinden beklediğin davranışı önce kendin göstermek." },
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
// ofisten doğrulanabilir). Aktivite sayıları + ritim. Algıyı değil davranışı ölçer.
// ============================================================================

export type Katman3Soru = { kod: string; metin: string; max: number };

export const KATMAN3_AKTIVITE: Katman3Soru[] = [
  { kod: "k3.ilk_gorusme", metin: "Son 30 günde kaç yeni kişiyle ilk görüşme yaptın?", max: 999 },
  { kod: "k3.takip_gorusme", metin: "Kaç takip görüşmesi yaptın?", max: 999 },
  { kod: "k3.birebir_kocluk", metin: "Kaç kişiyle birebir (koçluk) çalıştın?", max: 999 },
  { kod: "k3.lider_gelistirme", metin: "Kaç birebir lider geliştirme görüşmesi yaptın?", max: 999 },
  { kod: "k3.hedef_koydurma", metin: "Kaç kişiye net hedef koydurdun?", max: 999 },
  { kod: "k3.etkinlige_tasima", metin: "Kaç kişiyi etkinliğe ya da sunuma taşıdın?", max: 999 },
  { kod: "k3.yeni_ortak", metin: "Kaç yeni ortak kaydı oldu?", max: 999 },
  { kod: "k3.silver", metin: "Ekibinden kaç kişi Silver oldu?", max: 999 },
  { kod: "k3.gold", metin: "Ekibinden kaç kişi Gold oldu?", max: 999 },
];

export const KATMAN3_RITIM: Katman3Soru[] = [
  { kod: "k3.gelir_gun", metin: "Son 30 günün kaçında gelir getirici bir aktivite yaptın? (0-30)", max: 30 },
  { kod: "k3.gelisim_gun", metin: "Kaç gününde bireysel gelişim için planlı zaman ayırdın? Okuma, eğitim, çalışma. (0-30)", max: 30 },
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
// BİRLEŞİK AKIŞ — sihirbazın adım adım gezdiği liste (Faz A+B: Katman 1→2→3).
// ============================================================================

export type Adim =
  | { tip: "likert5"; kod: string; grup: string; metin: string }
  | { tip: "ikili10"; grup: string; ad: string; anlam: string; onemKod: string; gercekKod: string }
  | { tip: "sayi"; kod: string; grup: string; metin: string; max: number };

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
];

// Bir adım tamamlandı mı (ikili10 iki kodu birden ister).
export function adimDolu(a: Adim, y: Record<string, number>): boolean {
  if (a.tip === "ikili10") return y[a.onemKod] !== undefined && y[a.gercekKod] !== undefined;
  return y[a.kod] !== undefined;
}

// Yanıt değeri geçerli mi (kod'a göre aralık).
export function gecerliYanit(kod: string, deger: number): boolean {
  if (!Number.isInteger(deger)) return false;
  if (kod.startsWith("k1.")) return deger >= 1 && deger <= 5;
  if (kod.startsWith("k2.")) return deger >= 1 && deger <= 10;
  if (kod.startsWith("k3.")) {
    const soru = KATMAN3_SORULAR.find((s) => s.kod === kod);
    return deger >= 0 && deger <= (soru?.max ?? 999);
  }
  return false;
}

// Tüm katmanları profile damıtır (kişiye özel görev motorunun yakıtı).
export function profilHesapla(yanitlar: Record<string, number>) {
  const k1 = katman1Hesapla(yanitlar);
  const k2 = katman2Hesapla(yanitlar);
  const k3 = katman3Hesapla(yanitlar);
  return {
    katman1: { bloklar: k1.bloklar, enZayif: k1.enZayif },
    katman2: { acikar: k2.acikar, enBuyukIki: k2.enBuyukIki },
    katman3: { ritim: k3.ritim, sayilar: Object.fromEntries(KATMAN3_SORULAR.map((s) => [s.kod, yanitlar[s.kod] ?? null])) },
    tamamMi: k1.tamamMi && k2.tamamMi && k3.tamamMi,
  };
}


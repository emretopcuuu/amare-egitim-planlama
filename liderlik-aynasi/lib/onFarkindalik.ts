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
// KATMAN 4 — Kör Nokta Haritası: puan yok, yazılı. Seni sabote eden görünmez
// inanç + Acı Gerçek soruları. İlk 4 zorunlu, Acı Gerçek 4'ü teşvik edilir.
// ============================================================================

export type MetinSoru = { kod: string; metin: string; zorunlu: boolean };

export const KATMAN4_SORULAR: MetinSoru[] = [
  { kod: "k4.hedef", metin: "Önümüzdeki 12 ayda gerçekten ulaşmak istediğin sonuç ya da rütbe nedir?", zorunlu: true },
  { kod: "k4.ters_davranis", metin: "Bu hedefe ters çalışan, yapman gerekirken yapmadığın davranış nedir?", zorunlu: true },
  { kod: "k4.kalkan", metin: "Bu davranışı sürdürmek seni neyden koruyor? Senin kalkanın ne?", zorunlu: true },
  { kod: "k4.varsayim", metin: "Büyük varsayımın: “Eğer ___ yaparsam, ___ olur.” — kendi cümlenle yaz.", zorunlu: true },
  { kod: "k4.ag1", metin: "Bugün hâlâ hedeflediğin yerde değilsen, en dürüst sebep ne?", zorunlu: false },
  { kod: "k4.ag2", metin: "Hangi bahaneyi yıllardır daha kibar cümlelerle söylüyorsun?", zorunlu: false },
  { kod: "k4.ag3", metin: "Sen iki hafta görünmez olsan, ekibin ne kadar sürede dağılır?", zorunlu: false },
  { kod: "k4.ag4", metin: "Bu kamptan sonra hiçbir şeyini değiştirmezsen, bir yıl sonra ne kaybetmiş olursun?", zorunlu: false },
];

// ============================================================================
// KATMAN 5 — Büyüme Katsayısı: öğrenme hızı (sayı) + geri bildirime açıklık
// (1-5) + yansıma (yazılı). Diamond'ın gerçek yakıtı: bugünkü değil, hız.
// ============================================================================

export const KATMAN5A_SORULAR: Katman3Soru[] = [
  { kod: "k5a.beceri", metin: "Son 12 ayda kaç yeni beceri öğrendin ya da geliştirdin?", max: 999 },
  { kod: "k5a.kitap", metin: "Kaç kitap bitirdin?", max: 999 },
  { kod: "k5a.egitim", metin: "Kaç eğitim, seminer ya da kursu tamamladın?", max: 999 },
];

export const KATMAN5B_MADDELER: Madde[] = [
  { kod: "k5b.1", metin: "Geri bildirimi savunmaya geçmeden dinleyebilirim." },
  { kod: "k5b.2", metin: "Eleştiriyi alınganlık değil, değişim fırsatı olarak görürüm." },
  { kod: "k5b.3", metin: "Bilmediğimi kabul edip yardım isteyebilirim." },
  { kod: "k5b.4", metin: "Beni zorlayan bir geri bildirimi davranışıma dönüştürürüm." },
];

export const KATMAN5C_SORULAR: MetinSoru[] = [
  { kod: "k5c.1", metin: "Son 6 ayda seni en çok zorlayan geri bildirim neydi, ne yaptın?", zorunlu: false },
  { kod: "k5c.2", metin: "Son bir yılda değiştirdiğin bir davranış var mı? Yaz.", zorunlu: false },
  { kod: "k5c.3", metin: "Bir mentorun “hemen bırakman gereken bir alışkanlığın ne?” dese, ne söylerdi?", zorunlu: false },
];

// ============================================================================
// SONUÇ KARTI — kişi tek cümleyle doldurur. Profilden öneriyle pre-fill edilir.
// ============================================================================

export const SONUC_KARTI: MetinSoru[] = [
  { kod: "sonuc.guclu", metin: "Güçlü Alanın — tek cümleyle.", zorunlu: true },
  { kod: "sonuc.kor_nokta", metin: "Kör Noktan — en büyük açık ile en zayıf alanı birleştir, tek cümle.", zorunlu: true },
  { kod: "sonuc.kamp_gorevi", metin: "Kamp Görevin — bu kamp boyunca iki somut, gözlenebilir aksiyon.", zorunlu: true },
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
      kitap: sayilar["k5a.kitap"] ?? null,
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


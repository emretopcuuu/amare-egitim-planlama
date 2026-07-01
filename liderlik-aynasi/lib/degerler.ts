// DEĞERLER ÇALIŞMASI — onboarding'de Pusula'dan (nedenler) HEMEN ÖNCE.
// Adım-adım sihirbaz; bu modül tek doğruluk kaynağı (adımlar + değer listesi +
// çekirdek tamamlanma kuralı). UI (DegerlerAkis) bu yapıyı genel olarak render eder.
//
// Çekirdek ZORUNLU: 3 temel değer + 1. değerin ilk neden turu + final cümleler
// + en güçlü soru. Refleksiyon soruları TEŞVİK edilir ama boş geçilebilir.

// Koçluk/psikoloji/liderlikte en sık öne çıkan 20 temel değer.
export const DEGER_LISTESI: string[] = [
  "Sevgi",
  "Aile",
  "Sağlık",
  "Özgürlük",
  "Güven",
  "Dürüstlük",
  "Başarı",
  "Gelişim",
  "Saygı",
  "Huzur",
  "Anlam",
  "Mutluluk",
  "Öğrenme",
  "Bağımsızlık",
  "Katkı sağlamak",
  "Adalet",
  "Sorumluluk",
  "Liderlik",
  "Yaratıcılık",
  "Yaşam dengesi",
];

export type Adim =
  // Tanıtım/geçiş paragrafı
  | { kod: string; tip: "intro"; baslik: string; vurgu?: string; paragrafVurgu?: string; paragraf: string; dugme: string }
  // Açık uçlu metin sorusu (refleksiyon — zorunlu değilse teşvik)
  | { kod: string; tip: "metin"; baslik: string; vurgu?: string | string[]; degerSecimi?: boolean; cokSecim?: boolean; ipuclari?: string[]; zorunlu?: boolean; guclu?: boolean }
  // Listeden tam N seçim (legacy)
  | { kod: "sec10" | "sec5" | "sec3"; tip: "sec"; baslik: string; aciklama: string; kaynak: "liste" | "sec10" | "sec5"; adet: number }
  // Bir değer için 5 ardışık "neden?" zinciri (legacy)
  | { kod: string; tip: "neden"; baslik: string; degerIndeks: 0 | 1 | 2; zorunlu?: boolean }
  // Sarmal neden: her değer için 3 turlu derinleşme (AI 2. ve 3. soruyu üretiyor)
  | { kod: string; tip: "neden_soru"; degerIndeks: 0 | 1 | 2; tur: 1 | 2 | 3; zorunlu?: boolean }
  // AI değer önerisi adımı
  | { kod: "ai_oneri"; tip: "ai_oneri"; baslik: string; paragraf: string }
  // Cümle tamamlama (final "neden cümlesi")
  | { kod: "cumle1" | "cumle2" | "cumle3"; tip: "cumle"; baslik: string; on: string; son: string; zorunlu?: boolean };

export const ADIMLAR: Adim[] = [
  {
    kod: "giris",
    tip: "intro",
    baslik: "Değerlerin: Görünmez Pusulan",
    paragraf:
      "🧭 Değerler, hayatındaki seçimleri **sessizce yöneten görünmez pusulalardır.**\n\nDoğru kararlar aldığında huzur; yanlış seçimler yaptığında ise o tanıdık içsel huzursuzluk — **hep bu yüzden.**\n\n✨ Şimdi seni, gerçekten kim olduğunu ve senin için neyin vazgeçilmez olduğunu keşfedeceğin **kısa ama güçlü** bir yolculuğa davet ediyorum.",
    dugme: "Değerlerimi Keşfet",
  },
  {
    kod: "kesifGiris",
    tip: "intro",
    baslik: "Değerlerini Keşfet",
    paragraf:
      "Soruları **acele etmeden** cevapla. İlk aklına gelen değil, **seni gerçekten anlatan** cevapları yaz.\n\n🪞 Dilediğin soruyu boş geçebilirsin — ama ne kadar açılırsan, ayna seni **o kadar net gösterir.**",
    dugme: "Başla",
  },
  {
    kod: "k1",
    tip: "metin",
    baslik: "Zamanın nasıl geçtiğini anlamadığın, kendini en çok “sen” hissettiğin, mutlu olduğun bir anı düşün — tam yerindeymişsin, tam kendinmişsin gibi.",
    vurgu: ["Zamanın", "“sen”", "mutlu olduğun bir anı"],
    ipuclari: [
      "O an ne yapıyordun?",
      "O anda hangi ihtiyacın karşılandı?",
      "O olay sana kendin hakkında ne hissettirdi?",
    ],
  },
  {
    kod: "k2",
    tip: "metin",
    baslik: "Kendinle çok gurur duyduğun bir anı düşün.",
    vurgu: "gurur duyduğun",
    ipuclari: ["Seni en çok tatmin eden neydi?", "Sana kendin hakkında ne hissettirdi?"],
  },
  {
    kod: "k3",
    tip: "metin",
    baslik: "Seni çok etkileyen veya hayran olduğun üç kişiyi yaz.",
    vurgu: "hayran olduğun",
    ipuclari: ["Onlarda seni etkileyen hangi özellikler var?"],
  },
  {
    kod: "k4",
    tip: "metin",
    baslik: "Seni en çok öfkelendiren üç davranış nedir?",
    vurgu: "en çok öfkelendiren",
    ipuclari: [
      "İnsanlarda asla kabul edemediğin şeyler nelerdir?",
      "İpucu: Bizi en çok öfkelendiren şeyler, çoğu zaman en güçlü değerlerimizin ihlal edilmesidir.",
    ],
  },
  {
    kod: "k5",
    tip: "metin",
    baslik: "Boş bir günün olsa, hiçbir maddi kaygın olmasa, günü nasıl geçirirdin?",
    vurgu: "hiçbir maddi kaygın olmasa",
    ipuclari: ["Sabah kalktığından gece yatana kadar yaz."],
  },
  { kod: "k6", tip: "metin", baslik: "Sana göre “başarılı bir insan” nasıl biridir? Hangi özellikleri taşımalıdır?", vurgu: "başarılı bir insan" },
  { kod: "k7", tip: "metin", baslik: "İnsanların seni hangi özelliklerinle hatırlamasını istersin?", vurgu: "hangi özelliklerinle hatırlamasını" },
  { kod: "k8", tip: "metin", baslik: "Sevdiğin biri seni tek cümleyle anlatacak olsa, ne söylemesini isterdin?", vurgu: "tek cümleyle anlatacak olsa" },
  { kod: "k9", tip: "metin", baslik: "Bugün hayatında seni en çok mutlu eden üç şey nedir?", vurgu: "en çok mutlu eden" },
  { kod: "k10", tip: "metin", baslik: "Bugün hayatında seni en çok zorlayan üç şey nedir?", vurgu: "en çok zorlayan" },
  { kod: "k11", tip: "metin", baslik: "Bu zorlukların altında hangi ihtiyacın karşılanmıyor?", vurgu: ["zorlukların", "hangi ihtiyacın karşılanmıyor"] },
  {
    kod: "ai_oneri",
    tip: "ai_oneri" as const,
    baslik: "Cevapların şunu söylüyor",
    paragraf: "Şu ana kadar verdiğin cevapları inceledim. Sende en güçlü öne çıkan değerler bunlar:",
  },
  {
    kod: "farkGiris",
    tip: "intro",
    baslik: "5 Temel Değer",
    paragraf:
      "⚡ Beş temel değerin belli oldu.\n\nŞimdi onlarla aranı kısaca yokla — bu, değerlerini günlük hayatına bağlamanın **en hızlı yolu.**",
    dugme: "Devam",
  },
  { kod: "f1", tip: "metin", baslik: "Bu beş değerden hangisini bugün en çok onurlandırıyorsun?", vurgu: "en çok onurlandırıyorsun", degerSecimi: true },
  { kod: "f2", tip: "metin", baslik: "Hangilerini ihmal ediyorsun?", vurgu: "ihmal ediyorsun", degerSecimi: true, cokSecim: true },
  { kod: "f3", tip: "metin", baslik: "Son bir yıl içinde hangi kararın bu değerlerinle uyumluydu?", vurgu: "değerlerinle uyumluydu" },
  { kod: "f4", tip: "metin", baslik: "Hangi kararın değerlerine aykırıydı?", vurgu: "değerlerine aykırıydı" },
  { kod: "f5", tip: "metin", baslik: "Bugünden sonra alacağın kararlarda bu beş değer sana nasıl rehber olacak?", vurgu: "nasıl rehber olacak" },
  {
    kod: "nedenGiris",
    tip: "intro",
    baslik: "Gel, NEDENlerini Keşfedelim",
    vurgu: "NEDENlerini",
    paragrafVurgu: "Değerler sana yönünü gösterir; nedenlerin ise sana hareket etme gücü verir.",
    paragraf:
      "Yapay zeka en güçlü **üç değerini** belirledi. Her biri için **3 turda** derinleşeceğiz — ilk cevabın ardından AYNA daha kişisel bir soru soracak.\n\n🔍 En derin nedene ulaşmak için **dürüst ol.**",
    dugme: "Nedenimi Keşfet",
  },
  // Değer 0 — 3 turlu sarmal neden
  { kod: "nd_0_1", tip: "neden_soru" as const, degerIndeks: 0 as const, tur: 1 as const, zorunlu: true },
  { kod: "nd_0_2", tip: "neden_soru" as const, degerIndeks: 0 as const, tur: 2 as const },
  { kod: "nd_0_3", tip: "neden_soru" as const, degerIndeks: 0 as const, tur: 3 as const },
  // Değer 1 — 3 turlu sarmal neden
  { kod: "nd_1_1", tip: "neden_soru" as const, degerIndeks: 1 as const, tur: 1 as const, zorunlu: true },
  { kod: "nd_1_2", tip: "neden_soru" as const, degerIndeks: 1 as const, tur: 2 as const },
  { kod: "nd_1_3", tip: "neden_soru" as const, degerIndeks: 1 as const, tur: 3 as const },
  // Değer 2 — 3 turlu sarmal neden
  { kod: "nd_2_1", tip: "neden_soru" as const, degerIndeks: 2 as const, tur: 1 as const, zorunlu: true },
  { kod: "nd_2_2", tip: "neden_soru" as const, degerIndeks: 2 as const, tur: 2 as const },
  { kod: "nd_2_3", tip: "neden_soru" as const, degerIndeks: 2 as const, tur: 3 as const },
  { kod: "n3", tip: "metin", baslik: "Eğer bu üç değeri hayatından çıkarırsak, nasıl biri olurdun? Hayatında neler eksik olurdu?", vurgu: "hayatından çıkarırsak" },
  { kod: "n4", tip: "metin", baslik: "Bu değerleri yaşadığında kendini nasıl hissediyorsun? Üç kelime yaz." },
  { kod: "n5", tip: "metin", baslik: "Bu değerleri yaşayamadığında en çok ne hissediyorsun?" },
  { kod: "n7", tip: "metin", baslik: "Geriye dönüp bak: hayatındaki ortak tema nedir? Hep neyi arıyorsun?", vurgu: "hep neyi arıyorsun" },
  { kod: "n8", tip: "metin", baslik: "İnsanlara ne kazandırmak istiyorsun? Onlar seninle karşılaştıktan sonra ne değişsin istersin?", vurgu: "ne kazandırmak istiyorsun" },
  { kod: "n9", tip: "metin", baslik: "Hayatının sonunda tek bir cümle bırakacak olsan, o cümle ne olurdu?", vurgu: "tek bir cümle bırakacak olsan" },
  {
    kod: "sonGiris",
    tip: "intro",
    baslik: "Gerçek Neden",
    paragraf:
      "Şimdi cevaplarından yola çıkarak nedenini **cümleye dökeceğiz.**\n\n✍️ Acele etme — bu cümle **senin pusulan** olacak.",
    dugme: "Cümlemi Kur",
  },
  { kod: "cumle1", tip: "cumle", baslik: "Tamamla", on: "Ben,", son: "için yaşıyorum.", zorunlu: true },
  { kod: "cumle2", tip: "cumle", baslik: "Geliştir", on: "Ben insanların", son: "yaşamalarına katkı sağlamak istiyorum." },
  { kod: "cumle3", tip: "cumle", baslik: "Ve gerçek neden", on: "Çünkü", son: "", zorunlu: true },
  {
    kod: "final",
    tip: "metin",
    baslik: "Hayatında hiçbir başarı elde edemesen bile, yine de uğruna emek vermeye devam edeceğin şey nedir?",
    ipuclari: [
      "Para, alkış, unvan ve onay ortadan kalktığında bile seni harekete geçiren şey nedir? İşte bu, çoğu zaman senin en derin nedenindir.",
    ],
    guclu: true,
    zorunlu: true,
  },
];

// Bir değerin 5-neden zinciri için cevap kodları (legacy)
export function nedenKodlari(degerIndeks: number): string[] {
  return [1, 2, 3, 4, 5].map((n) => `neden_${degerIndeks}_${n}`);
}

export type DegerlerCevap = {
  cevaplar: Record<string, unknown>;
  secilenUc: string[];
};

// JSONB'den gelen değeri güvenle metne çevir (string değilse boş).
function metinAl(c: Record<string, unknown>, k: string): string {
  return typeof c[k] === "string" ? (c[k] as string).trim() : "";
}

// ÇEKİRDEK TAMAM: bitirmek için zorunlu alanlar dolu mu?
// 3+ değer + 1. değerin ilk neden turu + "Ben ... için yaşıyorum" + "Çünkü ..."
// + en güçlü soru. (Refleksiyon soruları zorunlu değil.)
export function cekirdekTamam(v: DegerlerCevap): boolean {
  const c = v.cevaplar ?? {};
  const dolu = (k: string) => metinAl(c, k).length > 0;
  return (
    (v.secilenUc?.length ?? 0) >= 3 &&
    dolu("nd_0_1") &&
    dolu("cumle1") &&
    dolu("cumle3") &&
    dolu("final")
  );
}

// Ana sayfada gösterilecek "neden cümlesi"ni cevaplardan kur.
export function nedenCumlesiKur(c: Record<string, unknown>): string | null {
  const c1 = metinAl(c, "cumle1");
  const c3 = metinAl(c, "cumle3");
  if (!c1 && !c3) return null;
  const parcalar: string[] = [];
  if (c1) parcalar.push(`Ben, ${c1} için yaşıyorum.`);
  const c2 = metinAl(c, "cumle2");
  if (c2) parcalar.push(`İnsanların ${c2} yaşamalarına katkı sağlamak istiyorum.`);
  if (c3) parcalar.push(`Çünkü ${c3}`);
  return parcalar.join(" ");
}

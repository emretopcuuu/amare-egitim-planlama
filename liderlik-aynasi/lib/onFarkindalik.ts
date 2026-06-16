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

// LİDERLİK ARKETİPİ — 10 özelliğin profilinden kişiye bir kimlik verir.
// Rapordaki dış puanlardan (başkalarının gözü) hesaplanır; dış yoksa öz puan.
// Her arketibin 3 imza özelliği vardır; imza ortalaması en yüksek arketip kazanır.

export type Arketip = {
  anahtar: string;
  ad: string;
  simge: string;
  ozet: string;
  superGuc: string;
  buyurken: string;
  ozellikler: string[]; // birebir özellik adları (seed ile aynı)
};

export const ARKETIPLER: Arketip[] = [
  {
    anahtar: "vizyoner-mimar",
    ad: "Vizyoner Mimar",
    simge: "🏛",
    ozet:
      "Büyük resmi görür ve onu adım adım kurarsın. İnsanlar nereye gittiğini senden öğrenir.",
    superGuc: "Geleceği anlatıp ona sahip çıkmak.",
    buyurken: "Vizyonu küçük, somut ilk adımlara bölerek paylaş.",
    ozellikler: ["Vizyonerlik", "Sorumluluk Alma", "Örnek Olmak"],
  },
  {
    anahtar: "cesur-oncu",
    ad: "Cesur Öncü",
    simge: "🔥",
    ozet:
      "İlk adımı sen atarsın. Riskin olduğu yerde öne çıkar, enerjinle ekibi peşinden sürüklersin.",
    superGuc: "Korkuyu eyleme çevirmek.",
    buyurken: "Hızını ara ara durup ekibini dinlemekle dengele.",
    ozellikler: ["Cesaret", "Pozitif Enerji", "Sorumluluk Alma"],
  },
  {
    anahtar: "sicak-birlestirici",
    ad: "Sıcak Birleştirici",
    simge: "🤝",
    ozet:
      "İnsanları kaynaştırır, kimseyi geride bırakmazsın. Ekibin kalbi çoğu zaman sensin.",
    superGuc: "Bağ kurmak ve aidiyet yaratmak.",
    buyurken: "Herkesi memnun etme isteğini net karar almakla dengele.",
    ozellikler: ["Takım Ruhu", "Pozitif Enerji", "Mütevazılık"],
  },
  {
    anahtar: "guven-capasi",
    ad: "Güven Çapası",
    simge: "⚓",
    ozet:
      "Sözünle davranışın birdir. Fırtınada bile sabit durur, etrafındakilere güven verirsin.",
    superGuc: "Tutarlılık ve güvenilirlik.",
    buyurken: "Sağlamlığını cesur çıkışlarla tazele; konfor alanından çık.",
    ozellikler: ["Dürüstlük", "Örnek Olmak", "Mütevazılık"],
  },
  {
    anahtar: "ilham-veren-ses",
    ad: "İlham Veren Ses",
    simge: "🎙",
    ozet:
      "Anlatırsın ve insanlar tutuşur. Sözlerin bir odayı ayağa kaldırabilir.",
    superGuc: "İkna etmek ve ateşlemek.",
    buyurken: "Sözü, sözünü tutan eylemle taçlandır.",
    ozellikler: ["İletişim Gücü", "Vizyonerlik", "Pozitif Enerji"],
  },
  {
    anahtar: "sarsilmaz-emekci",
    ad: "Sarsılmaz Emekçi",
    simge: "🛠",
    ozet:
      "Sessizce, istikrarla, sonuna kadar çalışırsın. İşi sahiplenir, bitene kadar bırakmazsın.",
    superGuc: "Emek ve istikrar.",
    buyurken: "Emeğini görünür kıl; büyük resmi de paylaşmayı unutma.",
    ozellikler: ["Çalışkanlık", "Sorumluluk Alma", "Dürüstlük"],
  },
];

// Veri yokken (ne dış ne öz) nazik bir başlangıç kimliği
export const YUKSELEN: Arketip = {
  anahtar: "yukselen-yildiz",
  ad: "Yükselen Yıldız",
  simge: "⭐",
  ozet:
    "Yolculuğun henüz başında. Aynan doldukça gerçek arketibin netleşecek.",
  superGuc: "Potansiyel ve merak.",
  buyurken: "Gözlemlenmeye ve denemeye devam et.",
  ozellikler: [],
};

export function arketipBul(
  satirlar: { ad: string; dis: number | null; oz: number | null }[]
): Arketip {
  const deger = new Map(
    satirlar.map((s) => [s.ad, s.dis ?? s.oz ?? 0])
  );
  let enIyi: Arketip = YUKSELEN;
  let enYuksek = 0;
  for (const a of ARKETIPLER) {
    const toplam = a.ozellikler.reduce((t, ad) => t + (deger.get(ad) ?? 0), 0);
    const ort = toplam / a.ozellikler.length;
    if (ort > enYuksek) {
      enYuksek = ort;
      enIyi = a;
    }
  }
  return enYuksek > 0 ? enIyi : YUKSELEN;
}

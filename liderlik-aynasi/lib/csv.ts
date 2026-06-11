// CSV ayrıştırma + giriş kodu üretimi (yalnızca admin import akışı kullanır).
// Excel'in Türkçe yereli CSV'yi noktalı virgülle kaydeder; ayraç ilk satırdan
// otomatik algılanır. Tırnaklı alanlar ve \r\n desteklenir.

export function csvAyristir(metin: string): string[][] {
  const icerik = metin.replace(/^﻿/, ""); // Excel BOM
  const ilkSatir = icerik.split(/\r?\n/, 1)[0] ?? "";
  const ayrac =
    (ilkSatir.match(/;/g)?.length ?? 0) > (ilkSatir.match(/,/g)?.length ?? 0)
      ? ";"
      : ",";

  const satirlar: string[][] = [];
  let alan = "";
  let satir: string[] = [];
  let tirnakta = false;

  const satiriBitir = () => {
    satir.push(alan);
    alan = "";
    // tamamen boş satırları atla
    if (satir.some((a) => a.trim() !== "")) satirlar.push(satir);
    satir = [];
  };

  for (let i = 0; i < icerik.length; i++) {
    const c = icerik[i];
    if (tirnakta) {
      if (c === '"') {
        if (icerik[i + 1] === '"') {
          alan += '"';
          i++;
        } else {
          tirnakta = false;
        }
      } else {
        alan += c;
      }
    } else if (c === '"' && alan === "") {
      tirnakta = true;
    } else if (c === ayrac) {
      satir.push(alan);
      alan = "";
    } else if (c === "\n") {
      satiriBitir();
    } else if (c !== "\r") {
      alan += c;
    }
  }
  if (alan !== "" || satir.length > 0) satiriBitir();

  return satirlar;
}

// Başlık adlarındaki yaygın Türkçe varyasyonları şema alanlarına eşler.
const BASLIK_ESLEME: Record<string, string> = {
  ad: "ad", "ad soyad": "ad", adsoyad: "ad", isim: "ad", "isim soyisim": "ad",
  full_name: "ad", name: "ad",
  takim: "takim", "takım": "takim", team: "takim", grup: "takim",
  sehir: "sehir", "şehir": "sehir", city: "sehir", il: "sehir",
  telefon: "telefon", tel: "telefon", phone: "telefon", gsm: "telefon",
  eposta: "eposta", "e-posta": "eposta", email: "eposta", mail: "eposta",
};

export type KatilimciSatiri = {
  ad: string;
  takim: string | null;
  sehir: string | null;
  telefon: string | null;
  eposta: string | null;
};

export function basliklariEsle(basliklar: string[]): Map<number, string> {
  const esleme = new Map<number, string>();
  basliklar.forEach((b, i) => {
    const alan = BASLIK_ESLEME[b.trim().toLocaleLowerCase("tr-TR")];
    if (alan && ![...esleme.values()].includes(alan)) esleme.set(i, alan);
  });
  return esleme;
}

/** Mevcut kodlarla çakışmayan rastgele 6 haneli giriş kodu üretir. */
export function kodUret(
  kullanilmis: Set<string>,
  rastgeleTamsayi: (min: number, max: number) => number
): string {
  for (let deneme = 0; deneme < 10_000; deneme++) {
    const kod = String(rastgeleTamsayi(100_000, 1_000_000));
    if (!kullanilmis.has(kod)) {
      kullanilmis.add(kod);
      return kod;
    }
  }
  throw new Error("Benzersiz kod üretilemedi — kod alanı tükenmiş olabilir.");
}

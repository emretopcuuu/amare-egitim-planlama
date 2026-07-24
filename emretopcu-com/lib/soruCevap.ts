import type { Icerik } from "./icerik";

// "Emre'ye sor" havuzu — TAMAMEN sitedeki mevcut metinlerden türetilir
// (SSS + gerçekler + sözler). Uydurma cevap YOK; yalnız Emre'nin söyledikleri.
export type SoruCevap = { soru: string; cevap: string };

export function soruCevaplar(c: Icerik): SoruCevap[] {
  return [
    ...c.sss.sorular.map((s) => ({ soru: s.soru, cevap: s.cevap })),
    ...c.gercekler.kartlar.map((k) => ({ soru: k.baslik, cevap: k.aciklama })),
    ...c.gercekler.kartlarEk.map((k) => ({ soru: k.baslik, cevap: k.aciklama })),
    ...c.sozler.map((s) => ({ soru: s.soz, cevap: s.arka })),
  ];
}

const DURAK = new Set([
  "ve", "ile", "bir", "bu", "da", "de", "mi", "mı", "ne", "için", "the", "a",
  "an", "and", "or", "to", "of", "is", "do", "how", "what", "i", "my",
]);

function tokenlar(m: string): string[] {
  return m
    .toLocaleLowerCase("tr")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !DURAK.has(t));
}

// Basit bulanık eşleşme: sorgu token'larının soru+cevap ile örtüşme puanı.
export function enIyiCevap(
  sorgu: string,
  havuz: SoruCevap[],
): SoruCevap | null {
  const st = tokenlar(sorgu);
  if (!st.length) return null;
  let enIyi: SoruCevap | null = null;
  let enPuan = 0;
  for (const sc of havuz) {
    const soruT = new Set(tokenlar(sc.soru));
    const cevapT = new Set(tokenlar(sc.cevap));
    let puan = 0;
    for (const t of st) {
      if (soruT.has(t)) puan += 2; // sorudaki eşleşme ağır
      else if (cevapT.has(t)) puan += 1;
    }
    if (puan > enPuan) {
      enPuan = puan;
      enIyi = sc;
    }
  }
  // En az iki puan (ör. sorudan bir isabet) eşiği; altı "cevap yok".
  return enPuan >= 2 ? enIyi : null;
}

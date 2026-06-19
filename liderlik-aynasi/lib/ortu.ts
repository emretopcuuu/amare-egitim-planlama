// Tam-ekran "ilk açılış" katmanları (marka splash'ı, tanıtım, karşılama) açıkken
// alt menü (AltNav) gizlensin diye gövdeye sınıf ekler. Ref-sayaç: birden çok
// katman üst üste açılırsa (splash→tanıtım) sonuncusu kapanınca menü geri gelir.
let sayac = 0;

export function ortuAc(): void {
  if (typeof document === "undefined") return;
  sayac += 1;
  document.body.classList.add("ortu-acik");
}

export function ortuKapat(): void {
  if (typeof document === "undefined") return;
  sayac = Math.max(0, sayac - 1);
  if (sayac === 0) document.body.classList.remove("ortu-acik");
}

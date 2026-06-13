// Dokunsal geri bildirim: destekleyen cihazlarda kısa titreşim. Hareket-azalt
// tercihinde ve desteklemeyen cihazlarda sessizce hiçbir şey yapmaz.
export function titret(desen: number | number[] = 12) {
  try {
    if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
    const azalt =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!azalt) navigator.vibrate(desen);
  } catch {
    // bazı tarayıcılar vibrate'i güvenlik gerekçesiyle reddedebilir — yok say
  }
}

// Yaşayan su: arka plandaki göl, kullanıcının eylemine halkayla karşılık verir.
// x,y ekran koordinatı (-1..1); verilmezse su yüzeyine denk gelen merkez.
export function suDalgasi(x?: number, y?: number) {
  try {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("ayna-su-dalga", { detail: { x, y } }));
  } catch {
    // CustomEvent desteklenmiyorsa sessizce yok say
  }
}

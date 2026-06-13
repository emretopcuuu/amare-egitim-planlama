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

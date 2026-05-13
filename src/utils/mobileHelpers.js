// Mobile UX helpers — haptic feedback + native share + reduced motion

// Cihaz titreşimi (mobile/PWA). Desktop'ta sessiz fallback.
export function haptic(pattern = 10) {
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  } catch {}
}

// Native Web Share API (mobile öncelik), fallback clipboard
export async function nativeShare({ title, text, url }) {
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return { ok: true, method: 'native' };
    }
  } catch (err) {
    // user cancelled veya hata
    if (err?.name === 'AbortError') return { ok: false, method: 'cancelled' };
  }
  // Fallback: clipboard
  try {
    await navigator.clipboard.writeText(url);
    return { ok: true, method: 'clipboard' };
  } catch {
    return { ok: false, method: 'none' };
  }
}

// prefers-reduced-motion respect
export function prefersReducedMotion() {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
  } catch { return false; }
}

// Save data mode (slow connections)
export function isSaveData() {
  try {
    return navigator.connection?.saveData || false;
  } catch { return false; }
}

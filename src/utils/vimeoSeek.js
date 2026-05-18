// Vimeo Player postMessage API ile iframe'i RELOAD ETMEDEN seek yapar.
// Aha! moment, bookmark, chunk tıklamasında kullanılır.
//
// Eski yaklaşım: iframe.src = `${base}#t=${s}s` → iframe komple reload eder
//   (kara ekran, autoplay kırılır, loading)
// Yeni yaklaşım: postMessage ile setCurrentTime + play → reload yok, akıcı

function send(iframe, method, value) {
  try {
    const payload = value === undefined
      ? { method }
      : { method, value };
    iframe.contentWindow?.postMessage(JSON.stringify(payload), '*');
  } catch {}
}

/**
 * Vimeo iframe player'ı belirtilen saniyeye sek ve oynat.
 * @param {HTMLIFrameElement} iframe - Vimeo player iframe
 * @param {number} seconds - hedef saniye
 */
export function vimeoSeekAndPlay(iframe, seconds) {
  if (!iframe || typeof seconds !== 'number' || seconds < 0) return;
  const s = Math.max(0, Math.floor(seconds));
  // Vimeo Player API: setCurrentTime → play
  send(iframe, 'setCurrentTime', s);
  // Bazı browserlarda timeline güncellemesi yetişmeden play gelir, küçük gecikme
  setTimeout(() => send(iframe, 'play'), 50);
}

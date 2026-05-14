// Vimeo iframe player'dan postMessage ile zaman bilgisini takip eder.
// Throttle 5sn — gereksiz localStorage write'larını önler.
//
// Vimeo Player JS API (postMessage protokolü):
//   - addEventListener: timeupdate, ended, pause
//   - Yanıt: { event, data: { seconds, percent, duration } }
//
// Kullanım:
//   const iframeRef = useRef(null);
//   useVimeoTimeTracker(iframeRef, videoId, (seconds, duration, ended) => {
//     updateProgress(videoId, seconds, duration);
//   });

import { useEffect, useRef } from 'react';

export function useVimeoTimeTracker(iframeRef, videoId, onUpdate, opts = {}) {
  const throttleMs = opts.throttleMs ?? 5000;
  const lastUpdateRef = useRef(0);
  const callbackRef = useRef(onUpdate);

  // En son callback'i referansla — useEffect dep'i yenilemesin
  useEffect(() => { callbackRef.current = onUpdate; }, [onUpdate]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !videoId) return;

    const sendCommand = (msg) => {
      try {
        iframe.contentWindow?.postMessage(JSON.stringify(msg), '*');
      } catch {}
    };

    // Iframe yüklenince Vimeo event listener'larını kaydet
    const registerListeners = () => {
      sendCommand({ method: 'addEventListener', value: 'timeupdate' });
      sendCommand({ method: 'addEventListener', value: 'ended' });
      sendCommand({ method: 'addEventListener', value: 'pause' });
    };

    // Iframe zaten yüklendiyse hemen, değilse load event'inde
    const tLoad = setTimeout(registerListeners, 800);
    iframe.addEventListener('load', registerListeners);

    const onMessage = (e) => {
      // Sadece Vimeo origin'den
      if (typeof e.origin === 'string' && !e.origin.includes('vimeo.com')) return;
      let data;
      try {
        data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      } catch { return; }
      if (!data || !data.event) return;

      const payload = data.data || {};
      const seconds = payload.seconds ?? payload.currentTime;
      const duration = payload.duration;
      if (typeof seconds !== 'number' || typeof duration !== 'number') return;
      if (duration <= 0) return;

      if (data.event === 'timeupdate') {
        // Throttle
        const now = Date.now();
        if (now - lastUpdateRef.current < throttleMs) return;
        lastUpdateRef.current = now;
        callbackRef.current?.(seconds, duration, false);
      } else if (data.event === 'pause') {
        // Pause'da hemen kaydet (throttle bypass)
        lastUpdateRef.current = Date.now();
        callbackRef.current?.(seconds, duration, false);
      } else if (data.event === 'ended') {
        // Tamamlandı — duration'la set et
        callbackRef.current?.(duration, duration, true);
      }
    };

    window.addEventListener('message', onMessage);

    return () => {
      clearTimeout(tLoad);
      iframe.removeEventListener('load', registerListeners);
      window.removeEventListener('message', onMessage);
    };
  }, [iframeRef, videoId, throttleMs]);
}

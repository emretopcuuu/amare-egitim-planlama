// useSwipeToDismiss — Aşağı kaydırma ile modal kapat
// Touch tabanlı, mobil için ideal
//
// Kullanım:
//   const { offsetY, handlers, kapatiyor } = useSwipeToDismiss(onClose);
//   <div style={{ transform: `translateY(${offsetY}px)` }} {...handlers}>

import { useRef, useState } from 'react';

const ESIK = 120; // px — bu mesafede kapat

export function useSwipeToDismiss(onClose) {
  const [offsetY, setOffsetY] = useState(0);
  const [kapatiyor, setKapatiyor] = useState(false);
  const baslangicRef = useRef(0);
  const aktifRef = useRef(false);

  function onTouchStart(e) {
    if (kapatiyor) return;
    baslangicRef.current = e.touches[0].clientY;
    aktifRef.current = true;
  }

  function onTouchMove(e) {
    if (!aktifRef.current || kapatiyor) return;
    const dy = e.touches[0].clientY - baslangicRef.current;
    if (dy > 0) setOffsetY(dy);
  }

  function onTouchEnd() {
    if (!aktifRef.current || kapatiyor) return;
    aktifRef.current = false;
    if (offsetY > ESIK) {
      setKapatiyor(true);
      // Animasyonu bitir, sonra kapat
      setTimeout(() => {
        onClose?.();
        setOffsetY(0);
        setKapatiyor(false);
      }, 200);
      // Hızlı çıkış animasyonu için Y'yi pencere yüksekliğine taşı
      setOffsetY(window.innerHeight);
    } else {
      // Geri yay
      setOffsetY(0);
    }
  }

  return {
    offsetY,
    kapatiyor,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
    style: { transform: `translateY(${offsetY}px)`, transition: !aktifRef.current ? 'transform 0.25s ease-out' : 'none' },
  };
}

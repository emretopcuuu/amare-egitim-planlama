// Mobile pull-to-refresh hook.
// Sayfa scrollY=0'da iken aşağı çekme algılar, threshold aşılınca onRefresh
// çağırır. Visual indicator dışarıdan (pullY state'i) render edilir.
//
// Kullanım:
//   const { pullY, refreshing } = usePullToRefresh(async () => {
//     // cache temizle + yeniden çek
//   });
//   <div style={{ transform: `translateY(${pullY}px)` }}>...</div>
//
// Desktop'ta (md+) hiçbir şey yapmaz — sadece mobile için.

import { useEffect, useRef, useState } from 'react';

export function usePullToRefresh(onRefresh, opts = {}) {
  const threshold = opts.threshold ?? 70;
  const maxPull = opts.maxPull ?? 120;
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  useEffect(() => {
    // Sadece mobilde aktif
    if (typeof window === 'undefined') return;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (!isMobile) return;

    const onTouchStart = (e) => {
      if (window.scrollY > 4 || refreshing) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };
    const onTouchMove = (e) => {
      if (!pulling.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        pulling.current = false;
        setPullY(0);
        return;
      }
      // Sönümlü çekme (lastiksi his)
      const damped = Math.min(dy * 0.55, maxPull);
      setPullY(damped);
    };
    const onTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      const currentPull = pullY;
      if (currentPull >= threshold && !refreshing) {
        setRefreshing(true);
        setPullY(threshold); // göstergeyi yerinde tut
        try {
          await onRefresh();
        } finally {
          // Smooth kapanış
          setTimeout(() => { setRefreshing(false); setPullY(0); }, 300);
        }
      } else {
        setPullY(0);
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [onRefresh, pullY, refreshing, threshold, maxPull]);

  return { pullY, refreshing };
}

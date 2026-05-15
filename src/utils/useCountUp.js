// Count-up animasyonu — sayılar 0'dan target'a ease-out ile yükselir
// Profil sayfasında stats row + completion % için kullanılır.

import { useEffect, useRef, useState } from 'react';

export function useCountUp(target, opts = {}) {
  const duration = opts.duration ?? 1000;
  const delay = opts.delay ?? 0;
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const numTarget = Number(target) || 0;
    if (numTarget === 0) { setValue(0); return; }

    const startTime = performance.now() + delay;
    const startValue = 0;

    function tick(now) {
      if (now < startTime) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (numTarget - startValue) * eased;
      setValue(Math.round(current));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, delay]);

  return value;
}

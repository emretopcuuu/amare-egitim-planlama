// Canlı Rakam Sayacı — Apple keynote tarzı, 0'dan hedefe sayar
// Premium ama incelikli (sadece rakam + küçük etiket).
import React, { useEffect, useState, useRef } from 'react';

const tween = (from, to, duration, onUpdate, onDone) => {
  const start = performance.now();
  const animate = (now) => {
    const t = Math.min(1, (now - start) / duration);
    // ease-out-cubic
    const eased = 1 - Math.pow(1 - t, 3);
    const value = from + (to - from) * eased;
    onUpdate(value);
    if (t < 1) requestAnimationFrame(animate);
    else onDone?.();
  };
  requestAnimationFrame(animate);
};

const TekRakam = ({ deger, sonek = '', gecikme = 0 }) => {
  const [val, setVal] = useState(0);
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current) return;
    triggered.current = true;
    const timer = setTimeout(() => {
      tween(0, deger, 1500, (v) => setVal(v));
    }, gecikme);
    return () => clearTimeout(timer);
  }, [deger, gecikme]);

  return <span>{Math.round(val)}{sonek}</span>;
};

const LiveCounter = ({ items = [], className = '' }) => {
  // items: [{ deger: 26, etiket: 'Eğitmen' }, ...]
  return (
    <div className={`counter-row inline-flex items-center gap-3 sm:gap-5 text-purple-200/85 text-xs sm:text-sm font-light tracking-wide ${className}`}>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-amber-400/40">·</span>}
          <span className="inline-flex items-baseline gap-1.5">
            <strong className="font-bold text-amber-300 text-base sm:text-lg font-display">
              <TekRakam deger={it.deger} sonek={it.sonek || ''} gecikme={it.gecikme || i * 150} />
            </strong>
            <span className="opacity-80">{it.etiket}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};

export default LiveCounter;

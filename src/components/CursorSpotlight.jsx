// Cursor takip altın spotlight — sadece desktop'ta
// Çok yumuşak, abartısız. Premium "uygulama beni dinliyor" hissi.
import React, { useEffect, useRef } from 'react';

const CursorSpotlight = ({ enabled = true, color = 'rgba(251, 191, 36, 0.08)', size = 400 }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    // Touch device'larda gösterme
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) return;

    const el = ref.current;
    if (!el) return;

    let raf = null;
    let targetX = -9999, targetY = -9999;
    let currentX = targetX, currentY = targetY;

    const onMove = (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const tick = () => {
      // Lerp — yumuşak takip
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      el.style.transform = `translate3d(${currentX - size / 2}px, ${currentY - size / 2}px, 0)`;
      if (Math.abs(targetX - currentX) > 0.5 || Math.abs(targetY - currentY) > 0.5) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = null;
      }
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled, size]);

  if (!enabled) return null;
  return (
    <div
      ref={ref}
      className="fixed top-0 left-0 pointer-events-none z-[1] rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        transform: 'translate3d(-9999px, -9999px, 0)',
        willChange: 'transform',
        mixBlendMode: 'screen',
      }}
      aria-hidden="true"
    />
  );
};

export default CursorSpotlight;

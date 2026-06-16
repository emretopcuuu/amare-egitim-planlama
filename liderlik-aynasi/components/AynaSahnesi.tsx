"use client";

import { useEffect, useRef } from "react";

// "Uyanan Ayna" — saf CSS/SVG/Canvas sinematik sahne. Bağımlılık yok, ek dosya yok:
//  • Y ekseninde usulca dönen, altın çerçeveli oval ayna (sana dönüyor gibi)
//  • Cam yüzeyde diyagonal ışık süzülmesi (imza "bu gerçek cam" anı)
//  • Süzülen altın ışık zerreleri (canvas) + arkada nefes alan hale ve ışınlar
// prefers-reduced-motion açıkken tüm hareket zarif bir sabit kareye donar.
// Yalnız görseldir (aria-hidden); içerik bunun ÜSTÜNE katmanlanır.
export default function AynaSahnesi() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const azalt = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let cer = 0;
    let durdur = false;
    let zerreler: { x: number; y: number; r: number; hiz: number; faz: number; parlak: number }[] = [];

    function boyutla() {
      const ebeveyn = canvas!.parentElement;
      if (!ebeveyn) return;
      const w = ebeveyn.clientWidth;
      const h = ebeveyn.clientHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sayi = Math.min(48, Math.max(20, Math.floor((w * h) / 13000)));
      zerreler = Array.from({ length: sayi }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.8 + 0.6,
        hiz: Math.random() * 0.22 + 0.04,
        faz: Math.random() * Math.PI * 2,
        parlak: Math.random() * 0.5 + 0.3,
      }));
    }

    boyutla();
    const ro = new ResizeObserver(boyutla);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    function ciz() {
      if (durdur) return;
      const w = canvas!.clientWidth;
      const h = canvas!.clientHeight;
      ctx!.clearRect(0, 0, w, h);
      for (const z of zerreler) {
        if (!azalt) {
          z.y -= z.hiz;
          z.faz += 0.02;
          if (z.y < -6) {
            z.y = h + 6;
            z.x = Math.random() * w;
          }
        }
        const titre = azalt ? z.parlak : z.parlak * (0.55 + 0.45 * Math.sin(z.faz));
        const grd = ctx!.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r * 4);
        grd.addColorStop(0, `rgba(245,212,128,${titre})`);
        grd.addColorStop(1, "rgba(245,212,128,0)");
        ctx!.fillStyle = grd;
        ctx!.beginPath();
        ctx!.arc(z.x, z.y, z.r * 4, 0, Math.PI * 2);
        ctx!.fill();
      }
      if (!azalt) cer = requestAnimationFrame(ciz);
    }
    ciz();

    return () => {
      durdur = true;
      cancelAnimationFrame(cer);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="ayna-sahne" aria-hidden>
      <div className="halo" />
      <div className="isin" />
      <canvas ref={canvasRef} className="zerreler" />

      <div className="ayna-3d">
        <svg viewBox="0 0 200 320" className="ayna-svg">
          <defs>
            <linearGradient id="asCam" x1="0.15" y1="0" x2="0.7" y2="1">
              <stop offset="0" stopColor="#0c1838" />
              <stop offset="0.5" stopColor="#1b1244" />
              <stop offset="1" stopColor="#06091a" />
            </linearGradient>
            <radialGradient id="asSheen" cx="0.36" cy="0.26" r="0.75">
              <stop offset="0" stopColor="rgba(214,226,255,0.22)" />
              <stop offset="0.55" stopColor="rgba(214,226,255,0)" />
            </radialGradient>
            <linearGradient id="asCerceve" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#6f4f17" />
              <stop offset="0.42" stopColor="#f4d27a" />
              <stop offset="0.52" stopColor="#fff4d2" />
              <stop offset="0.62" stopColor="#e7bf6c" />
              <stop offset="1" stopColor="#8a611f" />
            </linearGradient>
          </defs>
          {/* cam */}
          <ellipse cx="100" cy="160" rx="76" ry="148" fill="url(#asCam)" />
          <ellipse cx="100" cy="160" rx="76" ry="148" fill="url(#asSheen)" />
          {/* ince iç kenar + altın çerçeve */}
          <ellipse cx="100" cy="160" rx="76" ry="148" fill="none" stroke="rgba(255,244,210,0.18)" strokeWidth="1.5" />
          <ellipse cx="100" cy="160" rx="82" ry="154" fill="none" stroke="url(#asCerceve)" strokeWidth="7" />
        </svg>
        {/* ışık süzülmesi — cama kırpılır */}
        <div className="parilti" />
      </div>

      <style jsx>{`
        .ayna-sahne {
          position: absolute;
          inset: 0;
          overflow: hidden;
          perspective: 1000px;
          pointer-events: none;
        }
        .halo,
        .isin,
        .ayna-3d {
          position: absolute;
          left: 50%;
          top: 42%;
          transform: translate(-50%, -50%);
        }
        .zerreler {
          position: absolute;
          inset: 0;
        }
        .halo {
          width: min(86vw, 460px);
          height: min(86vw, 460px);
          background: radial-gradient(
            circle,
            rgba(124, 92, 246, 0.35) 0%,
            rgba(124, 92, 246, 0.12) 38%,
            rgba(4, 16, 28, 0) 70%
          );
          filter: blur(6px);
          animation: nefes 6s ease-in-out infinite;
        }
        .isin {
          width: min(120vw, 640px);
          height: min(120vw, 640px);
          background: conic-gradient(
            from 0deg,
            rgba(245, 212, 128, 0) 0deg,
            rgba(245, 212, 128, 0.1) 18deg,
            rgba(245, 212, 128, 0) 40deg,
            rgba(245, 212, 128, 0) 180deg,
            rgba(245, 212, 128, 0.08) 200deg,
            rgba(245, 212, 128, 0) 224deg,
            rgba(245, 212, 128, 0) 360deg
          );
          filter: blur(10px);
          opacity: 0.6;
          animation: don 44s linear infinite;
        }
        .ayna-3d {
          width: min(62vw, 250px);
          transform-style: preserve-3d;
          animation: salin 9s ease-in-out infinite alternate;
          filter: drop-shadow(0 30px 60px rgba(0, 0, 0, 0.55));
        }
        .ayna-svg {
          display: block;
          width: 100%;
          height: auto;
        }
        .parilti {
          position: absolute;
          left: 7%;
          right: 7%;
          top: 3.5%;
          bottom: 3.5%;
          clip-path: ellipse(50% 50% at 50% 50%);
          background: linear-gradient(
            114deg,
            transparent 38%,
            rgba(255, 246, 214, 0.45) 48%,
            rgba(255, 255, 255, 0.85) 50%,
            rgba(255, 246, 214, 0.45) 52%,
            transparent 62%
          );
          background-size: 280% 100%;
          background-position: 160% 0;
          mix-blend-mode: screen;
          animation: suzul 6s ease-in-out infinite;
        }
        @keyframes salin {
          from {
            transform: translate(-50%, -50%) rotateY(-15deg) rotateZ(-1.2deg);
          }
          to {
            transform: translate(-50%, -50%) rotateY(15deg) rotateZ(1.2deg);
          }
        }
        @keyframes suzul {
          0%,
          18% {
            background-position: 160% 0;
          }
          55%,
          100% {
            background-position: -60% 0;
          }
        }
        @keyframes nefes {
          0%,
          100% {
            opacity: 0.7;
            transform: translate(-50%, -50%) scale(0.97);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.04);
          }
        }
        @keyframes don {
          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ayna-3d {
            animation: none;
            transform: translate(-50%, -50%) rotateY(-6deg);
          }
          .parilti {
            animation: none;
            background-position: 40% 0;
          }
          .halo,
          .isin {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

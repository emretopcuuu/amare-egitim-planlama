"use client";

import { useEffect, useRef } from "react";

// "Uyanan Ayna" — sinematik üretilmiş ayna görseli (antika oymalı çerçeve) tam
// ekran zemin olarak; üstüne hafif YAŞAM katmanları: çok yavaş ken-burns
// yakınlaşma, mirror merkezinde nefes alan ışıma, camda gezinen ışık parıltısı
// ve süzülen altın ışık zerreleri (canvas). prefers-reduced-motion açıkken tüm
// hareket durur. Yalnız görsel (aria-hidden); içerik bunun ÜSTÜNE katmanlanır.
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
      const sayi = Math.min(42, Math.max(18, Math.floor((w * h) / 15000)));
      zerreler = Array.from({ length: sayi }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.7 + 0.5,
        hiz: Math.random() * 0.2 + 0.04,
        faz: Math.random() * Math.PI * 2,
        parlak: Math.random() * 0.45 + 0.25,
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
          z.faz += 0.018;
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/ayna-sahne.webp" alt="" className="foto" fetchPriority="high" />
      <div className="isima" />
      <div className="parilti" />
      <canvas ref={canvasRef} className="zerreler" />

      <style jsx>{`
        .ayna-sahne {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background: #04101c;
          pointer-events: none;
        }
        .foto {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 38%;
          transform-origin: center 36%;
          animation: kenBurns 26s ease-in-out infinite alternate;
        }
        .isima,
        .parilti {
          position: absolute;
          left: 50%;
          top: 35%;
          transform: translate(-50%, -50%);
          mix-blend-mode: screen;
        }
        .isima {
          width: min(74vw, 360px);
          height: min(74vw, 360px);
          background: radial-gradient(
            circle,
            rgba(170, 132, 255, 0.4) 0%,
            rgba(245, 212, 128, 0.16) 42%,
            rgba(4, 16, 28, 0) 70%
          );
          filter: blur(8px);
          animation: nefes 6.5s ease-in-out infinite;
        }
        .parilti {
          width: min(40vw, 200px);
          height: min(40vh, 280px);
          clip-path: ellipse(50% 50% at 50% 50%);
          background: linear-gradient(
            116deg,
            transparent 40%,
            rgba(255, 246, 214, 0.4) 49%,
            rgba(255, 255, 255, 0.7) 50%,
            rgba(255, 246, 214, 0.4) 51%,
            transparent 60%
          );
          background-size: 280% 100%;
          background-position: 165% 0;
          opacity: 0.7;
          animation: suzul 7.5s ease-in-out infinite;
        }
        .zerreler {
          position: absolute;
          inset: 0;
        }
        @keyframes kenBurns {
          from {
            transform: scale(1.02);
          }
          to {
            transform: scale(1.09);
          }
        }
        @keyframes nefes {
          0%,
          100% {
            opacity: 0.72;
            transform: translate(-50%, -50%) scale(0.96);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.06);
          }
        }
        @keyframes suzul {
          0%,
          22% {
            background-position: 165% 0;
          }
          58%,
          100% {
            background-position: -65% 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .foto {
            animation: none;
            transform: scale(1.03);
          }
          .isima {
            animation: none;
          }
          .parilti {
            animation: none;
            background-position: 45% 0;
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}

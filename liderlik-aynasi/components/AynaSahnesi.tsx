"use client";

import { useEffect, useRef } from "react";

// "Uyanan Ayna" — antika altın çerçeveli aynanın içinde gerçekten dönen kozmik
// girdap (Higgsfield ile üretilen sinematik video, sessiz, sorunsuz döngü) tam
// ekran zemin olarak. Üstüne yalnız okunabilirlik için çok hafif ışıma ve alt
// vinyet katmanı biner — eski sahte canvas parçacıkları kaldırıldı; canlılık
// artık videonun kendisinden geliyor. prefers-reduced-motion açıkken video
// durur ve poster karesi (ayna-girdap.webp) sabit kalır. Yalnız görsel
// (aria-hidden); içerik bunun ÜSTÜNE katmanlanır.
export default function AynaSahnesi() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const azalt = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (azalt) {
      v.pause();
      return;
    }
    // iOS/otomatik-oynatma güvencesi: sessiz + inline, kullanıcı etkileşimi
    // olmadan başlatmayı dene; engellenirse poster karesi zaten görünür.
    v.muted = true;
    void v.play().catch(() => {});
  }, []);

  return (
    <div className="ayna-sahne" aria-hidden>
      <video
        ref={videoRef}
        className="film"
        src="/ayna-girdap.mp4"
        poster="/ayna-girdap.webp"
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
      />
      <div className="isima" />
      <div className="vinyet" />

      <style jsx>{`
        .ayna-sahne {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background: #04101c;
          pointer-events: none;
        }
        .film {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 42%;
          transform-origin: center 40%;
          animation: kenBurns 30s ease-in-out infinite alternate;
        }
        /* Girdabın merkezinde nefes alan yumuşak ışıma — derinlik hissi katar */
        .isima {
          position: absolute;
          left: 50%;
          top: 40%;
          width: min(72vw, 360px);
          height: min(72vw, 360px);
          transform: translate(-50%, -50%);
          mix-blend-mode: screen;
          background: radial-gradient(
            circle,
            rgba(170, 132, 255, 0.22) 0%,
            rgba(245, 212, 128, 0.1) 44%,
            rgba(4, 16, 28, 0) 72%
          );
          filter: blur(10px);
          animation: nefes 7s ease-in-out infinite;
        }
        /* Kenar karartma: metin alt kısımda her zaman net okunsun */
        .vinyet {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            120% 90% at 50% 36%,
            transparent 52%,
            rgba(4, 16, 28, 0.55) 100%
          );
        }
        @keyframes kenBurns {
          from {
            transform: scale(1.04);
          }
          to {
            transform: scale(1.12);
          }
        }
        @keyframes nefes {
          0%,
          100% {
            opacity: 0.7;
            transform: translate(-50%, -50%) scale(0.95);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.07);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .film {
            animation: none;
            transform: scale(1.04);
          }
          .isima {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

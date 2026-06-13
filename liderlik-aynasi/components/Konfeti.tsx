"use client";

import { useEffect, useRef } from "react";
import { suDalgasi } from "@/lib/his";

// Bağımsız konfeti kutlaması: harici kütüphane yok, tam ekran canvas'a çizilir.
// Mount'ta bir kez patlar, ~2.2 sn sonra kendini temizler. Hareket-azalt
// tercihinde hiç çalışmaz. `anahtar` verilirse oturumda yalnız bir kez.
export default function Konfeti({ anahtar }: { anahtar?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const azalt = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (azalt) return;
    if (anahtar) {
      try {
        if (sessionStorage.getItem(anahtar)) return;
        sessionStorage.setItem(anahtar, "1");
      } catch {
        // depolama kapalı: yine de bir kez göster
      }
    }
    suDalgasi(); // kutlama anında arka plandaki göl de halkalanır
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let g = window.innerWidth;
    let y = window.innerHeight;
    canvas.width = g;
    canvas.height = y;

    const renkler = ["#f59e0b", "#fbbf24", "#9cc3e0", "#f4f8fc", "#34d399"];
    const parcalar = Array.from({ length: 140 }, () => ({
      x: g / 2 + (Math.random() - 0.5) * 120,
      y: y * 0.35 + (Math.random() - 0.5) * 60,
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -14 - 4,
      r: 4 + Math.random() * 6,
      renk: renkler[(Math.random() * renkler.length) | 0],
      donme: Math.random() * Math.PI,
      vd: (Math.random() - 0.5) * 0.3,
    }));

    const baslangic = performance.now();
    let raf = 0;
    function kare(simdi: number) {
      const gecen = simdi - baslangic;
      ctx!.clearRect(0, 0, g, y);
      for (const p of parcalar) {
        p.vy += 0.35; // yerçekimi
        p.x += p.vx;
        p.y += p.vy;
        p.donme += p.vd;
        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.donme);
        ctx!.globalAlpha = Math.max(0, 1 - gecen / 2200);
        ctx!.fillStyle = p.renk;
        ctx!.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
        ctx!.restore();
      }
      if (gecen < 2200) raf = requestAnimationFrame(kare);
      else ctx!.clearRect(0, 0, g, y);
    }
    raf = requestAnimationFrame(kare);

    function olcekle() {
      g = window.innerWidth;
      y = window.innerHeight;
      canvas!.width = g;
      canvas!.height = y;
    }
    window.addEventListener("resize", olcekle);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", olcekle);
    };
  }, [anahtar]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[55]"
    />
  );
}

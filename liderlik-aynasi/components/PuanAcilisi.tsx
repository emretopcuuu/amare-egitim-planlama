"use client";

import { useEffect, useRef, useState } from "react";

// AYNA puanını sahneye koyar: rakam 0'dan hedefe sayılarak büyür; yüksek puanda
// (8+) etrafında altın partiküller patlar. Her puan küçük bir kutlama anı olur.
// Kütüphane yok — sayaç requestAnimationFrame, partikül canvas. Hareket-azalt
// tercihinde anında son değeri gösterir, partikül çizmez.
export default function PuanAcilisi({ puan }: { puan: number }) {
  const [goster, setGoster] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const azalt = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (azalt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGoster(puan);
      return;
    }

    // Sayaç: ~900ms'de 0 → puan, sona doğru yavaşlayan (easeOut) artış.
    const sure = 900;
    const bas = performance.now();
    let raf = 0;
    function say(simdi: number) {
      const oran = Math.min(1, (simdi - bas) / sure);
      const yumusak = 1 - Math.pow(1 - oran, 3); // easeOutCubic
      setGoster(Math.round(yumusak * puan));
      if (oran < 1) raf = requestAnimationFrame(say);
    }
    raf = requestAnimationFrame(say);
    return () => cancelAnimationFrame(raf);
  }, [puan]);

  // Yüksek puanda partikül patlaması (kart içine, taşmadan).
  useEffect(() => {
    if (puan < 8) return;
    const azalt = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (azalt) return;
    const kap = canvasRef.current;
    if (!kap) return;
    const canvas = document.createElement("canvas");
    const g = kap.clientWidth || 260;
    const y = 120;
    canvas.width = g;
    canvas.height = y;
    canvas.className = "pointer-events-none absolute inset-0 mx-auto";
    canvas.setAttribute("aria-hidden", "true");
    kap.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renkler = ["#f59e0b", "#fbbf24", "#fcd34d", "#fde68a"];
    const parcalar = Array.from({ length: 40 }, () => ({
      x: g / 2,
      y: y * 0.42,
      vx: (Math.random() - 0.5) * 9,
      vy: Math.random() * -7 - 2,
      r: 2 + Math.random() * 3.5,
      renk: renkler[(Math.random() * renkler.length) | 0],
    }));
    const bas = performance.now();
    let raf = 0;
    function kare(simdi: number) {
      const gecen = simdi - bas;
      ctx!.clearRect(0, 0, g, y);
      for (const p of parcalar) {
        p.vy += 0.22;
        p.x += p.vx;
        p.y += p.vy;
        ctx!.globalAlpha = Math.max(0, 1 - gecen / 1400);
        ctx!.fillStyle = p.renk;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      if (gecen < 1400) raf = requestAnimationFrame(kare);
      else canvas.remove();
    }
    // Sayaç dolarken patlasın — küçük gecikme.
    const zaman = setTimeout(() => {
      raf = requestAnimationFrame(kare);
    }, 600);
    return () => {
      clearTimeout(zaman);
      cancelAnimationFrame(raf);
      canvas.remove();
    };
  }, [puan]);

  // UX #4 — dairesel skor halkası. Renk kademeli: düşük nötr, orta royal, yüksek altın.
  const r = 30;
  const cevre = 2 * Math.PI * r;
  const oran = Math.max(0, Math.min(1, goster / 10));
  const renk = puan >= 8 ? "#f59e0b" : puan >= 6 ? "#a78bfa" : "#64748b";

  return (
    <div ref={canvasRef} className="relative flex flex-col items-center">
      <div className="relative h-[76px] w-[76px]">
        <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90">
          <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle
            cx="38"
            cy="38"
            r={r}
            fill="none"
            stroke={renk}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={cevre}
            strokeDashoffset={cevre * (1 - oran)}
            className="skor-halka-yay"
            style={{ ["--cevre" as string]: `${cevre}` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums" style={{ color: renk }}>
            {goster}
          </span>
          <span className="-mt-1 text-[0.6rem] font-medium text-slate-400">/ 10</span>
        </div>
      </div>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        AYNA puanın
      </p>
    </div>
  );
}

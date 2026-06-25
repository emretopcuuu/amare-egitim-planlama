"use client";

import { useEffect, useState } from "react";

// UX #7 — Admin görünüm tercihleri: yazı boyu (A / A+) ve yüksek kontrast.
// Sahnedeki parlak ışıkta okunabilirlik. documentElement'e data-admin-yazi /
// data-admin-kontrast yazılır; CSS (.admin-kok altı) buna göre uygular.
const YAZI = "la_admin_yazi_v1";
const KONTRAST = "la_admin_kontrast_v1";

export default function AdminGorunum() {
  const [buyuk, setBuyuk] = useState(false);
  const [kontrast, setKontrast] = useState(false);

  useEffect(() => {
    try {
      const b = localStorage.getItem(YAZI) === "buyuk";
      const k = localStorage.getItem(KONTRAST) === "yuksek";
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBuyuk(b);
      setKontrast(k);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-admin-yazi", buyuk ? "buyuk" : "normal");
    try {
      localStorage.setItem(YAZI, buyuk ? "buyuk" : "normal");
    } catch {}
  }, [buyuk]);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-admin-kontrast",
      kontrast ? "yuksek" : "normal"
    );
    try {
      localStorage.setItem(KONTRAST, kontrast ? "yuksek" : "normal");
    } catch {}
  }, [kontrast]);

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={() => setBuyuk((b) => !b)}
        aria-pressed={buyuk}
        title="Yazı boyu (büyüt/küçült)"
        className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors ${
          buyuk
            ? "border-gold/50 bg-gold/15 text-gold-light"
            : "border-white/15 text-slate-300 hover:bg-white/5"
        }`}
      >
        A<span className="text-[0.85em]">+</span>
      </button>
      <button
        type="button"
        onClick={() => setKontrast((k) => !k)}
        aria-pressed={kontrast}
        title="Yüksek kontrast"
        className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors ${
          kontrast
            ? "border-gold/50 bg-gold/15 text-gold-light"
            : "border-white/15 text-slate-300 hover:bg-white/5"
        }`}
      >
        ◑
      </button>
    </div>
  );
}

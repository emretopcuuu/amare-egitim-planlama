"use client";

import { useEffect, useState } from "react";

const DEPO = "la_admin_mod_v1";
export type AdminModTipi = "basit" | "uzman";

// UX #1 — Basit / Uzman mod. Varsayılan BASİT: panelde yalnız "neredeyiz +
// sonraki adım + canlı durum" görünür; ileri/araç/tehlike bölümleri gizli.
// Uzman tek tıkla hepsini açar. Mod documentElement'e data-admin-mod olarak
// yazılır; CSS (.uzman-only / .basit-only) görünürlüğü buna göre yönetir.
export default function AdminMod() {
  const [mod, setMod] = useState<AdminModTipi>("basit");

  useEffect(() => {
    let m: AdminModTipi = "basit";
    try {
      m = localStorage.getItem(DEPO) === "uzman" ? "uzman" : "basit";
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMod(m);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-admin-mod", mod);
    try {
      localStorage.setItem(DEPO, mod);
    } catch {}
  }, [mod]);

  return (
    <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-6 py-2">
      <p className="text-xs text-slate-500">
        {mod === "basit"
          ? "Basit görünüm — yalnız temel adımlar"
          : "Uzman görünüm — tüm araçlar açık"}
      </p>
      <div className="flex shrink-0 overflow-hidden rounded-full border border-royal-light/30 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMod("basit")}
          aria-pressed={mod === "basit"}
          className={`px-3 py-1.5 transition-colors ${
            mod === "basit" ? "bg-gold text-[#1a1206]" : "text-slate-300 hover:bg-white/5"
          }`}
        >
          Basit
        </button>
        <button
          type="button"
          onClick={() => setMod("uzman")}
          aria-pressed={mod === "uzman"}
          className={`px-3 py-1.5 transition-colors ${
            mod === "uzman" ? "bg-gold text-[#1a1206]" : "text-slate-300 hover:bg-white/5"
          }`}
        >
          Uzman
        </button>
      </div>
    </div>
  );
}

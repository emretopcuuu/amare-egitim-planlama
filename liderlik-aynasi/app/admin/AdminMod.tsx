"use client";

import { useEffect, useState } from "react";
import AdminGorunum from "./AdminGorunum";

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
    <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
      <p className="min-w-0 text-xs text-slate-400">
        {mod === "basit"
          ? "🟢 Basit görünüm — yalnız temel adımlar görünür"
          : "🛠 Uzman görünüm — tüm araçlar açık"}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <AdminGorunum />
        <div className="flex overflow-hidden rounded-full border border-gold/40 text-xs font-bold">
        <button
          type="button"
          onClick={() => setMod("basit")}
          aria-pressed={mod === "basit"}
          className={`px-4 py-2 transition-colors ${
            mod === "basit" ? "bg-gold text-[#1a1206]" : "text-slate-300 hover:bg-white/5"
          }`}
        >
          Basit
        </button>
        <button
          type="button"
          onClick={() => setMod("uzman")}
          aria-pressed={mod === "uzman"}
          className={`px-4 py-2 transition-colors ${
            mod === "uzman" ? "bg-gold text-[#1a1206]" : "text-slate-300 hover:bg-white/5"
          }`}
        >
          Uzman
        </button>
        </div>
      </div>
    </div>
  );
}

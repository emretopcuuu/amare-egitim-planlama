"use client";

import { tr } from "@/lib/i18n/tr";

// Hatıra: raporu tarayıcının "Yazdır → PDF olarak kaydet" akışıyla sakla.
// yazdir-gizle sınıfı baskıda bu butonu ve menüyü gizler (globals.css).
export default function RaporKaydet() {
  return (
    <button
      onClick={() => window.print()}
      className="yazdir-gizle mx-auto flex h-12 items-center justify-center rounded-xl border border-white/20 px-5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/[0.08]"
    >
      {tr.ayna.raporKaydet}
    </button>
  );
}

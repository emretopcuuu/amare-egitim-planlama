"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import YaziBoyu from "./YaziBoyu";
import TemaSecimi from "./TemaSecimi";

// Admin, giriş ve ekran rotalarında gizle — bunların kendi ayar alanları var.
const GIZLI_ROTALAR = ["/admin", "/giris", "/ekran"];

export default function AyarlarKopuk() {
  const pathname = usePathname();
  const [acik, setAcik] = useState(false);

  if (GIZLI_ROTALAR.some((r) => pathname.startsWith(r))) return null;

  return (
    <>
      {/* Dişli buton — sağ üst köşe */}
      <button
        onClick={() => setAcik(true)}
        aria-label="Görünüm ayarları"
        className="fixed right-3 top-2 z-40 flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.07] text-slate-400 backdrop-blur-sm transition-colors hover:bg-white/[0.13] hover:text-slate-200 print:hidden"
        style={{ top: "max(0.5rem, env(safe-area-inset-top, 0px))" }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      </button>

      {/* Alt çekmece */}
      {acik && (
        <>
          <button
            aria-label="Kapat"
            onClick={() => setAcik(false)}
            className="fixed inset-0 z-40 cursor-default bg-black/50"
          />
          <div
            role="dialog"
            aria-label="Görünüm ayarları"
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-white/10 bg-[#1a1035] px-5 pb-8 pt-4"
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-slate-500">
              Görünüm
            </p>
            <div className="space-y-3">
              <YaziBoyu />
              <TemaSecimi />
            </div>
            <button
              onClick={() => setAcik(false)}
              className="mt-5 w-full rounded-xl py-3 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Kapat
            </button>
          </div>
        </>
      )}
    </>
  );
}

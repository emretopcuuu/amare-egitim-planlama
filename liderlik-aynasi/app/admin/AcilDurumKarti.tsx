"use client";

import Link from "next/link";
import { useState } from "react";

// UX #8 — "Bir şeyler ters giderse" acil kartı. Her admin sayfasının sol altında
// küçük bir düğme; panik anında operatöre net çıkış yolları sunar: her şeyi
// duraklat (Prova), son işlemi gör/geri al, sayfayı tazele, kime haber verilir.
export default function AcilDurumKarti() {
  const [acik, setAcik] = useState(false);

  return (
    <div className="fixed bottom-3 left-3 z-40 print:hidden">
      {acik && (
        <div
          role="dialog"
          aria-label="Acil durum"
          className="mb-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-red-400/40 bg-midnight-card p-4 shadow-2xl"
        >
          <p className="mb-2 text-sm font-bold text-red-200">🆘 Bir şeyler ters giderse</p>
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                href="/admin/sistem#prova"
                onClick={() => setAcik(false)}
                className="block rounded-lg bg-white/[0.03] px-3 py-2 text-slate-200 transition-colors hover:bg-white/[0.07]"
              >
                ⏸ <span className="font-semibold">Her şeyi duraklat</span> — Prova moduna al
                (canlı bildirim gitmez)
              </Link>
            </li>
            <li>
              <Link
                href="/admin#islem-gunlugu"
                onClick={() => setAcik(false)}
                className="block rounded-lg bg-white/[0.03] px-3 py-2 text-slate-200 transition-colors hover:bg-white/[0.07]"
              >
                ↶ <span className="font-semibold">Son işlemi gör / geri al</span> — İşlem
                günlüğü
              </Link>
            </li>
            <li>
              <button
                onClick={() => location.reload()}
                className="block w-full rounded-lg bg-white/[0.03] px-3 py-2 text-left text-slate-200 transition-colors hover:bg-white/[0.07]"
              >
                ↻ <span className="font-semibold">Sayfayı tazele</span> — takılırsa
              </button>
            </li>
            <li className="rounded-lg bg-white/[0.03] px-3 py-2 text-slate-300">
              📞 <span className="font-semibold">Kime haber ver:</span> kamp sorumlusu /
              Presidential Diamond ekibi. Kriz sinyali zaten otomatik onlara iletilir.
            </li>
          </ul>
        </div>
      )}
      <button
        onClick={() => setAcik((a) => !a)}
        aria-expanded={acik}
        className="flex h-11 items-center gap-1.5 rounded-full border border-red-400/40 bg-midnight-card/90 px-4 text-sm font-bold text-red-200 shadow-lg backdrop-blur transition-transform hover:scale-105 active:scale-95"
      >
        🆘 {acik ? "Kapat" : "Yardım"}
      </button>
    </div>
  );
}

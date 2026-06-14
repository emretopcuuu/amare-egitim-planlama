"use client";

import { useState } from "react";
import { tr } from "@/lib/i18n/tr";

// #10 Admin yardım katmanı: her kontrolün yanında küçük "?" → ne işe yarar,
// ne zaman basılır. Acemi bir görevli bile paneli korkmadan kullansın.
export default function Ipucu({ metin }: { metin: string }) {
  const [acik, setAcik] = useState(false);
  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        onClick={() => setAcik((a) => !a)}
        aria-label={tr.admin.ipucu.ac}
        aria-expanded={acik}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-white/25 text-xs font-bold text-slate-300 transition-colors hover:bg-white/10"
      >
        ?
      </button>
      {acik && (
        <span
          role="tooltip"
          className="absolute left-0 top-8 z-30 w-64 rounded-xl border border-royal-light/40 bg-midnight-card p-3 text-xs font-normal leading-relaxed text-slate-200 shadow-xl"
        >
          {metin}
        </span>
      )}
    </span>
  );
}

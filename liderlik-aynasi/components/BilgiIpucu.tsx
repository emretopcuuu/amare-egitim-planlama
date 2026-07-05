"use client";

import { useState } from "react";

// [E9] KATILIMCI TARAFI ⓘ İPUCU — admin'deki Ipucu'nun (app/admin/Ipucu.tsx)
// sade kardeşi: etiketin yanındaki küçük "i"ye dokununca tek paragraflık
// açıklama açılır; dışarı dokununca kapanır. Etiket gruplaması/portal yok —
// katılımcı formlarındaki tek cümlelik yardımlar için yeterli ve hafif.
export default function BilgiIpucu({
  metin,
  etiket = "Bilgi",
}: {
  metin: string;
  etiket?: string;
}) {
  const [acik, setAcik] = useState(false);

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        onClick={() => setAcik((a) => !a)}
        aria-label={etiket}
        aria-expanded={acik}
        className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-white/25 text-[0.65rem] font-bold text-slate-400 transition-colors hover:border-gold/50 hover:text-gold-light"
      >
        i
      </button>
      {acik && (
        <>
          {/* Dışarı dokununca kapat */}
          <button
            aria-hidden
            tabIndex={-1}
            onClick={() => setAcik(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <span className="absolute left-0 top-full z-50 mt-1.5 block w-64 max-w-[calc(100vw-2.5rem)] rounded-xl border border-royal-light/40 bg-midnight-card p-3 text-left text-xs font-normal leading-relaxed text-slate-200 shadow-2xl">
            {metin}
          </span>
        </>
      )}
    </span>
  );
}

"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";

// Ortak "AYNA yazıyor…" göstergesi — Pusula/Hedef/Koçu sohbetlerinde aynı his.
// Sıçrayan üç nokta + etiket; yanıt uzarsa (~6 sn) altına nazik bir bekleme
// satırı düşer ki kişi "dondu mu?" deyip ekrandan çıkmasın (#2 UX).
export default function AynaYaziyor({
  etiket = tr.aynaYaziyor.etiket,
}: {
  etiket?: string;
}) {
  const [uzun, setUzun] = useState(false);
  useEffect(() => {
    const z = setTimeout(() => setUzun(true), 6000);
    return () => clearTimeout(z);
  }, []);
  return (
    <div className="flex justify-start" role="status" aria-live="polite">
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-midnight-card/90 px-4 py-3 ring-1 ring-royal/25 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="flex gap-1" aria-hidden>
            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300" />
          </span>
          <span className="text-sm text-slate-400">{etiket}</span>
        </div>
        {uzun && (
          <p className="mt-1.5 text-xs text-slate-500">{tr.aynaYaziyor.uzunSurdu}</p>
        )}
      </div>
    </div>
  );
}

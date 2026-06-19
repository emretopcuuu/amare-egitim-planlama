"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";
import { type TemaMod, type EtkinTema, etkinTema, temaModOku, temaUygula } from "@/lib/tema";

const t = tr.tema;
// Sıra: otomatik → gece → gündüz → otomatik …
const SIRA: TemaMod[] = ["otomatik", "gece", "gunduz"];
const IKON: Record<TemaMod, string> = { otomatik: "🌗", gece: "🌙", gunduz: "☀️" };
const ETIKET: Record<TemaMod, string> = { otomatik: t.otomatik, gece: t.gece, gunduz: t.gunduz };

// Kompakt gece/gündüz/otomatik geçiş düğmesi — admin nav gibi dar yerler için.
// Tıkladıkça sıradaki moda geçer; "otomatik"te o an hangisine çözüldüğünü
// (gündüz/gece) küçük rozetle gösterir.
export default function TemaDugmesi({ className = "" }: { className?: string }) {
  const [mod, setMod] = useState<TemaMod>("otomatik");
  const [etkin, setEtkin] = useState<EtkinTema>("gece");

  useEffect(() => {
    const m = temaModOku();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMod(m);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEtkin(etkinTema(m));
  }, []);

  function dondur() {
    const sonraki = SIRA[(SIRA.indexOf(mod) + 1) % SIRA.length];
    titret(8);
    setMod(sonraki);
    setEtkin(temaUygula(sonraki));
  }

  return (
    <button
      type="button"
      onClick={dondur}
      title={`${t.baslik}: ${ETIKET[mod]}`}
      aria-label={`${t.baslik}: ${ETIKET[mod]}`}
      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-midnight-card ${className}`}
    >
      <span aria-hidden className="text-base leading-none">
        {IKON[mod]}
      </span>
      <span className="hidden sm:inline">{ETIKET[mod]}</span>
      {mod === "otomatik" && (
        <span aria-hidden className="text-xs opacity-70">
          {etkin === "gunduz" ? "☀️" : "🌙"}
        </span>
      )}
    </button>
  );
}

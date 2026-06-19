"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";
import {
  type TemaMod,
  type EtkinTema,
  etkinTema,
  temaModOku,
  temaUygula,
} from "@/lib/tema";

const t = tr.tema;

// GECE / GÜNDÜZ / OTOMATİK seçici — Güneş Modu'nun yerine. Üç parçalı segment;
// "Otomatik" varsayılan ve o an hangisine çözüldüğünü altta gösterir. Seçim
// cihazda saklanır, anında uygulanır (layout inline script açılışta uygular).
const SECENEKLER: { mod: TemaMod; etiket: string; ikon: string }[] = [
  { mod: "gece", etiket: t.gece, ikon: "🌙" },
  { mod: "gunduz", etiket: t.gunduz, ikon: "☀️" },
  { mod: "otomatik", etiket: t.otomatik, ikon: "🌗" },
];

export default function TemaSecimi() {
  const [mod, setMod] = useState<TemaMod>("otomatik");
  const [etkin, setEtkin] = useState<EtkinTema>("gece");

  useEffect(() => {
    const m = temaModOku();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMod(m);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEtkin(etkinTema(m));
  }, []);

  function sec(yeni: TemaMod) {
    titret(8);
    setMod(yeni);
    setEtkin(temaUygula(yeni));
  }

  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-200">🎨 {t.baslik}</p>
          <p className="mt-0.5 text-xs text-slate-400">{t.aciklama}</p>
        </div>
      </div>
      <div
        role="radiogroup"
        aria-label={t.baslik}
        className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl bg-black/20 p-1"
      >
        {SECENEKLER.map((s) => {
          const aktif = mod === s.mod;
          return (
            <button
              key={s.mod}
              type="button"
              role="radio"
              aria-checked={aktif}
              onClick={() => sec(s.mod)}
              className={`flex h-11 flex-col items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                aktif
                  ? "bg-gold text-midnight shadow"
                  : "text-slate-300 hover:bg-white/5"
              }`}
            >
              <span aria-hidden className="text-base leading-none">
                {s.ikon}
              </span>
              <span className="mt-0.5">{s.etiket}</span>
            </button>
          );
        })}
      </div>
      {mod === "otomatik" && (
        <p className="mt-2 text-center text-xs text-slate-400">
          {t.otomatikSimdi(etkin === "gunduz" ? t.gunduzKisa : t.geceKisa)}
        </p>
      )}
    </div>
  );
}

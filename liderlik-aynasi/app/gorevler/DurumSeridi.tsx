"use client";

import { useState } from "react";
import KampNabzi from "./KampNabzi";

// DURUM ŞERİDİ — eskiden 3 ayrı kart (unvan/ilerleme + kampın nabzı + bugün
// özeti) üst üste geliyordu. Hepsi TEK sakin, nötr şeride indi: özet satırı her
// zaman görünür, detay dokununca açılır. Aktif görev varken varsayılan KAPALI →
// ekran asıl işe (göreve) odaklanır.
type Props = {
  kivilcim: number;
  unvanAd: string;
  unvanYuzde: number;
  sonrakiMetin: string | null; // "Kor unvanına 82 kıvılcım" / null = zirve
  zirveMetin: string | null;
  bugunGorev: number;
  gunlukKota: number;
  ozetMetin: string | null; // "Bugün 8 görev · +72 ⚡"
  seriMetin: string | null; // seri ateşi
  seriRiski: boolean;
  aktifVar: boolean;
};

export default function DurumSeridi({
  kivilcim,
  unvanAd,
  unvanYuzde,
  sonrakiMetin,
  zirveMetin,
  bugunGorev,
  gunlukKota,
  ozetMetin,
  seriMetin,
  seriRiski,
  aktifVar,
}: Props) {
  const [acik, setAcik] = useState(!aktifVar);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      {/* Özet satırı — her zaman görünür, dokununca detay açılır */}
      <button
        type="button"
        onClick={() => setAcik((a) => !a)}
        aria-expanded={acik}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-baseline gap-1.5">
          <span className="font-display text-base font-bold text-gold-light tabular-nums">
            {kivilcim}
          </span>
          <span className="text-xs text-gold-light/70" aria-hidden>⚡</span>
          <span className="text-sm font-medium text-slate-300">{unvanAd}</span>
        </span>
        {/* Günün ritmi — kompakt nokta dizisi (tek ilerleme göstergesi) */}
        <span className="ml-auto flex items-center gap-1.5">
          <span className="hidden items-center gap-1 sm:flex">
            {Array.from({ length: gunlukKota }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${i < bugunGorev ? "bg-gold" : "bg-white/15"}`}
                aria-hidden
              />
            ))}
          </span>
          <span className="text-xs font-semibold tabular-nums text-slate-400">
            {Math.min(bugunGorev, gunlukKota)}/{gunlukKota}
          </span>
          <span
            className={`text-slate-500 transition-transform ${acik ? "rotate-180" : ""}`}
            aria-hidden
          >
            ⌄
          </span>
        </span>
      </button>

      {/* Seri riski / ateşi — yalnız anlamlıyken, ince tek satır */}
      {(seriRiski || seriMetin) && (
        <p
          className={`px-4 pb-2 text-xs font-medium ${
            seriRiski ? "text-amber-300" : "text-orange-300/90"
          }`}
        >
          🔥 {seriRiski ? "Serin sürüyor — bugün henüz görev kapatmadın." : seriMetin}
        </p>
      )}

      {/* Detay — açılınca */}
      {acik && (
        <div className="space-y-3 border-t border-white/5 px-4 pb-4 pt-3">
          {/* Unvan ilerleme çubuğu */}
          <div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold transition-all duration-700"
                style={{ width: `${unvanYuzde}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              {sonrakiMetin ?? (zirveMetin ? `⭐ ${zirveMetin}` : "")}
            </p>
          </div>
          {/* Bugünün özeti — eski yeşil banner buraya gömüldü */}
          {ozetMetin && <p className="text-xs text-slate-400">{ozetMetin}</p>}
          {/* Kampın nabzı (kendi verisini çeker) */}
          <KampNabzi />
        </div>
      )}
    </section>
  );
}

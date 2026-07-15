"use client";

import { useState } from "react";
import type { KursuSatiri, KisiselSatir, Kategori } from "@/lib/rekorlar";

// Sunucudaki degerYazi ile aynı biçim (server-only modülü istemciye çekmemek
// için küçük bir kopya).
function bicim(kat: Kategori, deger: number | null): string {
  if (deger == null) return "—";
  if (kat.key === "gece_kusu" || kat.key === "erken_kalkan") {
    return `${String(Math.floor(deger)).padStart(2, "0")}:00`;
  }
  return `${deger}${kat.birim === "/10" ? "/10" : kat.birim ? " " + kat.birim : ""}`;
}

export default function RekorGorunum({ kursu, kisisel }: { kursu: KursuSatiri[]; kisisel: KisiselSatir[] }) {
  const [sekme, setSekme] = useState<"kisisel" | "kamp">("kisisel");
  const liderSayim = kisisel.filter((k) => k.liderMi).length;

  return (
    <div className="space-y-4">
      {/* Sekme */}
      <div className="flex gap-2 rounded-2xl bg-midnight-card/50 p-1">
        {(["kisisel", "kamp"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSekme(s)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
              sekme === s ? "bg-royal/40 text-gold-light" : "text-slate-400"
            }`}
          >
            {s === "kisisel" ? "Rekorlarım" : "Kamp Rekorları"}
          </button>
        ))}
      </div>

      {sekme === "kisisel" && liderSayim > 0 && (
        <p className="rounded-xl border border-gold/30 bg-gold/[0.06] p-3 text-center text-sm text-gold-light">
          🥇 {liderSayim} kategoride kampın rekortmenisin!
        </p>
      )}

      {sekme === "kisisel" ? (
        <div className="grid gap-2">
          {kisisel.map((k) => (
            <div
              key={k.kategori.key}
              className={`rounded-2xl border p-3.5 ${
                k.liderMi ? "border-gold/50 bg-gold/[0.08]" : "border-royal/25 bg-midnight-card/40"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden>{k.kategori.ikon}</span>
                  <span className="text-sm font-semibold text-slate-100">{k.kategori.ad}</span>
                  {k.liderMi && <span className="text-[0.6rem] font-bold uppercase text-gold-light">rekortmen</span>}
                </div>
                <span className="text-sm font-bold text-gold-light">{bicim(k.kategori, k.benim)}</span>
              </div>
              {!k.liderMi && (
                k.benim == null ? (
                  <p className="mt-1 pl-7 text-xs text-slate-500">
                    Rekor {bicim(k.kategori, k.rekor)} · ilk deneyen sen ol
                  </p>
                ) : k.sira != null && k.sira <= 10 ? (
                  <p className="mt-1 pl-7 text-xs font-semibold text-gold-light/80">
                    🏅 {k.sira}. sıra · {k.toplam} kişi içinde
                    {k.uzaklik ? ` · rekora ${k.uzaklik}` : ""}
                  </p>
                ) : (
                  <p className="mt-1 pl-7 text-xs text-royal-light/80">
                    İlk 10&apos;a yaklaşıyorsun 💪 · rekor {bicim(k.kategori, k.rekor)}
                  </p>
                )
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-2">
          {kursu.map((k) => (
            <div key={k.kategori.key} className="rounded-2xl border border-royal/25 bg-midnight-card/40 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden>{k.kategori.ikon}</span>
                  <span className="text-sm font-semibold text-slate-100">{k.kategori.ad}</span>
                </div>
                <span className="text-sm font-bold text-gold-light">{bicim(k.kategori, k.deger)}</span>
              </div>
              <p className="mt-1 pl-7 text-xs text-slate-400">{k.ad ? `👑 ${k.ad}` : "henüz rekortmen yok"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

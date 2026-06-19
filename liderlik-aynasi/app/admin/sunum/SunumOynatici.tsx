"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { sunumSenaryo, type SunumAdimi, type RadarNok } from "@/lib/sunumSenaryo";
import { tr } from "@/lib/i18n/tr";
import Ipucu from "../Ipucu";

const t = tr.admin.sunum;

export default function SunumOynatici({ tohum }: { tohum: number }) {
  const [seed, setSeed] = useState(tohum);
  // Her açılışta farklı aday/varyasyon — Math.random render'da değil mount'ta.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeed(Math.floor(Math.random() * 1_000_000_000));
  }, []);
  const senaryo = useMemo(() => sunumSenaryo(seed), [seed]);
  const adimlar = senaryo.adimlar;
  const [i, setI] = useState(0);
  const adim = adimlar[i];

  const ileri = useCallback(
    () => setI((x) => Math.min(adimlar.length - 1, x + 1)),
    [adimlar.length]
  );
  const geri = useCallback(() => setI((x) => Math.max(0, x - 1)), []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        ileri();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        geri();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [ileri, geri]);

  function karistir() {
    setSeed(Math.floor(Math.random() * 1_000_000_000));
    setI(0);
  }

  const ilk = i === 0;
  const son = i === adimlar.length - 1;
  const yuzde = Math.round(((i + 1) / adimlar.length) * 100);

  return (
    <div className="flex min-h-dvh flex-col bg-midnight">
      {/* Üst bar */}
      <header className="flex items-center justify-between gap-3 border-b border-royal/30 px-5 py-3">
        <div className="flex items-center gap-2">
          <Link href="/admin" className="text-sm text-slate-400 hover:text-slate-200">
            ← {t.cik}
          </Link>
          <Ipucu {...tr.admin.yardim.sunum} />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">{senaryo.aday.takim}</span>
          <span className="font-semibold text-gold-light">{senaryo.aday.ad}</span>
        </div>
        <button
          onClick={karistir}
          className="rounded-lg border border-royal/40 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-white/5"
        >
          🔀 {t.karistir}
        </button>
      </header>

      {/* İlerleme */}
      <div className="px-5 pt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wide text-royal-light">
            {adim.faz}
          </span>
          <span className="text-slate-500">{adim.zaman}</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-midnight-soft">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold transition-all duration-500"
            style={{ width: `${yuzde}%` }}
          />
        </div>
      </div>

      {/* Sahne: telefon + sunum notu */}
      <main className="flex flex-1 flex-col items-center gap-5 px-5 py-6">
        <Telefon>
          <Ekran key={`${seed}-${i}`} adim={adim} />
        </Telefon>

        <div className="w-full max-w-xl rounded-2xl border border-gold/30 bg-gold/[0.06] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-light">
            🎤 {t.sunumNotu}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-200">{adim.sunumNotu}</p>
        </div>
      </main>

      {/* Kontroller */}
      <footer className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-royal/30 bg-midnight/95 px-5 py-4 backdrop-blur">
        <button
          onClick={geri}
          disabled={ilk}
          className="rounded-xl border border-royal/40 px-5 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5 disabled:opacity-30"
        >
          ← {t.geri}
        </button>
        <span className="font-mono text-sm text-slate-400">
          {i + 1} / {adimlar.length}
        </span>
        <button
          onClick={() => (son ? setI(0) : ileri())}
          className="btn-kor parilti rounded-xl px-8 py-3 text-base font-bold"
        >
          {son ? `↺ ${t.bastan}` : `${t.ileri} →`}
        </button>
      </footer>
    </div>
  );
}

// ---- Telefon çerçevesi ----
function Telefon({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[20rem] shrink-0">
      <div className="rounded-[2.2rem] border-4 border-midnight-soft bg-black p-2 shadow-2xl">
        <div className="relative h-[34rem] overflow-hidden rounded-[1.7rem] bg-midnight">
          <div className="absolute left-1/2 top-0 z-10 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-black" />
          <div className="h-full overflow-y-auto px-4 pb-6 pt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

// ---- AYNA baloncuğu ----
function AynaBalon({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl rounded-tl-sm border border-royal-light/30 bg-midnight-card/80 p-3">
      <p className="mb-1 text-[0.6rem] font-bold uppercase tracking-[0.25em] text-royal-light">
        🤖 {t.ayna}
      </p>
      <p className="text-sm leading-relaxed text-slate-100">{children}</p>
    </div>
  );
}

function Baslik({ ikon, metin }: { ikon?: string; metin: string }) {
  return (
    <h3 className="prizma-serif ay-metin text-center text-xl font-semibold">
      {ikon ? `${ikon} ` : ""}
      {metin}
    </h3>
  );
}

// ---- Ekran yönlendirici ----
function Ekran({ adim }: { adim: SunumAdimi }) {
  const e = adim.ekran;
  return (
    <div className="space-y-3">
      {e === "giris" && (
        <div className="flex h-full flex-col items-center justify-center gap-4 pt-10 text-center">
          <span className="text-5xl">🧭</span>
          <Baslik metin={adim.baslik} />
          <p className="text-sm text-slate-400">{adim.govde}</p>
        </div>
      )}

      {e === "pusula" && (
        <>
          <Baslik ikon="🧭" metin={adim.baslik} />
          <p className="text-sm text-slate-300">{adim.govde}</p>
          {adim.yorum && <AynaBalon>{adim.yorum}</AynaBalon>}
        </>
      )}

      {e === "ozpuan" && (
        <>
          <Baslik ikon="⭐" metin={adim.baslik} />
          <p className="text-center text-xs text-slate-400">{adim.govde}</p>
          {adim.radar && <MiniRadar veri={adim.radar} />}
          <Lejant />
        </>
      )}

      {e === "canliAyna" && (
        <div className="flex flex-col items-center gap-4 pt-6 text-center">
          <p className="prizma-serif text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">
            Son bir şey
          </p>
          <div className="flex h-40 w-40 items-center justify-center rounded-full text-5xl ring-4 ring-gold/50">
            🔮
          </div>
          <Baslik metin={adim.baslik} />
          <p className="text-sm text-slate-400">{adim.govde}</p>
        </div>
      )}

      {e === "gorev" && (
        <>
          {adim.turEtiket && (
            <span className="inline-block rounded-full bg-royal/30 px-3 py-1 text-xs font-semibold text-royal-light">
              {adim.turEtiket}
            </span>
          )}
          <Baslik metin={adim.baslik} />
          <AynaBalon>{adim.govde}</AynaBalon>
          {adim.yorum && (
            <div className="rounded-xl bg-black/20 p-3">
              <p className="text-[0.6rem] font-bold uppercase tracking-wide text-slate-500">
                {t.yanitEtiket}
              </p>
              <p className="mt-1 text-sm text-slate-300">{adim.yorum}</p>
            </div>
          )}
          {adim.puan != null && <Puan puan={adim.puan} kivilcim={adim.kivilcim} />}
        </>
      )}

      {e === "puanlama" && (
        <>
          <Baslik ikon="✓" metin={adim.baslik} />
          {adim.govde && (
            <div className="rounded-2xl rounded-tr-sm bg-royal/25 p-3">
              <p className="text-sm text-slate-100">{adim.govde}</p>
            </div>
          )}
          {adim.yorum && <AynaBalon>{adim.yorum}</AynaBalon>}
          {adim.puan != null && <Puan puan={adim.puan} kivilcim={adim.kivilcim} />}
        </>
      )}

      {e === "dalga" && (
        <>
          <Baslik ikon="🌊" metin={adim.baslik} />
          <p className="text-xs text-slate-400">{adim.govde}</p>
          <div className="space-y-2">
            {(adim.geriBildirim ?? []).map((g, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-white/5 bg-white/[0.03] p-3"
              >
                <p className="text-[0.6rem] uppercase tracking-wide text-slate-500">
                  ✦ {t.gizliAdim}
                </p>
                <p className="mt-1 text-sm text-slate-200">{g}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {(e === "rapor" || e === "final") && (
        <>
          <Baslik ikon={e === "final" ? "🏆" : "👁"} metin={adim.baslik} />
          {adim.govde && <p className="text-center text-xs text-slate-400">{adim.govde}</p>}
          {adim.radar && <MiniRadar veri={adim.radar} />}
          <Lejant />
          {adim.metrikler && (
            <div className="grid grid-cols-2 gap-2">
              {adim.metrikler.map((m) => (
                <div
                  key={m.etiket}
                  className="rounded-xl bg-midnight-card/60 p-2.5 text-center ring-1 ring-royal/30"
                >
                  <p className="text-base font-bold text-gold">{m.deger}</p>
                  <p className="mt-0.5 text-[0.65rem] text-slate-400">{m.etiket}</p>
                </div>
              ))}
            </div>
          )}
          {adim.yorum && <AynaBalon>{adim.yorum}</AynaBalon>}
        </>
      )}

      {e === "momentum" && (
        <div className="flex flex-col items-center gap-3 pt-4 text-center">
          <Baslik ikon="📈" metin={adim.baslik} />
          <p className="font-display text-6xl font-bold text-gold">{adim.momentum}</p>
          <p className="text-xs text-slate-400">/ 100 {t.momentumEtiket}</p>
          {adim.momentumOnceki != null && adim.momentum != null && (
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
              ▲ +{adim.momentum - adim.momentumOnceki}
            </span>
          )}
          {adim.govde && <p className="text-sm text-slate-400">{adim.govde}</p>}
        </div>
      )}

      {e === "reddiKutla" && (
        <>
          <Baslik ikon="🎉" metin={adim.baslik} />
          <p className="text-sm text-slate-300">{adim.govde}</p>
          {adim.yorum && <AynaBalon>{adim.yorum}</AynaBalon>}
          {adim.kivilcim != null && <Puan kivilcim={adim.kivilcim} />}
        </>
      )}

      {e === "kayma" && (
        <>
          <Baslik ikon="🌙" metin={adim.baslik} />
          <p className="text-sm text-slate-400">{adim.govde}</p>
          {adim.yorum && <AynaBalon>{adim.yorum}</AynaBalon>}
        </>
      )}

      {e === "rozet" && (
        <div className="flex flex-col items-center gap-3 pt-4 text-center">
          <Baslik metin={adim.baslik} />
          {adim.rozet && (
            <div className="parilti flex flex-col items-center gap-2 rounded-2xl bg-gold/10 px-6 py-5 ring-1 ring-gold/40">
              <span className="text-5xl">{adim.rozet.ikon}</span>
              <p className="text-base font-bold text-gold-light">{adim.rozet.ad}</p>
              <p className="text-xs text-slate-400">{adim.rozet.alt}</p>
            </div>
          )}
          {adim.momentum != null && adim.momentumOnceki != null && (
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
              {t.momentumEtiket} ▲ +{adim.momentum - adim.momentumOnceki}
            </span>
          )}
          {adim.govde && <p className="text-sm text-slate-400">{adim.govde}</p>}
        </div>
      )}

      {e === "soz" && (
        <div className="flex flex-col items-center gap-4 pt-6 text-center">
          <span className="text-5xl">🤝</span>
          <Baslik metin={adim.baslik} />
          <AynaBalon>{adim.govde}</AynaBalon>
        </div>
      )}
    </div>
  );
}

function Puan({ puan, kivilcim }: { puan?: number; kivilcim?: number }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-xl bg-gold/10 p-3 ring-1 ring-gold/30">
      {puan != null && (
        <span className="text-sm font-bold text-gold-light">AYNA: {puan}/10</span>
      )}
      {kivilcim != null && (
        <span className="text-sm font-bold text-gold">+{kivilcim} ⚡</span>
      )}
    </div>
  );
}

function Lejant() {
  return (
    <div className="flex items-center justify-center gap-4 text-[0.65rem]">
      <span className="flex items-center gap-1 text-gold-light">
        <span className="inline-block h-2 w-2 rounded-full bg-gold" /> {t.ozEtiket}
      </span>
      <span className="flex items-center gap-1 text-royal-light">
        <span className="inline-block h-2 w-2 rounded-full bg-royal" /> {t.disEtiket}
      </span>
    </div>
  );
}

// ---- Mini ikili radar (öz vs dış) ----
function MiniRadar({ veri }: { veri: RadarNok[] }) {
  const N = veri.length;
  const R = 64;
  const cx = 95;
  const cy = 90;
  const nokta = (i: number, oran: number) => {
    const a = (2 * Math.PI * i) / N - Math.PI / 2;
    return [cx + R * oran * Math.cos(a), cy + R * oran * Math.sin(a)];
  };
  const cizgi = (key: "oz" | "dis") =>
    veri.map((d, i) => nokta(i, Math.max(0.05, d[key] / 10)).join(",")).join(" ");
  return (
    <svg viewBox="0 0 190 180" className="mx-auto w-full max-w-[15rem]">
      {[0.25, 0.5, 0.75, 1].map((o) => (
        <polygon
          key={o}
          points={veri.map((_, i) => nokta(i, o).join(",")).join(" ")}
          fill="none"
          stroke="rgba(156,195,224,0.18)"
        />
      ))}
      <polygon
        points={cizgi("dis")}
        fill="rgba(124,58,237,0.25)"
        stroke="#7C3AED"
        strokeWidth="2"
      />
      <polygon
        points={cizgi("oz")}
        fill="rgba(212,175,55,0.22)"
        stroke="#D4AF37"
        strokeWidth="2"
      />
      {veri.map((d, i) => {
        const [x, y] = nokta(i, 1.2);
        return (
          <text
            key={d.ad}
            x={x}
            y={y}
            textAnchor="middle"
            fontSize="7.5"
            className="fill-slate-400"
          >
            {d.ad}
          </text>
        );
      })}
    </svg>
  );
}

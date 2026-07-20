"use client";

import { useState } from "react";
import { titret } from "@/lib/his";
import MikrofonButonu from "@/components/MikrofonButonu";

type Halka = {
  halka: number;
  acik: boolean;
  teyit: string | null;
  tarih: string | null;
};

// [4.2] ARA MÜHÜR ZİNCİRİ — istemci: söz (ilk halka) + 30/60/90 ara mühürleri.
// Açık ve teyitsiz halkada tek cümlelik teyit kutusu; teyitli halka mühürlü;
// kapalı halka kilitli görünür.
export default function MuhurZinciri({
  soz,
  zirveKelime = null,
  zirvePuan = null,
  halkalar,
}: {
  soz: string | null;
  zirveKelime?: string | null;
  zirvePuan?: number | null;
  halkalar: Halka[];
}) {
  const [durum, setDurum] = useState<Halka[]>(halkalar);
  const [girdi, setGirdi] = useState<Record<number, string>>({});
  const [yukleniyor, setYukleniyor] = useState<number | null>(null);
  const [hata, setHata] = useState<number | null>(null);

  async function teyitEt(h: number) {
    const teyit = (girdi[h] ?? "").trim();
    if (teyit.length < 3 || yukleniyor != null) return;
    setYukleniyor(h);
    setHata(null);
    try {
      const r = await fetch("/api/muhur-zinciri", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ halka: h, teyit }),
      });
      if (r.ok) {
        setDurum((d) =>
          d.map((x) =>
            x.halka === h ? { ...x, teyit, tarih: new Date().toISOString() } : x
          )
        );
        titret([12, 40, 12, 40, 30]);
      } else {
        setHata(h);
      }
    } catch {
      setHata(h);
    } finally {
      setYukleniyor(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* İLK HALKA — kamptaki söz */}
      <div className="rounded-2xl border border-gold/40 bg-gold/[0.07] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold-light">İlk halka · Kamp Sözün</p>
        {soz ? (
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-200">{soz}</p>
        ) : (
          <p className="mt-2 text-sm text-slate-400">Kampta bir söz mühürlemedin. Zincir buradan başlar.</p>
        )}
      </div>

      {durum.map((h) => {
        const mühürlü = !!h.teyit;
        return (
          <div key={h.halka} className="flex flex-col items-center">
            <span className="text-lg text-white/20" aria-hidden>⛓</span>
            <div
              className={`w-full rounded-2xl border p-4 ${
                mühürlü
                  ? "border-emerald-400/30 bg-emerald-400/[0.06]"
                  : h.acik
                    ? "border-gold/30 bg-midnight-card/60"
                    : "border-white/10 bg-midnight-card/30"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                +{h.halka} gün ara mühür
              </p>

              {/* [7] GELECEĞE ÇAPA — +30 halkası açılınca kamp doruğunda
                  işaretlenen tek kelime geri çalınır: "o gün bunu hissettin". */}
              {h.halka === 30 && h.acik && !mühürlü && zirveKelime && (
                <div className="mt-2 rounded-xl border border-gold/25 bg-gold/[0.06] px-3 py-2.5">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-500">
                    ⚓ Kampın zirvesinde tek kelimen şuydu
                  </p>
                  <p className="prizma-serif mt-1 text-xl font-bold text-gold-light">
                    “{zirveKelime}”
                    {zirvePuan != null && (
                      <span className="ml-2 align-middle font-sans text-xs font-semibold text-slate-400">
                        his: {zirvePuan}/10
                      </span>
                    )}
                  </p>
                </div>
              )}

              {mühürlü ? (
                <p className="mt-2 text-sm leading-relaxed text-emerald-100">🔒 {h.teyit}</p>
              ) : h.acik ? (
                <>
                  <p className="mt-1 text-sm text-slate-400">
                    Sözünü yeniden oku. Tek cümleyle teyit et: bugün neredesin?
                  </p>
                  <textarea
                    value={girdi[h.halka] ?? ""}
                    onChange={(e) => setGirdi((g) => ({ ...g, [h.halka]: e.target.value }))}
                    rows={3}
                    maxLength={500}
                    placeholder="Örn. Hâlâ buradayım; bu ay ekibime bir kişi daha kazandırdım."
                    className="mt-3 w-full rounded-xl border-2 border-white/15 bg-white/[0.04] p-3 text-sm leading-relaxed text-slate-100 outline-none focus:border-gold"
                  />
                  <div className="mt-2">
                    <MikrofonButonu
                      onMetin={(p) =>
                        setGirdi((g) => {
                          const mevcut = (g[h.halka] ?? "").trim();
                          return { ...g, [h.halka]: (mevcut ? `${mevcut} ${p}` : p).slice(0, 500) };
                        })
                      }
                    />
                  </div>
                  {hata === h.halka && (
                    <p className="mt-2 text-sm text-rose-300">Teyit kaydedilemedi, tekrar dene.</p>
                  )}
                  <button
                    onClick={() => void teyitEt(h.halka)}
                    disabled={(girdi[h.halka] ?? "").trim().length < 3 || yukleniyor != null}
                    className="btn-kor parilti mt-3 flex h-12 w-full items-center justify-center rounded-2xl text-base font-bold disabled:opacity-40"
                  >
                    {yukleniyor === h.halka ? "Mühürleniyor…" : "Bu halkayı mühürle 🔗"}
                  </button>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-500">🔒 Henüz kilitli — {h.halka}. gün geldiğinde açılır.</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

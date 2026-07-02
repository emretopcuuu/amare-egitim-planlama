"use client";

import { useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";

const t = tr.zirve;

// [10] Zirveyi Ölç — rapor doruğunun hemen ardından tek kelime + 0-10 slider.
// Peak-End "peak" ölçümü; sessizce kaydeder, teşekkürle kapanır.
export default function ZirveOlcum() {
  const [kelime, setKelime] = useState("");
  const [puan, setPuan] = useState(8);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [bitti, setBitti] = useState(false);

  async function gonder() {
    if (gonderiliyor || kelime.trim().length < 2) return;
    setGonderiliyor(true);
    try {
      const r = await fetch("/api/zirve-olcum", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kelime, puan }),
      });
      if (r.ok) {
        titret([12, 40, 12]);
        setBitti(true);
      }
    } catch {
      /* sessiz — ölçüm kritik değil */
    } finally {
      setGonderiliyor(false);
    }
  }

  if (bitti) {
    return (
      <div className="rounded-2xl border border-gold/25 bg-gold/[0.06] p-5 text-center">
        <p className="text-sm font-medium text-gold-light">{t.tesekkur}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gold/30 bg-midnight-card/60 p-5">
      <p className="prizma-serif ay-metin text-lg font-semibold">{t.baslik}</p>
      <p className="mt-1 text-sm text-slate-400">{t.altBaslik}</p>

      <label className="mt-4 block text-sm font-medium text-slate-300">{t.kelimeSoru}</label>
      <input
        value={kelime}
        onChange={(e) => setKelime(e.target.value)}
        maxLength={40}
        placeholder={t.kelimeYer}
        className="mt-2 h-12 w-full rounded-xl border-2 border-white/15 bg-white/[0.04] px-4 text-center text-lg text-slate-100 outline-none focus:border-gold"
      />

      <label className="mt-5 block text-sm font-medium text-slate-300">{t.puanSoru}</label>
      <input
        type="range"
        min={0}
        max={10}
        value={puan}
        onChange={(e) => setPuan(Number(e.target.value))}
        className="mt-3 w-full accent-gold"
      />
      <p className="mt-1 text-center font-mono text-2xl font-bold text-gold">{puan}<span className="text-sm text-slate-500"> / 10</span></p>

      <button
        onClick={() => void gonder()}
        disabled={gonderiliyor || kelime.trim().length < 2}
        className="btn-kor parilti mt-5 flex h-12 w-full items-center justify-center rounded-2xl text-base font-bold disabled:opacity-40"
      >
        {gonderiliyor ? t.gonderiliyor : t.gonder}
      </button>
    </div>
  );
}

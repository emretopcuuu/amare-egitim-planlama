"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { titret, cal } from "@/lib/his";

// P10 Pazar Karnesi formu: 3 sayı (davet/görüşme/takip). Kaydedilince kamp
// arkadaşına tanıklık raporu gider.
export default function KarneForm({ mevcut }: { mevcut: { davet: number; gorusme: number; takip: number } | null }) {
  const router = useRouter();
  const [davet, setDavet] = useState(String(mevcut?.davet ?? ""));
  const [gorusme, setGorusme] = useState(String(mevcut?.gorusme ?? ""));
  const [takip, setTakip] = useState(String(mevcut?.takip ?? ""));
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [gitti, setGitti] = useState(!!mevcut);
  const [hata, setHata] = useState(false);

  async function gonder() {
    if (gonderiliyor) return;
    setGonderiliyor(true);
    setHata(false);
    try {
      const r = await fetch("/api/karne", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          davet: Number(davet) || 0,
          gorusme: Number(gorusme) || 0,
          takip: Number(takip) || 0,
        }),
      });
      if (!r.ok) throw new Error();
      titret([14, 40, 14]);
      cal("kazanim");
      setGitti(true);
      router.refresh();
    } catch {
      setHata(true);
    } finally {
      setGonderiliyor(false);
    }
  }

  const alan = (etiket: string, deger: string, set: (v: string) => void) => (
    <label className="block">
      <span className="text-sm font-medium text-slate-300">{etiket}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={deger}
        onChange={(e) => set(e.target.value)}
        className="mt-1 h-14 w-full rounded-xl border border-royal-light/30 bg-midnight-soft px-4 text-2xl font-bold text-slate-100 outline-none focus:border-gold"
        placeholder="0"
      />
    </label>
  );

  return (
    <section className="kart-cam rounded-3xl p-5">
      <div className="space-y-3">
        {alan("Bu hafta kaç DAVET yaptın?", davet, setDavet)}
        {alan("Kaç GÖRÜŞME oldu?", gorusme, setGorusme)}
        {alan("Kaç TAKİP yaptın?", takip, setTakip)}
      </div>
      <button
        onClick={gonder}
        disabled={gonderiliyor}
        className="mt-4 w-full btn-3d rounded-xl bg-gold px-4 py-3 font-semibold text-[#1a1206] hover:bg-gold-light disabled:opacity-40"
      >
        {gonderiliyor ? "Kaydediliyor…" : gitti ? "Güncelle" : "Karnemi ver"}
      </button>
      {gitti && (
        <p className="mt-2 text-center text-sm font-semibold text-emerald-300">
          Karnen kaydedildi — kamp arkadaşın tanığın oldu 👊
        </p>
      )}
      {hata && <p className="mt-2 text-center text-sm text-red-400">Kaydedilemedi, tekrar dene.</p>}
    </section>
  );
}

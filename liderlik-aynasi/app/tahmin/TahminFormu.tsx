"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

type Ozellik = { id: number; ad: string };

export default function TahminFormu({ ozellikler }: { ozellikler: Ozellik[] }) {
  const router = useRouter();
  const [enYuksek, setEnYuksek] = useState<number | null>(null);
  const [enDusuk, setEnDusuk] = useState<number | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const ayni = enYuksek !== null && enYuksek === enDusuk;
  const hazir = enYuksek !== null && enDusuk !== null && !ayni && !gonderiliyor;

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    if (!hazir) return;
    setGonderiliyor(true);
    setHata(null);
    try {
      const res = await fetch("/api/tahmin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enYuksekId: enYuksek, enDusukId: enDusuk }),
      });
      if (!res.ok) {
        const veri = await res.json().catch(() => null);
        setHata(veri?.hata ?? tr.tahmin.hataSunucu);
        return;
      }
      router.refresh();
    } catch {
      setHata(tr.tahmin.hataSunucu);
    } finally {
      setGonderiliyor(false);
    }
  }

  const secenekler = (haric: number | null) =>
    ozellikler.map((o) => (
      <option key={o.id} value={o.id} disabled={o.id === haric}>
        {o.ad}
      </option>
    ));

  const selectSinif =
    "mt-1 h-12 w-full rounded-xl border border-royal-light/30 bg-midnight-soft px-3 text-slate-100 outline-none transition-colors focus:border-gold";

  return (
    <form onSubmit={gonder} className="mt-6 space-y-5">
      <div>
        <label htmlFor="en-yuksek" className="text-sm font-medium text-emerald-400">
          ▲ {tr.tahmin.enYuksekEtiket}
        </label>
        <select
          id="en-yuksek"
          value={enYuksek ?? ""}
          onChange={(e) => {
            setEnYuksek(e.target.value ? Number(e.target.value) : null);
            setHata(null);
          }}
          className={selectSinif}
        >
          <option value="">{tr.tahmin.seciniz}</option>
          {secenekler(enDusuk)}
        </select>
      </div>

      <div>
        <label htmlFor="en-dusuk" className="text-sm font-medium text-amber-400">
          ▼ {tr.tahmin.enDusukEtiket}
        </label>
        <select
          id="en-dusuk"
          value={enDusuk ?? ""}
          onChange={(e) => {
            setEnDusuk(e.target.value ? Number(e.target.value) : null);
            setHata(null);
          }}
          className={selectSinif}
        >
          <option value="">{tr.tahmin.seciniz}</option>
          {secenekler(enYuksek)}
        </select>
      </div>

      {ayni && (
        <p className="text-sm font-medium text-red-400">{tr.tahmin.ayniOzellikHata}</p>
      )}
      {hata && (
        <p role="alert" className="text-sm font-medium text-red-400">
          {hata}
        </p>
      )}

      <p className="text-xs text-slate-400">⚠️ {tr.tahmin.kilitleUyari}</p>

      <button
        type="submit"
        disabled={!hazir}
        className="h-12 w-full btn-3d rounded-xl bg-gold font-semibold text-midnight transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-40"
      >
        {gonderiliyor ? tr.tahmin.gonderiliyor : tr.tahmin.gonder}
      </button>
    </form>
  );
}

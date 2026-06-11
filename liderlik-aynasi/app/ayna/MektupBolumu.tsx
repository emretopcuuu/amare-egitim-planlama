"use client";

import { useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.mektup;

// Mektup sayfa yüklenirken hazırsa doğrudan gösterilir; değilse istek üzerine
// üretilir (admin toplu üretimi atlamışsa bile kimse mektupsuz kalmaz).
export default function MektupBolumu({
  mevcutMektup,
}: {
  mevcutMektup: string | null;
}) {
  const [mektup, setMektup] = useState<string | null>(mevcutMektup);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState(false);

  async function olustur() {
    if (yukleniyor) return;
    setYukleniyor(true);
    setHata(false);
    try {
      const res = await fetch("/api/mektup", { method: "POST" });
      if (!res.ok) {
        setHata(true);
        return;
      }
      const veri = await res.json();
      setMektup(veri.mektup);
    } catch {
      setHata(true);
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <section className="rounded-2xl bg-gradient-to-br from-royal/25 to-midnight-card/60 p-5 shadow-xl ring-1 ring-gold/40 backdrop-blur">
      <h2 className="font-semibold text-gold-light">{t.baslik}</h2>
      <p className="mt-1 text-xs text-slate-400">{t.aciklama}</p>

      {mektup ? (
        <div className="mt-4 whitespace-pre-wrap rounded-xl bg-midnight-soft/80 p-4 font-serif text-sm leading-relaxed text-slate-100">
          {mektup}
        </div>
      ) : (
        <div className="mt-4 text-center">
          {hata && (
            <p role="alert" className="mb-3 text-sm font-medium text-red-400">
              {t.hata}
            </p>
          )}
          <button
            onClick={olustur}
            disabled={yukleniyor}
            className="btn-3d rounded-xl bg-gold px-5 py-2.5 font-semibold text-midnight transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            {yukleniyor ? t.hazirlaniyor : t.olustur}
          </button>
        </div>
      )}
    </section>
  );
}

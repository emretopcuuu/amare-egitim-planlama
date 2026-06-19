"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";

const t = tr.aynaAni;

// GELİŞTİRME #3 — Ayna Anı kartı. Açılışta kişinin görülmemiş içgörü anını
// çeker; varsa vurgulu bir kartta gösterir. "Gördüm" ile mühürlenip kapanır,
// bir daha görünmez. Hiçbir an yoksa sessizce kaybolur (yer kaplamaz).
export default function AynaAniKarti() {
  const [an, setAn] = useState<string | null>(null);
  const [kapandi, setKapandi] = useState(false);

  useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        const res = await fetch("/api/ayna-ani");
        const v = await res.json().catch(() => null);
        if (!iptal && v?.an) {
          setAn(v.an);
          titret([10, 50, 10, 50, 20]);
        }
      } catch {}
    })();
    return () => {
      iptal = true;
    };
  }, []);

  async function gordum() {
    setKapandi(true);
    try {
      await fetch("/api/ayna-ani", { method: "POST" });
    } catch {}
  }

  if (!an || kapandi) return null;

  return (
    <section className="sahne-giris kart-cam relative overflow-hidden rounded-3xl border border-gold/30 p-5 text-left shadow-xl">
      <p className="prizma-serif text-[0.7rem] uppercase tracking-[0.3em] text-gold-light">
        👁 {t.baslik}
      </p>
      <p className="mt-2 text-base leading-relaxed text-slate-100">{an}</p>
      <button
        type="button"
        onClick={gordum}
        className="mt-4 h-11 w-full rounded-2xl bg-gold font-semibold text-midnight transition-colors hover:bg-gold-light"
      >
        {t.gordum}
      </button>
    </section>
  );
}

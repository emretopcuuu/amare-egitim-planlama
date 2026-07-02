"use client";

import { useEffect, useRef, useState } from "react";
import { titret } from "@/lib/his";

type Durum = { toplam: number; sozVeren: number; muhurlu: number; hepsiMuhurlu: boolean };

// [E3] Kolektif Söz Finali (söz veren tarafı): (a) yüz yüze şahitlik QR'ı — şahit
// okutup onaylar; (c) canlı "N mühürlendi" sayacı (5 sn yoklama); (b) son söz
// mühürlenince senkron an — titreşim + ekran parlaması (tüm telefonlarda).
export default function SozMuhurFinal({ qrSvg, ilkDurum }: { qrSvg: string; ilkDurum: Durum }) {
  const [durum, setDurum] = useState<Durum>(ilkDurum);
  const [parla, setParla] = useState(false);
  const oncekiHepsi = useRef(ilkDurum.hepsiMuhurlu);

  useEffect(() => {
    let durdu = false;
    const yokla = async () => {
      if (durdu || document.visibilityState === "hidden") return;
      try {
        const r = await fetch("/api/soz-durumu");
        if (!r.ok) return;
        const v = (await r.json()) as Durum;
        setDurum(v);
        // Senkron an: hepsiMuhurlu false → true geçişi.
        if (v.hepsiMuhurlu && !oncekiHepsi.current) {
          oncekiHepsi.current = true;
          const azHareket = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          titret([30, 60, 30, 60, 120]);
          if (!azHareket) {
            setParla(true);
            setTimeout(() => setParla(false), 1400);
          }
        }
      } catch {
        /* ağ takıldı: sonraki yoklamada */
      }
    };
    const t = setInterval(yokla, 5000);
    return () => {
      durdu = true;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-md space-y-4 px-5 pb-8">
      {/* Senkron an parlaması */}
      {parla && (
        <div className="pointer-events-none fixed inset-0 z-50 animate-pulse bg-white/70" aria-hidden />
      )}

      <div className="rounded-2xl border border-gold/40 bg-midnight-card/60 p-5 text-center">
        <p className="text-sm font-semibold text-gold-light">🤝 Şahitlerini topla</p>
        <p className="mt-1 text-xs text-slate-400">
          Bu kodu 5 kişiye okut — her biri sözüne şahit olsun. Söz {`"`}mühürlendi{`"`} sayılması için {5} şahit gerek.
        </p>
        <div
          className="mx-auto mt-4 w-44 rounded-xl bg-white p-3 [&_svg]:h-full [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-midnight-card/50 p-4 text-center">
        <p className="font-display text-3xl font-bold text-gold-light">
          {durum.muhurlu}
          <span className="text-lg text-slate-400"> / {durum.sozVeren || durum.toplam} söz mühürlendi</span>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {durum.hepsiMuhurlu
            ? "Salonun tüm sözleri mühürlendi. Bu an sizin."
            : "Salon dolduruyor — her mühür bir söz."}
        </p>
      </div>
    </div>
  );
}

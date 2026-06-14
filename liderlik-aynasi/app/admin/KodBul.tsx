"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import Ipucu from "./Ipucu";

const t = tr.admin.kodBul;

type Sonuc = { ad: string; takim: string | null; kod: string };

// #6 Hızlı kod bulma: kodunu unutan katılımcıyı isimle bul. Yazdıkça (debounce)
// /api/admin/kod-bul'a sorar; sonucu büyük, kopyalanabilir kodla gösterir.
export default function KodBul() {
  const [ad, setAd] = useState("");
  const [sonuclar, setSonuclar] = useState<Sonuc[]>([]);
  const [araniyor, setAraniyor] = useState(false);

  useEffect(() => {
    const q = ad.trim();
    if (q.length < 2) {
      // Arama kutusu boşalınca sonuçları temizle (efekt içi kasıtlı set).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSonuclar([]);
      return;
    }
    setAraniyor(true);
    const zaman = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/kod-bul?ad=${encodeURIComponent(q)}`);
        const veri = await res.json().catch(() => null);
        setSonuclar(veri?.sonuclar ?? []);
      } catch {
        setSonuclar([]);
      } finally {
        setAraniyor(false);
      }
    }, 350);
    return () => clearTimeout(zaman);
  }, [ad]);

  return (
    <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gold-light">
        {t.baslik}
        <Ipucu {...tr.admin.yardim.kodBul} />
      </h2>
      <p className="mt-1 text-sm text-slate-400">{t.aciklama}</p>
      <input
        type="search"
        value={ad}
        onChange={(e) => setAd(e.target.value)}
        placeholder={t.yer}
        className="mt-3 w-full rounded-xl border border-royal-light/30 bg-midnight-soft px-4 py-3 text-base text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-gold"
      />
      {ad.trim().length >= 2 && (
        <div className="mt-3">
          {araniyor && sonuclar.length === 0 ? (
            <p className="text-sm text-slate-400">{t.araniyor}</p>
          ) : sonuclar.length === 0 ? (
            <p className="text-sm text-slate-400">{t.sonucYok}</p>
          ) : (
            <ul className="space-y-2">
              {sonuclar.map((s) => (
                <li
                  key={s.kod}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-100">
                      {s.ad}
                    </span>
                    {s.takim && (
                      <span className="block truncate text-xs text-slate-400">
                        {s.takim}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 rounded-lg bg-gold/15 px-3 py-1.5 font-mono text-lg font-bold tracking-widest text-gold-light">
                    {s.kod}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

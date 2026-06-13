"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.kiosk;

type Sonuc = { ad: string; takim: string | null; kod: string };

export default function KioskEkrani({
  toplam,
  katildi,
  qrSvg,
}: {
  toplam: number;
  katildi: number;
  qrSvg: string;
}) {
  const [sayi, setSayi] = useState({ toplam, katildi });
  const [ad, setAd] = useState("");
  const [sonuclar, setSonuclar] = useState<Sonuc[] | null>(null);
  const aramaZaman = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Canlı sayaç: 15 sn'de bir tazele (kayıt masasında heyecan göstergesi)
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/admin/kiosk-durum");
        if (res.ok) setSayi(await res.json());
      } catch {
        // sahne wifi'ı takıldı: eski sayı kalır
      }
    }, 15_000);
    return () => clearInterval(id);
  }, []);

  // İsimle kod arama (debounce)
  function adDegisti(deger: string) {
    setAd(deger);
    if (aramaZaman.current) clearTimeout(aramaZaman.current);
    if (deger.trim().length < 2) {
      setSonuclar(null);
      return;
    }
    aramaZaman.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/kod-bul?ad=${encodeURIComponent(deger.trim())}`);
        if (res.ok) setSonuclar((await res.json()).sonuclar);
      } catch {
        setSonuclar(null);
      }
    }, 300);
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6">
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Canlı katılım sayacı */}
        <section className="kart-3d flex flex-col items-center justify-center rounded-3xl bg-midnight-card/60 p-8 text-center ring-1 ring-gold/40 backdrop-blur">
          <p className="font-display text-7xl font-bold text-gold">{sayi.katildi}</p>
          <p className="mt-2 text-xl font-semibold text-gold-light">{t.katildi}</p>
          <p className="mt-1 text-sm text-slate-400">{t.toplam(sayi.toplam)}</p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-midnight-soft">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold transition-all duration-700"
              style={{
                width: `${sayi.toplam > 0 ? Math.min(100, (sayi.katildi / sayi.toplam) * 100) : 0}%`,
              }}
            />
          </div>
        </section>

        {/* QR */}
        <section className="kart-3d flex flex-col items-center rounded-3xl bg-midnight-card/60 p-8 text-center ring-1 ring-royal/30 backdrop-blur">
          <p className="text-lg font-semibold text-gold-light">{t.qrBaslik}</p>
          <div
            className="mt-3 w-44 rounded-2xl bg-white p-3 [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <p className="mt-3 text-sm text-slate-300">{t.qrAciklama}</p>
        </section>
      </div>

      {/* Kod bulma */}
      <section className="kart-3d mt-6 rounded-3xl bg-midnight-card/60 p-6 ring-1 ring-royal/30 backdrop-blur">
        <h2 className="text-lg font-semibold text-gold-light">{t.bulBaslik}</h2>
        <input
          value={ad}
          onChange={(e) => adDegisti(e.target.value)}
          placeholder={t.bulYer}
          className="mt-3 w-full rounded-xl border border-royal-light/30 bg-midnight-soft p-3 text-base text-slate-100 outline-none placeholder:text-slate-500 focus:border-gold"
        />
        {sonuclar !== null && (
          <ul className="mt-3 space-y-2">
            {sonuclar.length === 0 ? (
              <li className="text-sm text-slate-500">{t.bulYok}</li>
            ) : (
              sonuclar.map((s) => (
                <li
                  key={s.kod}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <span className="min-w-0 truncate text-base text-slate-100">
                    {s.ad}
                    {s.takim && (
                      <span className="ml-2 text-xs text-slate-400">{s.takim}</span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-2xl font-bold text-gold">
                    {s.kod}
                  </span>
                </li>
              ))
            )}
          </ul>
        )}
      </section>
    </main>
  );
}

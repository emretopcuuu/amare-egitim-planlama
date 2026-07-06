"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";

type Cinsiyet = "kadin" | "erkek" | "diger";

// AYARLAR — cinsiyet + yaş düzenleyici. Ritüelde ilk kez sorulur; kişi buradan
// istediği an güncelleyebilir. Mevcut değerleri GET /api/kimlik ile yükler,
// POST /api/kimlik ile kaydeder (tüm AI motorları doğru hitaba geçer).
const t = tr.rituel.kimlik;

export default function KimlikDuzenle({ onKapat }: { onKapat: () => void }) {
  const [cinsiyet, setCinsiyet] = useState<Cinsiyet | null>(null);
  const [yas, setYas] = useState("");
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState(false);

  useEffect(() => {
    let durdu = false;
    (async () => {
      try {
        const r = await fetch("/api/kimlik");
        if (r.ok) {
          const d = (await r.json()) as { cinsiyet: Cinsiyet | null; yas: number | null };
          if (!durdu) {
            if (d.cinsiyet === "kadin" || d.cinsiyet === "erkek" || d.cinsiyet === "diger") {
              setCinsiyet(d.cinsiyet);
            }
            if (typeof d.yas === "number") setYas(String(d.yas));
          }
        }
      } catch {
        /* boş bırak — kişi yeniden girebilir */
      } finally {
        if (!durdu) setYukleniyor(false);
      }
    })();
    return () => {
      durdu = true;
    };
  }, []);

  async function kaydet() {
    if (kaydediliyor || !cinsiyet) return;
    setKaydediliyor(true);
    setHata(false);
    try {
      const res = await fetch("/api/kimlik", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cinsiyet, yas: yas.trim() === "" ? null : Number(yas) }),
      });
      if (!res.ok) {
        setHata(true);
        return;
      }
      onKapat();
    } catch {
      setHata(true);
    } finally {
      setKaydediliyor(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-6">
      <h2 className="prizma-serif ay-metin text-center text-2xl font-bold leading-tight">
        {t.baslik}
      </h2>
      <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-relaxed text-slate-300">
        {t.aciklama}
      </p>

      {yukleniyor ? (
        <p className="mt-8 text-center text-sm text-slate-500">…</p>
      ) : (
        <>
          <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-gold-light/80">
            {t.cinsiyetSoru}
          </p>
          <div className="mt-3 space-y-3">
            {(["kadin", "erkek", "diger"] as const).map((secenek) => {
              const secili = cinsiyet === secenek;
              return (
                <button
                  key={secenek}
                  type="button"
                  onClick={() => {
                    setCinsiyet(secenek);
                    setHata(false);
                    titret(10);
                  }}
                  className={`flex h-14 w-full items-center rounded-2xl border-2 px-5 text-left text-lg font-semibold transition-colors ${
                    secili
                      ? "border-gold bg-gold/10 text-gold-light"
                      : "border-white/20 bg-white/[0.04] text-slate-200 hover:border-gold/50"
                  }`}
                >
                  {t[secenek]}
                </button>
              );
            })}
          </div>

          <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-gold-light/80">
            {t.yasSoru}
          </p>
          <input
            type="number"
            inputMode="numeric"
            min={13}
            max={120}
            value={yas}
            onChange={(e) => {
              setYas(e.target.value);
              setHata(false);
            }}
            placeholder={t.yasYer}
            className="mt-3 h-14 w-full rounded-2xl border-2 border-white/20 bg-white/[0.04] px-5 text-center text-2xl font-bold text-slate-50 outline-none focus:border-gold"
          />

          {hata && (
            <p role="alert" className="mt-4 text-center text-sm font-medium text-amber-300">
              {t.hata}
            </p>
          )}

          <button
            onClick={kaydet}
            disabled={kaydediliyor || !cinsiyet}
            className="btn-kor parilti mt-7 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold disabled:opacity-50"
          >
            {kaydediliyor ? "…" : t.devam}
          </button>
        </>
      )}

      <button
        onClick={onKapat}
        className="mt-3 w-full rounded-xl py-2.5 text-sm text-slate-400 transition-colors hover:text-slate-200"
      >
        Kapat
      </button>
    </div>
  );
}

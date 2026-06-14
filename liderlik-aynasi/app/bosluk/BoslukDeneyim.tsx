"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.bosluk;

type Demolisyon = {
  reaktivasyon: string;
  kanitlar: { kaynak: string; metin: string }[];
  donus: string;
  davet: string;
};

// Boşluk Anı: tek beat-tek ekran. Acele yok — her adım nefes alıyor.
// 0 giriş · 1 reaktivasyon · 2 kanıtlar · 3 dönüş · 4 davet+cümle · 5 mühür
export default function BoslukDeneyim({
  demolisyon,
  yeniCumle,
}: {
  demolisyon: Demolisyon;
  yeniCumle: string | null;
}) {
  const router = useRouter();
  const [adim, setAdim] = useState(yeniCumle ? 5 : 0);
  const [cumle, setCumle] = useState(yeniCumle ?? "");
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function muhurle() {
    if (!cumle.trim()) {
      setHata(t.cumleBosUyari);
      return;
    }
    setMesgul(true);
    setHata(null);
    try {
      const res = await fetch("/api/bosluk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cumle }),
      });
      if (!res.ok) {
        setHata(t.hata);
        return;
      }
      setAdim(5);
      setTimeout(() => router.refresh(), 3000);
    } catch {
      setHata(t.hata);
    } finally {
      setMesgul(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="sahne-giris w-full max-w-md">
        {/* 0 — Giriş */}
        {adim === 0 && (
          <Beat ikon="🪞" onIleri={() => setAdim(1)}>
            <p className="text-lg leading-relaxed text-slate-300">
              {tr.app.name}
            </p>
          </Beat>
        )}

        {/* 1 — Reaktivasyon */}
        {adim === 1 && (
          <Beat onIleri={() => setAdim(2)}>
            <p className="prizma-serif text-xl leading-relaxed text-slate-100">
              {demolisyon.reaktivasyon}
            </p>
          </Beat>
        )}

        {/* 2 — Kanıtlar */}
        {adim === 2 && (
          <Beat onIleri={() => setAdim(3)}>
            <p className="mb-5 prizma-serif ay-metin text-xl font-semibold">
              {t.kanitBaslik}
            </p>
            <div className="space-y-3 text-left">
              {demolisyon.kanitlar.map((k, i) => (
                <div key={i} className="kart-cam rounded-2xl p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {k.kaynak}
                  </p>
                  <p className="mt-1 text-base leading-relaxed text-slate-100">
                    {k.metin}
                  </p>
                </div>
              ))}
            </div>
          </Beat>
        )}

        {/* 3 — Dönüş */}
        {adim === 3 && (
          <Beat onIleri={() => setAdim(4)}>
            <p className="prizma-serif text-xl leading-relaxed text-gold-light">
              {demolisyon.donus}
            </p>
          </Beat>
        )}

        {/* 4 — Davet + yeni cümle */}
        {adim === 4 && (
          <div className="text-center">
            <p className="prizma-serif text-lg leading-relaxed text-slate-100">
              {demolisyon.davet}
            </p>
            <textarea
              value={cumle}
              onChange={(e) => setCumle(e.target.value)}
              rows={3}
              placeholder={t.cumleYer}
              className="mt-6 w-full resize-none rounded-2xl border border-royal-light/30 bg-midnight-soft px-4 py-3 text-base text-slate-100 outline-none focus:border-gold"
            />
            {hata && <p className="mt-2 text-sm text-red-400">{hata}</p>}
            <button
              onClick={muhurle}
              disabled={mesgul || !cumle.trim()}
              className="btn-kor parilti mt-5 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold disabled:opacity-50"
            >
              {t.cumleKaydet}
            </button>
          </div>
        )}

        {/* 5 — Mühür */}
        {adim === 5 && (
          <div className="text-center">
            <p className="text-5xl" aria-hidden>
              🔒
            </p>
            <h1 className="prizma-serif ay-metin mt-4 text-2xl font-semibold">
              {t.tamamBaslik}
            </h1>
            {cumle.trim() && (
              <p className="mt-5 prizma-serif text-xl leading-relaxed text-gold-light">
                “{cumle.trim()}”
              </p>
            )}
            <p className="mt-5 text-sm leading-relaxed text-slate-400">{t.tamamMetin}</p>
          </div>
        )}
      </div>
    </main>
  );
}

// Tek beat: içerik + tam genişlik "Devam et". İkon opsiyonel.
function Beat({
  ikon,
  children,
  onIleri,
}: {
  ikon?: string;
  children: React.ReactNode;
  onIleri: () => void;
}) {
  return (
    <div className="text-center">
      {ikon && (
        <p className="mb-5 text-5xl" aria-hidden>
          {ikon}
        </p>
      )}
      {children}
      <button
        onClick={onIleri}
        className="btn-kor mt-8 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold"
      >
        {t.ileri}
      </button>
    </div>
  );
}

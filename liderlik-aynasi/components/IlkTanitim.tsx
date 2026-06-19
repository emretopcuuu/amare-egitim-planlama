"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { ortuAc, ortuKapat } from "@/lib/ortu";

const t = tr.tanitim;
const DEPO = "la_tanitim_v1";

// İlk açılışta tek seferlik 30 saniyelik tanıtım: kişiye uygulamada ne
// yaşayacağını teker teker, büyük yazı/az yazıyla anlatır. Görüldüğünde
// cihazda işaretlenir ve bir daha çıkmaz. Mobil öncelikli tam ekran katman.
export default function IlkTanitim() {
  // Sunucuda ve ilk render'da gösterme (hydration uyumu); mount'ta karar ver.
  const [goster, setGoster] = useState(false);
  const [adim, setAdim] = useState(0);

  useEffect(() => {
    try {
      // localStorage yalnızca istemcide okunur; mount'ta tek seferlik karar.
      // Test için ?intro=1 ile localStorage'a bakmadan yeniden gösterilir.
      const zorla = new URLSearchParams(window.location.search).has("intro");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (zorla || !localStorage.getItem(DEPO)) setGoster(true);
    } catch {
      // depolama kapalı: tanıtımı atla
    }
  }, []);

  // Açıkken alt menüyü gizle (tam-ekran takeover'ı dibe taşımasın/örtmesin).
  useEffect(() => {
    if (!goster) return;
    ortuAc();
    return () => ortuKapat();
  }, [goster]);

  function kapat() {
    try {
      localStorage.setItem(DEPO, "1");
    } catch {
      // yok say
    }
    setGoster(false);
  }

  if (!goster) return null;

  const kart = t.kartlar[adim];
  const sonuncu = adim === t.kartlar.length - 1;

  return (
    <div className="gece-ada fixed inset-0 z-[60] flex flex-col bg-black">
      <div className="flex justify-end p-5">
        <button
          onClick={kapat}
          className="rounded-xl px-4 py-2 text-base text-slate-400 hover:text-slate-200"
        >
          {t.gec}
        </button>
      </div>

      <div className="flex w-full flex-1 flex-col overflow-y-auto px-6 pb-8">
        <div className="mx-auto my-auto w-full max-w-md text-center">
          {adim === 0 ? (
            // İlk kart: ONE TEAM amblemi — şeffaf zeminli, zemine karışır
            // (eski siyah-kutu marka videosu yerine; ton uyuşmazlığı yok).
            <img
              src="/oneteam-logo.png"
              alt="ONE TEAM"
              className="mx-auto w-52 max-w-[68%] drop-shadow-[0_10px_34px_rgba(212,175,55,0.3)]"
            />
          ) : (
            <p className="text-7xl">{kart.simge}</p>
          )}
          <h1 className="prizma-serif ay-metin mt-6 text-3xl font-semibold leading-tight">
            {kart.baslik}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-300">{kart.metin}</p>

          <div className="mt-8 flex justify-center gap-2">
            {t.kartlar.map((_, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === adim ? "w-6 bg-gold" : "w-2 bg-white/25"
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => (sonuncu ? kapat() : setAdim((a) => a + 1))}
            className="parilti btn-kor mt-8 flex h-16 w-full items-center justify-center rounded-2xl text-xl font-bold"
          >
            {sonuncu ? t.basla : t.ileri}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { kutla, cal } from "@/lib/his";
import Konfeti from "@/components/Konfeti";
import AynaSesi from "@/components/AynaSesi";
import AynaIkon from "@/components/AynaIkon";

const t = tr.mezuniyet;

type Ozet = { ad: string; gorevSayisi: number; kivilcim: number; unvan: string; gun: number };

// KAMP BİTİŞ KUTLAMASI (Mezuniyet) — kampın doruğunda (rapor/mühür finali) ve
// kapanış sözü anında bir kez patlar. Görsel şölen (çoklu konfeti + haptik +
// göl dalgası) + kişisel istatistik özeti + AYNA'nın sesli tebriği.
// Bir kere gösterilir (sessionStorage: anahtar); reduced-motion güvenli (Konfeti
// zaten kendini kapatır). İstatistik gelmezse kutlama yine görünür (kart gizlenir).
export default function MezuniyetKutlama({
  anahtar,
  onKapat,
}: {
  anahtar: string;
  onKapat?: () => void;
}) {
  const [goster, setGoster] = useState(false);
  const [ozet, setOzet] = useState<Ozet | null>(null);
  const [patlama, setPatlama] = useState(0);
  const zamanlar = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Bir kez: bu oturumda daha önce gösterildiyse hiç açma.
    try {
      if (sessionStorage.getItem(`mezuniyet_${anahtar}`)) return;
      sessionStorage.setItem(`mezuniyet_${anahtar}`, "1");
    } catch {
      /* sessionStorage yoksa yine de bir kez göster */
    }
    setGoster(true);
    // İstatistiği çek (gelmese de kutlama görünür).
    fetch("/api/mezuniyet-ozet")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.gorevSayisi === "number") setOzet(d as Ozet);
      })
      .catch(() => {});
    // Görsel şölen: haptik + göl dalgası + çıngırak, sonra çoklu konfeti patlaması.
    kutla();
    cal("kazanim");
    // Konfetiyi ~4 sn boyunca birkaç kez yeniden ateşle (tek atıştan daha coşkulu).
    zamanlar.current = [
      setTimeout(() => setPatlama((p) => p + 1), 1300),
      setTimeout(() => setPatlama((p) => p + 1), 2600),
    ];
    return () => zamanlar.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!goster) return null;

  function kapat() {
    setGoster(false);
    onKapat?.();
  }

  const istatistikler = ozet
    ? [
        { deger: ozet.gun, etiket: t.gunEtiket },
        { deger: ozet.gorevSayisi, etiket: t.gorevEtiket },
        { deger: ozet.kivilcim, etiket: t.kivilcimEtiket },
      ]
    : [];

  return (
    <div className="gece-ada fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-y-auto bg-[#04101c]/95 p-6 text-center text-[#e6edf4] backdrop-blur-md">
      {/* Çoklu konfeti patlaması — key değişince yeniden ateşler */}
      <Konfeti key={patlama} />

      <div className="sahne-giris mx-auto w-full max-w-md">
        <AynaIkon className="mx-auto h-14 w-14 text-gold" />
        <p className="prizma-serif mt-5 text-xs font-semibold uppercase tracking-[0.4em] text-gold-light/80">
          {t.ust}
        </p>
        <h1 className="prizma-serif ay-metin mt-2 text-4xl font-bold leading-tight">
          {t.baslik(ozet?.ad ?? "")}
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-lg leading-relaxed text-slate-300">{t.altMetin}</p>

        {/* Kişisel istatistik özeti */}
        {ozet && (
          <>
            <div className="mt-7 grid grid-cols-3 gap-3">
              {istatistikler.map((s) => (
                <div
                  key={s.etiket}
                  className="rounded-2xl border border-gold/25 bg-gold/[0.06] px-2 py-4"
                >
                  <p className="prizma-serif text-3xl font-bold text-gold-light">{s.deger}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{s.etiket}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-400">
              {t.unvanEtiket}:{" "}
              <span className="font-semibold text-gold-light">{ozet.unvan}</span>
            </p>
          </>
        )}

        {/* AYNA'nın sesli tebriği (dokununca çalar; ses yoksa kendini gizler) */}
        <div className="mx-auto mt-7 w-fit">
          <AynaSesi kod="mezuniyet" />
        </div>

        <button
          onClick={kapat}
          className="btn-kor parilti mx-auto mt-8 flex h-14 w-full max-w-xs items-center justify-center rounded-2xl text-lg font-bold"
        >
          {t.kapat}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Konfeti from "@/components/Konfeti";
import { titret } from "@/lib/his";
import { useEsc } from "@/lib/useEsc";
import { tr } from "@/lib/i18n/tr";

const ANAHTAR = "la_unvan_seviye_v1";
const t = tr.kutlama;

// #6 Milestone kutlaması: kişi yeni bir unvana terfi ettiğinde (kıvılcım eşiği
// aşıldığında) tam-ekran kutlama. Konfetiden farklı, özel "vav" anı.
export default function UnvanKutlama({
  unvan,
  seviye,
}: {
  unvan: string;
  seviye: number;
}) {
  const [terfi, setTerfi] = useState(false);
  useEsc(terfi, () => setTerfi(false));

  useEffect(() => {
    try {
      const onceki = localStorage.getItem(ANAHTAR);
      const oncekiSeviye = onceki === null ? null : Number(onceki);
      if (oncekiSeviye !== null && Number.isFinite(oncekiSeviye) && seviye > oncekiSeviye) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTerfi(true);
        titret([15, 40, 15, 40, 30]);
      }
      localStorage.setItem(ANAHTAR, String(seviye));
    } catch {}
  }, [seviye]);

  if (!terfi) return null;
  return (
    <>
      <Konfeti />
      <div
        role="dialog"
        aria-modal="true"
        onClick={() => setTerfi(false)}
        className="fixed inset-0 z-[75] flex flex-col items-center justify-center bg-midnight/95 px-8 text-center backdrop-blur"
      >
        <span className="text-7xl" aria-hidden>
          🎖
        </span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-gold-light">
          {t.terfiUst}
        </p>
        <h2 className="prizma-serif ay-metin mt-2 text-4xl font-semibold">{t.terfi(unvan)}</h2>
        <p className="mt-3 max-w-sm text-base text-slate-300">{t.terfiMetin}</p>
        {/* Ekip sloganı — unvan atlaması zaten seyrek/özel bir an, her seferinde görünür. */}
        <p className="mt-2 text-sm font-semibold text-gold-light">{tr.ortak.iyisinDevam}</p>
        <button
          onClick={() => setTerfi(false)}
          className="btn-kor parilti mt-8 h-12 w-full max-w-xs rounded-2xl text-base font-bold"
        >
          {t.devam}
        </button>
      </div>
    </>
  );
}

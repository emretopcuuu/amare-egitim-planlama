"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useEsc } from "@/lib/useEsc";

// Kişi avatarı: fotoğraf varsa fotoğraf, yoksa ad-soyad baş harfleri (deterministik
// renk). Üzerine basınca büyük halini açar. Puanlama/seçim ekranlarında kimin kim
// olduğu isim yanında görünür olsun diye.

const RENKLER = [
  "from-royal to-royal-light",
  "from-amber-500 to-gold",
  "from-emerald-500 to-teal-400",
  "from-fuchsia-500 to-purple-400",
  "from-sky-500 to-indigo-400",
  "from-rose-500 to-orange-400",
];

// KisiKarti (D7) da aynı baş harf/renk dilini kullansın diye dışa açık.
export function basHarfler(ad: string): string {
  const p = ad.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toLocaleUpperCase("tr-TR");
  return (p[0][0] + p[p.length - 1][0]).toLocaleUpperCase("tr-TR");
}

export function renkSec(ad: string): string {
  let h = 0;
  for (let i = 0; i < ad.length; i++) h = (h * 31 + ad.charCodeAt(i)) >>> 0;
  return RENKLER[h % RENKLER.length];
}

const BOYUT = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-lg",
} as const;

export default function Avatar({
  ad,
  url,
  boyut = "md",
  buyutulebilir = true,
}: {
  ad: string;
  url?: string | null;
  boyut?: keyof typeof BOYUT;
  buyutulebilir?: boolean;
}) {
  const [acik, setAcik] = useState(false);
  useEsc(acik, () => setAcik(false));

  const ic = url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={ad} className="h-full w-full object-cover" />
  ) : (
    <span
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${renkSec(
        ad
      )} font-bold text-white`}
    >
      {basHarfler(ad)}
    </span>
  );

  return (
    <>
      <button
        type="button"
        disabled={!buyutulebilir}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setAcik(true);
        }}
        className={`${BOYUT[boyut]} shrink-0 overflow-hidden rounded-full ring-1 ring-white/15 ${
          buyutulebilir ? "cursor-pointer" : "cursor-default"
        }`}
        aria-label={ad}
      >
        {ic}
      </button>

      {acik &&
        buyutulebilir &&
        typeof document !== "undefined" &&
        createPortal(
          <button
            onClick={() => setAcik(false)}
            className="koyu-alan fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 bg-black/85 p-8 backdrop-blur"
            aria-label="Kapat"
          >
            <div className="h-64 w-64 max-w-[80vw] overflow-hidden rounded-3xl ring-2 ring-gold/40">
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={ad} className="h-full w-full object-cover" />
              ) : (
                <span
                  className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${renkSec(
                    ad
                  )} text-7xl font-bold text-white`}
                >
                  {basHarfler(ad)}
                </span>
              )}
            </div>
            <p className="text-lg font-semibold text-slate-100">{ad}</p>
          </button>,
          document.body
        )}
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";
import { useEsc } from "@/lib/useEsc";
import AynaSahnesi from "@/components/AynaSahnesi";

const ANAHTAR = "la_karsilama_v4";
const t = tr.karsilama;
// Adayın kampta İLK düştüğü ekranlar: FAZ 0'da ana sayfa onu /on-farkindalik'e
// (yoksa /pusula'ya) yönlendirir; karşılama bu yüzden yalnız "/"da tetiklenince
// hiç görünmüyordu. Adayın gerçekten ilk gördüğü ekranlarda da çıksın.
const KARSILAMA_ROTALARI = new Set(["/", "/on-farkindalik", "/pusula"]);

// #1 İlk açılış mikro-turu: katılımcı sisteme İLK kez geldiğinde AYNA kendini
// sinematik bir "uyanan ayna" sahnesinde tanıtır (tonu ilk saniyede kurar).
// Bir kez gösterilir (localStorage); adayın ilk düştüğü ekranda tetiklenir.
export default function IlkKarsilama() {
  const pathname = usePathname();
  const [acik, setAcik] = useState(false);
  const [i, setI] = useState(0);
  useEsc(acik, () => kapat());

  useEffect(() => {
    if (!KARSILAMA_ROTALARI.has(pathname)) return;
    try {
      if (!localStorage.getItem(ANAHTAR)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAcik(true);
      }
    } catch {}
  }, [pathname]);

  function kapat() {
    try {
      localStorage.setItem(ANAHTAR, "1");
    } catch {}
    setAcik(false);
  }

  if (!acik) return null;
  const adim = t.adimlar[i];
  const son = i === t.adimlar.length - 1;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.adimlar[0].baslik}
      className="fixed inset-0 z-[70] overflow-hidden bg-[#04101c]"
    >
      {/* Sinematik ayna — tüm ekranı kaplayan canlı zemin */}
      <AynaSahnesi />
      {/* Alt okunabilirlik perdesi: metin camın parıltısı üstünde net dursun */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#04101c] via-[#04101c]/55 to-transparent" />

      <button
        onClick={kapat}
        className="absolute right-5 top-5 z-10 rounded-full bg-black/30 px-4 py-1.5 text-sm text-slate-300 backdrop-blur-sm transition-colors hover:text-white"
      >
        {t.atla}
      </button>

      <div className="absolute inset-x-0 bottom-0 z-10 mx-auto w-full max-w-md px-7 pb-11 text-center">
        {i === 0 ? (
          <h2 className="ayna-isim prizma-serif text-4xl font-semibold tracking-wide">{adim.baslik}</h2>
        ) : (
          <h2 className="prizma-serif ay-metin text-3xl font-semibold">{adim.baslik}</h2>
        )}
        <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-slate-200/90">{adim.metin}</p>

        <div className="mt-7 flex justify-center gap-1.5">
          {t.adimlar.map((_, k) => (
            <span
              key={k}
              className={`h-2 rounded-full transition-all ${k === i ? "w-7 bg-gold" : "w-2 bg-white/25"}`}
            />
          ))}
        </div>

        <button
          onClick={() => {
            titret(10);
            if (son) kapat();
            else setI(i + 1);
          }}
          className="btn-kor parilti mt-7 h-14 w-full max-w-xs rounded-2xl text-lg font-bold"
        >
          {son ? t.basla : t.ileri}
        </button>
      </div>

      <style jsx>{`
        .ayna-isim {
          background: linear-gradient(
            100deg,
            #e7c878 0%,
            #fff5d6 42%,
            #ffffff 50%,
            #fff5d6 58%,
            #d9ab59 100%
          );
          background-size: 220% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: isimParilti 5.5s ease-in-out infinite;
        }
        @keyframes isimParilti {
          0%,
          100% {
            background-position: 150% 0;
          }
          50% {
            background-position: -50% 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ayna-isim {
            animation: none;
            background-position: 50% 0;
          }
        }
      `}</style>
    </div>
  );
}

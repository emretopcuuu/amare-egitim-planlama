"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useEsc } from "@/lib/useEsc";
import { basHarfler, renkSec } from "@/components/Avatar";
import { tr } from "@/lib/i18n/tr";

const t = tr.kisiKarti;

// Grup rosterindeki AVATAR-YALNIZ hâli: KisiKarti'nin aynı görsel dilini
// (baş harf/renk, tam ekran büyütme, WhatsApp köprüsü) taşır ama satırın
// geri kalanı (isim + "Mesaj gönder" iç sohbet linki) ayrı kalsın diye
// bağımsız bir avatar düğmesi olarak çalışır. Saha isteği: "150 kişilik
// organizasyonda birini isimden tanımıyorum — grubumdakilerin küçük
// fotoğrafları yan yana olsun, dokununca büyüsün, WhatsApp'tan yazabileyim."
export default function GrupUyeFoto({
  ad,
  takim,
  telefon,
  fotoUrl,
}: {
  ad: string;
  takim: string | null;
  telefon: string | null;
  fotoUrl: string | null;
}) {
  const [acik, setAcik] = useState(false);
  useEsc(acik, () => setAcik(false));

  const ilkAd = ad.trim().split(/\s+/)[0] ?? ad;
  const waTel = telefon ? telefon.replace(/\D/g, "") : null;
  const waHref = waTel
    ? `https://wa.me/${waTel}?text=${encodeURIComponent(t.waMesaj(ilkAd))}`
    : null;

  const gorsel = (buyuk: boolean) =>
    fotoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={fotoUrl} alt={ad} className="h-full w-full object-cover" />
    ) : (
      <span
        className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${renkSec(
          ad
        )} font-bold text-white ${buyuk ? "text-7xl" : "text-lg"}`}
      >
        {basHarfler(ad)}
      </span>
    );

  return (
    <>
      {/* Satırın geri kalanı (Link → iç sohbet) tetiklenmesin diye durdur. */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setAcik(true);
        }}
        aria-label={`${ad} — ${t.buyut}`}
        className="h-11 w-11 shrink-0 overflow-hidden rounded-full ring-1 ring-gold/40 transition-transform active:scale-95"
      >
        {gorsel(false)}
      </button>

      {acik &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={ad}
            onClick={() => setAcik(false)}
            className="koyu-alan fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black/90 p-6 backdrop-blur"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex w-full max-w-sm flex-col items-center gap-4"
            >
              <div className="aspect-square w-full max-w-[320px] overflow-hidden rounded-3xl ring-2 ring-gold/40">
                {gorsel(true)}
              </div>
              <div className="text-center">
                <p className="font-display text-3xl font-bold leading-tight text-slate-100">{ad}</p>
                {takim && <p className="mt-1 text-sm text-slate-300">{t.takim(takim)}</p>}
                <p className="mt-1 text-xs text-slate-500">{t.ipucu}</p>
              </div>
              {waHref ? (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bas-his flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-base font-bold text-emerald-950 transition-colors hover:bg-emerald-400"
                >
                  💬 {t.waYaz}
                </a>
              ) : (
                <p className="w-full rounded-xl border border-white/10 px-4 py-3 text-center text-sm text-slate-300">
                  {takim ? t.takim(takim) : t.takimYok}
                </p>
              )}
              <button
                type="button"
                onClick={() => setAcik(false)}
                className="flex h-11 w-full items-center justify-center rounded-xl border border-white/15 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5"
              >
                {t.kapat}
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

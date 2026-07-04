"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useEsc } from "@/lib/useEsc";
import { basHarfler, renkSec } from "@/components/Avatar";
import { tr } from "@/lib/i18n/tr";

const t = tr.kisiKarti;

export type KisiKartiVeri = {
  ad: string;
  takim: string | null;
  telefon: string | null; // E.164; yalnız eşleşme hedefi için sunucudan gelir
  fotoUrl: string | null; // profil_foto_path'in kısa ömürlü imzalı URL'i
};

// D7 — EŞLEŞME KİŞİ KARTI. Kişiye yönlendiren her yüzeyde (görev hedefi,
// Bugünün Karşılaşması) dokunulabilir tanıtım kartı: avatar + isim + takım.
// Dokununca TAM EKRAN büyür — salonda "bu kişiyi arıyorum" diye telefonu
// gösterebilsin. Telefon varsa hazır mesajlı WhatsApp köprüsü; yoksa takım
// satırı. Avatar bileşeniyle aynı baş harf/renk dili (basHarfler/renkSec).
export default function KisiKarti({ ad, takim, telefon, fotoUrl }: KisiKartiVeri) {
  const [acik, setAcik] = useState(false);
  useEsc(acik, () => setAcik(false));

  const ilkAd = ad.trim().split(/\s+/)[0] ?? ad;
  const waTel = telefon ? telefon.replace(/\D/g, "") : null;
  const waHref = waTel
    ? `https://wa.me/${waTel}?text=${encodeURIComponent(t.waMesaj(ilkAd))}`
    : null;

  // Fotoğraf yoksa Avatar ile aynı deterministik baş harf bloğu.
  const gorsel = (buyuk: boolean) =>
    fotoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={fotoUrl} alt={ad} className="h-full w-full object-cover" />
    ) : (
      <span
        className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${renkSec(
          ad
        )} font-bold text-white ${buyuk ? "text-7xl" : "text-sm"}`}
      >
        {basHarfler(ad)}
      </span>
    );

  return (
    <>
      {/* Kapalı satır — tüm kart dokunulabilir (≥44px) */}
      <button
        type="button"
        onClick={() => setAcik(true)}
        aria-label={`${ad} — ${t.buyut}`}
        className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border border-gold/25 bg-white/[0.04] p-3 text-left transition-colors hover:bg-white/[0.07]"
      >
        <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full ring-1 ring-gold/40">
          {gorsel(false)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-100">{ad}</span>
          <span className="block truncate text-xs text-slate-400">
            {takim ? t.takim(takim) : t.buyut}
          </span>
        </span>
        <span className="shrink-0 text-slate-500" aria-hidden>
          ⤢
        </span>
      </button>

      {/* Tam ekran kişi kartı — salonda göstermelik büyük fotoğraf */}
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

"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";

const t = tr.elmas;

export type ElmasFacet = { ad: string; deger: number; gorevSayisi: number };
export type ElmasProps = {
  tamamlanan: number;
  parlaklik: number;
  ortalamaPuan: number | null;
  facetler: ElmasFacet[];
  sonFacet: string | null;
  asama: number; // 1..5 — unvana göre elmas aşaması
};

// Ana sayfanın kalbindeki CANLI kimlik elması + dokununca faset dökümü.
// "Her görevle Presidential Diamond yolculuğunda kendi kimliğine yatırım
// yapıyorsun" hissini taşıyan, yaşayan artefakt.
export default function KimlikElmasi({
  tamamlanan,
  parlaklik,
  ortalamaPuan,
  facetler,
  sonFacet,
  asama,
}: ElmasProps) {
  const [hareketli, setHareketli] = useState(true);
  const [acik, setAcik] = useState(false);

  useEffect(() => {
    setHareketli(!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const isiyan = facetler.filter((f) => f.deger > 0).length;
  const yuzde = Math.round(parlaklik * 100);
  const n = Math.min(5, Math.max(1, asama)); // güvenli aşama (1..5)

  const altMetin =
    tamamlanan === 0
      ? t.ilk
      : sonFacet
        ? t.sonIsiyan(sonFacet, isiyan)
        : t.isiyanOzet(isiyan);

  return (
    <>
      <button
        onClick={() => {
          titret(8);
          setAcik(true);
        }}
        aria-label={t.ac}
        className="relative block w-full overflow-hidden rounded-3xl border border-gold/25 bg-gradient-to-b from-[#071726]/60 to-[#040e18]/70 px-4 pb-4 pt-3"
      >
        {/* arka altın hâle — parlaklıkla yoğunlaşır */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
          style={{
            background: `radial-gradient(circle, rgba(212,175,55,${0.1 + parlaklik * 0.3}) 0%, rgba(212,175,55,0) 68%)`,
          }}
        />
        <div className="relative">
          <p className="text-center text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-gold-light/70">
            {t.baslik}
          </p>

          {/* KİMLİK ELMASI — kendi ekseninde dönen kusursuz loop video.
              mix-blend-mode: screen → siyah zemin tamamen kaybolur (kare yok,
              ton farkı yok), yalnız ışıyan elmas görünür; radyal maske kenarları
              eritir. Hareket-azaltta poster karesinde durur. */}
          <div className="relative mx-auto mt-1 aspect-square w-full max-w-[17rem]">
            <video
              key={n}
              src={`/elmas/elmas-loop-${n}.mp4`}
              poster={`/elmas/elmas-loop-${n}-poster.webp`}
              autoPlay={hareketli}
              loop
              muted
              playsInline
              preload="auto"
              aria-label={t.baslik}
              className="h-full w-full object-cover"
              style={{
                mixBlendMode: "screen",
                // (1) Videonun siyahı TAM siyaha ezildi (ffmpeg curves) → screen
                // blend'de zemin tamamen kaybolur, kare/dikdörtgen kalmaz.
                // (2) closest-side maske 4 kenara KADAR yumuşar → üst/alt/sağ/sol
                // düz çizgi olmaz; elması kırpmadan kenarı eritir.
                WebkitMaskImage: "radial-gradient(closest-side, #000 78%, transparent 100%)",
                maskImage: "radial-gradient(closest-side, #000 78%, transparent 100%)",
              }}
            />
          </div>

          {/* parlaklık çubuğu */}
          <div className="mx-auto mt-1 h-1.5 w-44 overflow-hidden rounded-full bg-white/10">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-gold-light to-gold transition-all duration-700"
              style={{ width: `${Math.max(4, yuzde)}%` }}
            />
          </div>
          <p className="mt-2 text-center text-sm font-medium leading-snug text-slate-200">
            {altMetin}
          </p>
          <p className="mt-0.5 text-center text-[0.7rem] text-gold-light/70">{t.dokun}</p>
        </div>
      </button>

      {/* DETAY PANELİ — fasetler (özellikler) + yatırım dökümü */}
      {acik && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm"
          onClick={() => setAcik(false)}
        >
          <div className="flex min-h-full items-center justify-center p-4 pb-[calc(7rem+env(safe-area-inset-bottom))]">
            <div
              className="relative w-full max-w-md rounded-3xl border border-gold/20 bg-midnight-card p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setAcik(false)}
                aria-label={t.kapat}
                className="absolute right-3 top-3 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-gold text-xl font-bold text-[#1a1206] shadow-lg active:scale-95"
              >
                ✕
              </button>
              <p className="prizma-serif ay-metin pointer-events-none pr-14 text-2xl font-semibold">
                {t.baslik}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">{t.aciklama}</p>

              <div className="mt-3 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="text-center">
                  <p className="font-display text-3xl font-bold text-gold-light">{tamamlanan}</p>
                  <p className="text-[0.65rem] uppercase tracking-wide text-slate-400">{t.gorev}</p>
                </div>
                <div className="text-center">
                  <p className="font-display text-3xl font-bold text-gold-light">{isiyan}/10</p>
                  <p className="text-[0.65rem] uppercase tracking-wide text-slate-400">{t.faset}</p>
                </div>
                {ortalamaPuan != null && (
                  <div className="text-center">
                    <p className="font-display text-3xl font-bold text-gold-light">{ortalamaPuan}</p>
                    <p className="text-[0.65rem] uppercase tracking-wide text-slate-400">{t.puan}</p>
                  </div>
                )}
              </div>

              <ul className="mt-4 space-y-2">
                {facetler.map((f) => (
                  <li
                    key={f.ad}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                      f.deger > 0
                        ? "border-gold/30 bg-gold/[0.06]"
                        : "border-white/8 bg-white/[0.02]"
                    }`}
                  >
                    <span
                      className={`text-lg ${f.deger > 0 ? "" : "opacity-30 grayscale"}`}
                      aria-hidden
                    >
                      {f.deger >= 1 ? "💎" : f.deger > 0 ? "✨" : "◇"}
                    </span>
                    <span
                      className={`flex-1 text-sm font-medium ${
                        f.deger > 0 ? "text-slate-100" : "text-slate-500"
                      }`}
                    >
                      {f.ad}
                    </span>
                    {f.gorevSayisi > 0 && (
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold-light">
                        {t.yatirim(f.gorevSayisi)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              <p className="mt-4 rounded-xl border border-royal/25 bg-royal/10 px-4 py-3 text-sm leading-relaxed text-slate-200">
                {t.motivasyon}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

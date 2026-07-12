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
  // G1 — market'ten alınan elmas ışık rengi (RGB "r,g,b"); yoksa altın varsayılan.
  isikRengi?: string;
  // G9 — 24 saat girilmediyse ince buğu (suçlama YOK; tek dokunuşla silinir).
  bugulu?: boolean;
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
  isikRengi = "212,175,55",
  bugulu = false,
}: ElmasProps) {
  const [hareketli, setHareketli] = useState(true);
  const [acik, setAcik] = useState(false);
  // G9 — buğu bu oturumda silindi mi + silme parıltısı.
  const [buguSilindi, setBuguSilindi] = useState(false);
  const [parilti, setParilti] = useState(false);
  const buguVar = bugulu && !buguSilindi;

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
          // G9 — buğu varsa ilk dokunuş onu siler (parıltıyla); detay açmaz.
          if (buguVar) {
            setBuguSilindi(true);
            titret(12);
            setParilti(true);
            setTimeout(() => setParilti(false), 750);
            return;
          }
          titret(8);
          setAcik(true);
        }}
        aria-label={buguVar ? "Elması sil" : t.ac}
        className="relative block w-full"
      >
        {/* ELMAS — arkasında kutu/zemin YOK; göl/zemin üzerinde yüzer (screen
            blend). Yalnız arkasında yumuşak altın bir hâle. */}
        <div className="relative mx-auto aspect-square w-full max-w-[16rem]">
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
            style={{
              background: `radial-gradient(circle, rgba(${isikRengi},${0.08 + parlaklik * 0.26}) 0%, rgba(${isikRengi},0) 64%)`,
            }}
          />
          {/* kendi ekseninde dönen kusursuz loop video; siyah-ez + screen blend
              + closest-side maske → kare/ton/çizgi yok, zemine kaynaşır. */}
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
            className="relative h-full w-full object-cover"
            style={{
              mixBlendMode: "screen",
              WebkitMaskImage: "radial-gradient(closest-side, #000 78%, transparent 100%)",
              maskImage: "radial-gradient(closest-side, #000 78%, transparent 100%)",
            }}
          />
          {/* G9 — BUĞU: 24s girilmediyse ince frosted katman (suçlama YOK). */}
          {buguVar && (
            <span
              aria-hidden
              className="elmas-bugu pointer-events-none absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background: "radial-gradient(closest-side, rgba(226,232,240,0.22) 40%, rgba(226,232,240,0) 82%)",
                backdropFilter: "blur(1.5px)",
                WebkitBackdropFilter: "blur(1.5px)",
              }}
            />
          )}
          {/* Silme parıltısı */}
          {parilti && (
            <span
              aria-hidden
              className="elmas-parilti pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl"
            >
              ✨
            </span>
          )}
        </div>
        {buguVar && (
          <p className="mt-1 text-center text-xs text-slate-400">Elmasın seni özledi — dokun, sil.</p>
        )}

        {/* YAZILAR — sade zemin SADECE bunların çevresinde (okunabilirlik) */}
        <div className="mx-auto mt-1 w-full max-w-xs rounded-2xl border border-white/10 bg-midnight-card/55 px-4 py-3 backdrop-blur">
          <div className="mx-auto h-1.5 w-44 overflow-hidden rounded-full bg-white/10">
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

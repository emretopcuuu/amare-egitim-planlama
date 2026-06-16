"use client";

import { useState } from "react";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";
import YaziBoyu from "@/components/YaziBoyu";
import GunesModu from "@/components/GunesModu";

const t = tr.anaSayfa;

type Props = {
  ozTamam: boolean;
  dalgaAcik: boolean;
  raporlarAcik: boolean;
  yansimanHazir: boolean;
  ozHedefId: string;
};

// Üst menü: açılış ekranı tek işe odaklanır; ikincil her şey (kendi puanlarını
// düzenleme, program, görevler, çıkış) buradan açılır. Yaşlı kullanıcılar için
// büyük dokunma hedefleri.
export default function UstMenu({
  ozTamam,
  dalgaAcik,
  raporlarAcik,
  yansimanHazir,
  ozHedefId,
}: Props) {
  const [acik, setAcik] = useState(false);

  // BİRİNCİL: o an kişiye özel, en önemli işler (büyük butonlar).
  // Değerlendir / Görevler / Duvar zaten alt çubukta — menüde tekrarlanmaz.
  const birincil: { href: string; etiket: string }[] = [];
  if (ozTamam && dalgaAcik)
    birincil.push({ href: `/degerlendir/${ozHedefId}`, etiket: t.menuOzDuzenle });
  if (raporlarAcik) birincil.push({ href: "/ayna", etiket: t.menuRapor });
  if (yansimanHazir) birincil.push({ href: "/yansiman", etiket: t.menuYansiman });
  birincil.push({ href: "/soz", etiket: t.menuSoz });

  // EKSTRA: sosyal ve ikincil her şey (küçük, ikişerli ızgara).
  const ekstra: { href: string; etiket: string }[] = [
    { href: "/ben", etiket: t.menuBen },
    { href: "/grup", etiket: t.menuGrup },
    { href: "/anlar", etiket: t.menuAnlar },
    { href: "/turnuva", etiket: t.menuTurnuva },
    { href: "/takdir", etiket: t.menuTakdir },
    { href: "/ortak", etiket: t.menuOrtak },
    { href: "/program", etiket: t.menuProgram },
    { href: "/gizlilik", etiket: t.menuGizlilik },
  ];

  async function cikis() {
    await fetch("/api/cikis", { method: "POST" });
    window.location.href = "/giris";
  }

  return (
    <>
      <button
        onClick={() => setAcik(true)}
        aria-label={t.menuBaslik}
        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] text-2xl text-slate-200 transition-colors hover:bg-white/[0.08]"
      >
        ☰
      </button>

      {acik && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm"
          onClick={() => setAcik(false)}
        >
          <div
            className="mx-auto mt-auto w-full max-w-lg rounded-t-3xl border-t border-white/10 bg-midnight-card p-6 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="prizma-serif ay-metin text-center text-2xl font-semibold">
              {t.menuBaslik}
            </p>

            {/* Birincil: büyük, dikey */}
            {birincil.length > 0 && (
              <>
                <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t.menuBirincilBaslik}
                </p>
                <nav className="mt-2 space-y-3">
                  {birincil.map((b) => (
                    <Link
                      key={b.href}
                      href={b.href}
                      onClick={() => setAcik(false)}
                      className="flex h-16 w-full items-center rounded-2xl border border-white/15 px-5 text-lg font-semibold text-slate-100 transition-colors hover:bg-white/[0.06]"
                    >
                      {b.etiket}
                    </Link>
                  ))}
                </nav>
              </>
            )}

            {/* Ekstra: küçük, ikişerli ızgara */}
            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t.menuEkstraBaslik}
            </p>
            <nav className="mt-2 grid grid-cols-2 gap-2.5">
              {ekstra.map((b) => (
                <Link
                  key={b.href}
                  href={b.href}
                  onClick={() => setAcik(false)}
                  className="flex h-14 w-full items-center justify-center rounded-2xl border border-white/15 px-3 text-center text-sm font-medium text-slate-200 transition-colors hover:bg-white/[0.06]"
                >
                  {b.etiket}
                </Link>
              ))}
            </nav>

            <div className="mt-4 space-y-3">
              <YaziBoyu />
              <GunesModu />
            </div>
            <button
              onClick={cikis}
              className="mt-4 flex h-14 w-full items-center justify-center rounded-2xl border border-red-400/30 px-5 text-base font-semibold text-red-300 transition-colors hover:bg-red-400/10"
            >
              {t.cikisYap}
            </button>
            <button
              onClick={() => setAcik(false)}
              className="mt-5 flex h-12 w-full items-center justify-center text-base text-slate-400 hover:text-slate-200"
            >
              {t.menuKapat}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

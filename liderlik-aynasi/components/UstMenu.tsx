"use client";

import { useState } from "react";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";
import YaziBoyu from "@/components/YaziBoyu";

const t = tr.anaSayfa;

type Props = {
  ozTamam: boolean;
  dalgaAcik: boolean;
  raporlarAcik: boolean;
  gorevSayisi: number;
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
  gorevSayisi,
  yansimanHazir,
  ozHedefId,
}: Props) {
  const [acik, setAcik] = useState(false);

  const baglantilar: { href: string; etiket: string }[] = [];
  if (ozTamam && dalgaAcik)
    baglantilar.push({ href: `/degerlendir/${ozHedefId}`, etiket: t.menuOzDuzenle });
  if (dalgaAcik) baglantilar.push({ href: "/degerlendir", etiket: t.menuDegerlendir });
  if (raporlarAcik) baglantilar.push({ href: "/ayna", etiket: t.menuRapor });
  if (gorevSayisi > 0) baglantilar.push({ href: "/gorevler", etiket: t.menuGorevler });
  if (yansimanHazir) baglantilar.push({ href: "/yansiman", etiket: t.menuYansiman });
  baglantilar.push({ href: "/anlar", etiket: t.menuAnlar });
  baglantilar.push({ href: "/program", etiket: t.menuProgram });

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
            <nav className="mt-6 space-y-3">
              {baglantilar.map((b) => (
                <Link
                  key={b.href + b.etiket}
                  href={b.href}
                  onClick={() => setAcik(false)}
                  className="flex h-16 w-full items-center rounded-2xl border border-white/15 px-5 text-lg font-semibold text-slate-100 transition-colors hover:bg-white/[0.06]"
                >
                  {b.etiket}
                </Link>
              ))}
              <button
                onClick={cikis}
                className="flex h-16 w-full items-center rounded-2xl border border-red-400/30 px-5 text-lg font-semibold text-red-300 transition-colors hover:bg-red-400/10"
              >
                {t.cikisYap}
              </button>
            </nav>
            <div className="mt-4">
              <YaziBoyu />
            </div>
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

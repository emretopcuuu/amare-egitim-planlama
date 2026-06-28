"use client";

import { useState } from "react";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";
import YaziBoyu from "@/components/YaziBoyu";
import TemaSecimi from "@/components/TemaSecimi";
import BildirimAnahtari from "@/components/BildirimAnahtari";

const t = tr.anaSayfa;

type Props = {
  ozTamam: boolean;
  dalgaAcik: boolean;
  raporlarAcik: boolean;
  yansimanHazir: boolean;
  ozHedefId: string;
  // Kamp öncesi adımları (Pusula/Hedef/Ön Farkındalık) tamamlayanlar için
  // bu sayfalar yetim kalmasın — menüden geri dönülebilsin.
  pusulaTamam?: boolean;
  hedefTamam?: boolean;
  ofTamam?: boolean;
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
  pusulaTamam = false,
  hedefTamam = false,
  ofTamam = false,
}: Props) {
  const [acik, setAcik] = useState(false);

  // BİRİNCİL: o an kişiye özel, en önemli işler (büyük butonlar).
  // Değerlendir / Görevler / Duvar zaten alt çubukta — menüde tekrarlanmaz.
  const birincil: { href: string; etiket: string }[] = [];
  // GELİŞTİRME #1: Ayna Koçu her zaman erişilebilir birincil eylem.
  birincil.push({ href: "/kocu", etiket: t.menuKocu });
  if (ozTamam && dalgaAcik)
    birincil.push({ href: `/degerlendir/${ozHedefId}`, etiket: t.menuOzDuzenle });
  if (raporlarAcik) birincil.push({ href: "/ayna", etiket: t.menuRapor });
  if (yansimanHazir) birincil.push({ href: "/yansiman", etiket: t.menuYansiman });
  birincil.push({ href: "/soz", etiket: t.menuSoz });

  // EKSTRA: sosyal ve ikincil her şey (küçük, ikişerli ızgara).
  // S4: Anlar/Turnuva/Ortak/Mini360/Plan kaldırıldı — erişilmez veya kenar özellikler.
  // Sadeleştirme: Kamp Programı (alt çubukta "Program" sekmesiyle aynı) ve kamp
  // öncesi düzelt-linkleri (Pusulam/Hedefim/Ön Farkındalık — mühür ekranındaki
  // checklist'te zaten var) menüden kaldırıldı; kalabalık azaltıldı.
  const ekstra: { href: string; etiket: string }[] = [
    { href: "/ben", etiket: t.menuBen },
    { href: "/gunluk", etiket: t.menuGunluk },
    { href: "/grup", etiket: t.menuGrup },
    { href: "/ayna-esi", etiket: t.menuAynaEsi },
    { href: "/takdir", etiket: t.menuTakdir },
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
        // Dış katman = kaydırma kabı; iç katman = min-h-full flex ile DİKEY ORTALA.
        // Bu ikili yapı, menü ekrandan uzun olsa bile (telefon) üstten kırpılmadan
        // kaydırmaya izin verir; geniş ekranda tam ortada durur — asla alta yapışmaz.
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm"
          onClick={() => setAcik(false)}
        >
          {/* Alt nav (alttaki Ana sayfa/Görevler/Program çubuğu) menünün en alt
              tuşunu örtmesin: alta geniş nefes payı + güvenli alan. */}
          <div className="flex min-h-full items-center justify-center p-4 pb-[calc(7rem+env(safe-area-inset-bottom))]">
            <div
              className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-midnight-card p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Her zaman görünen kapatma çarpısı — altın dolgu her iki temada net */}
              <button
                onClick={() => setAcik(false)}
                aria-label={t.menuKapat}
                className="absolute right-3 top-3 flex h-14 w-14 items-center justify-center rounded-full bg-gold text-2xl font-bold text-[#1a1206] shadow-lg ring-1 ring-black/10 transition-transform hover:scale-105 active:scale-95"
              >
                ✕
              </button>

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
                <BildirimAnahtari />
                <YaziBoyu />
                <TemaSecimi />
              </div>
              <button
                onClick={cikis}
                className="mt-4 flex h-14 w-full items-center justify-center rounded-2xl border border-red-400/30 px-5 text-base font-semibold text-red-300 transition-colors hover:bg-red-400/10"
              >
                {t.cikisYap}
              </button>
              <button
                onClick={() => setAcik(false)}
                className="mt-5 flex h-14 w-full items-center justify-center rounded-2xl border-2 border-gold/50 text-base font-semibold text-gold-light transition-colors hover:bg-gold/10"
              >
                ✕ {t.menuKapat}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

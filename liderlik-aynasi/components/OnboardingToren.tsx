"use client";

import { useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { kutla } from "@/lib/his";
import Konfeti from "@/components/Konfeti";
import AynaSahneLoop from "@/components/AynaSahneLoop";

const t = tr.anaSayfa;

// [E10] ONBOARDING BİTİŞ TÖRENİ — checklist'in tamamı İLK KEZ yeşile döndüğü
// an gösterilen tam ekran tören: "Aynan kuruldu ✨" + kişinin Pusula sloganı
// (yoksa genel cümle) + konfeti (kütüphanesiz, mevcut Konfeti) + kapanış.
// TEK SEFERLİK: sunucu (app/page.tsx) render ederken participants.
// onboarding_toren_at'i damgalar; buradaki buton yalnız akışı sürdürür.
export default function OnboardingToren({ slogan }: { slogan: string | null }) {
  const [devamEdiliyor, setDevamEdiliyor] = useState(false);

  function devam() {
    if (devamEdiliyor) return;
    setDevamEdiliyor(true);
    kutla();
    // Damga sunucuda zaten atıldı — tam yenileme akışı bir sonraki kapıya
    // (mühür bekleme / kamp) taşır (ritüel kapanışındaki bulletproof desen).
    window.location.href = "/";
  }

  return (
    <main className="gece-ada fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[#04101c] p-6 text-[#e6edf4]">
      <Konfeti anahtar="kutlama-onboarding-toren" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center py-8 text-center">
        <p className="prizma-serif text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
          {t.torenUst}
        </p>
        {/* Görsel paket #2 — onboarding'in duygusal zirvesinde kutlayan AYNA
            (konfetili video loop; oynamazsa statik kutlama pozuna düşer) */}
        <AynaSahneLoop mod="kutlama" boyut={150} sinif="mt-6" />
        <h1 className="prizma-serif ay-metin mt-5 text-4xl font-bold leading-tight">
          {t.torenBaslik}
        </h1>
        {slogan ? (
          <div className="mt-7 w-full rounded-2xl border border-gold/30 bg-gold/[0.07] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              {t.torenSloganEtiket}
            </p>
            <p className="prizma-serif ay-metin mt-2 text-xl italic leading-relaxed text-gold-light">
              “{slogan}”
            </p>
          </div>
        ) : (
          <p className="mt-7 max-w-sm text-lg leading-relaxed text-slate-300">
            {t.torenGenel}
          </p>
        )}
        <p className="mt-6 text-lg font-semibold text-slate-200">{t.torenKapanis}</p>
        <button
          onClick={devam}
          disabled={devamEdiliyor}
          className="btn-kor parilti mt-9 flex h-16 w-full items-center justify-center rounded-2xl text-xl font-bold disabled:opacity-60"
        >
          {t.torenDevam}
        </button>
      </div>
    </main>
  );
}

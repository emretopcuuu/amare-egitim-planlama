"use client";

import { useEffect, useRef, useState } from "react";
import Konfeti from "@/components/Konfeti";
import { titret } from "@/lib/his";
import { useEsc } from "@/lib/useEsc";
import { tr } from "@/lib/i18n/tr";
import MuhurIkon from "@/components/MuhurIkon";

const ANAHTAR = "la_muhur_v1";
const t = tr.muhur;

type Asama = "kapali" | "ses" | "ad" | "kapandi";

// A2 — Mühür Açılışı: kamp sonunda, Ayna Raporu'na giren katılımcıya rapordan
// ÖNCE oynar. Onboarding'de kendi sesiyle mühürlediği sözü açar (3 gün önceki
// sesini dinletir), yazdığı sözü gösterir ve "kampa ___ geldin, ___ dönüyorsun"
// adlandırmasını verir. Bir kez gösterilir (localStorage); kapanınca rapor görünür.
export default function MuhurAcilis({
  aktif,
  sesUrl,
  beklenti,
  gelis,
  donus,
  ayni,
  onKapat,
}: {
  aktif: boolean;
  sesUrl: string | null;
  beklenti: string | null;
  gelis: string;
  donus: string;
  ayni: boolean;
  onKapat?: () => void;
}) {
  const [asama, setAsama] = useState<Asama>("kapandi");
  const [caliyor, setCaliyor] = useState(false);
  const ses = useRef<HTMLAudioElement | null>(null);
  useEsc(asama !== "kapandi", () => kapat());

  useEffect(() => {
    if (!aktif) return;
    try {
      if (!localStorage.getItem(ANAHTAR)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAsama("kapali");
      }
    } catch {}
  }, [aktif]);

  useEffect(() => {
    // unmount: çalan kaydı durdur
    return () => ses.current?.pause();
  }, []);

  function ac() {
    titret([15, 40, 20]);
    // Ne ses ne yazı varsa doğrudan adlandırmaya geç
    setAsama(sesUrl || beklenti ? "ses" : "ad");
  }

  function sesCal() {
    if (!sesUrl) return;
    if (caliyor) {
      ses.current?.pause();
      if (ses.current) ses.current.currentTime = 0;
      setCaliyor(false);
      return;
    }
    const a = new Audio(sesUrl);
    ses.current = a;
    a.onended = () => setCaliyor(false);
    void a
      .play()
      .then(() => setCaliyor(true))
      .catch(() => setCaliyor(false));
  }

  function adaGec() {
    ses.current?.pause();
    setCaliyor(false);
    titret([15, 40, 15, 40, 30]);
    setAsama("ad");
  }

  function kapat() {
    try {
      localStorage.setItem(ANAHTAR, "1");
    } catch {}
    ses.current?.pause();
    setAsama("kapandi");
    onKapat?.();
  }

  if (asama === "kapandi") return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="gece-ada fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-[#04101c]/96 p-6 text-[#e6edf4] backdrop-blur-md"
    >
      {asama === "ad" && <Konfeti anahtar="muhur-acilis" />}
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8 text-center">
        {asama === "kapali" && (
          <>
            <MuhurIkon className="mx-auto h-20 w-20 text-gold-light" />
            <p className="prizma-serif mt-6 text-sm uppercase tracking-[0.4em] text-slate-400">
              {t.kapaliUst}
            </p>
            <h1 className="prizma-serif ay-metin mt-3 text-3xl font-semibold leading-tight">
              {t.kapaliBaslik}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-200">{t.kapaliMetin}</p>
            <button
              onClick={ac}
              className="btn-kor parilti mt-10 flex h-16 w-full items-center justify-center rounded-2xl text-xl font-bold"
            >
              {t.ac}
            </button>
          </>
        )}

        {asama === "ses" && (
          <>
            <p className="prizma-serif text-sm uppercase tracking-[0.35em] text-slate-400">
              {t.sesUst}
            </p>
            <h1 className="prizma-serif ay-metin mt-3 text-3xl font-semibold leading-tight">
              {t.sesBaslik}
            </h1>
            {sesUrl && (
              <>
                <p className="mt-5 text-base leading-relaxed text-slate-200">{t.sesMetin}</p>
                <button
                  onClick={sesCal}
                  className="mt-8 flex h-16 w-full items-center justify-center rounded-2xl border-2 border-white/25 text-xl font-bold text-slate-100 hover:bg-white/[0.08]"
                >
                  {caliyor ? t.sozDurdur : t.sozDinle}
                </button>
              </>
            )}
            {beklenti && (
              <div className="mt-8 rounded-2xl border border-gold/30 bg-gold/[0.06] px-5 py-4 text-left">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold-light">
                  {t.yaziUst}
                </p>
                <p className="prizma-serif mt-2 text-lg leading-relaxed text-slate-100">
                  “{beklenti}”
                </p>
              </div>
            )}
            <button
              onClick={adaGec}
              className="btn-kor parilti mt-10 flex h-16 w-full items-center justify-center rounded-2xl text-xl font-bold"
            >
              {t.devam}
            </button>
          </>
        )}

        {asama === "ad" && (
          <>
            <p className="prizma-serif text-sm uppercase tracking-[0.4em] text-gold-light">
              {t.adUst}
            </p>
            {ayni ? (
              <h1 className="prizma-serif ay-metin mt-6 text-3xl font-semibold leading-snug">
                {t.adAyni(donus)}
              </h1>
            ) : (
              <div className="mt-6 space-y-3">
                <p className="text-xl leading-relaxed text-slate-400">{t.adGeldin(gelis)}</p>
                <h1 className="prizma-serif ay-metin text-4xl font-semibold leading-tight">
                  {t.adDonuyorsun(donus)}
                </h1>
              </div>
            )}
            <p className="mt-6 text-base leading-relaxed text-slate-300">{t.adAciklama}</p>
            <button
              onClick={kapat}
              className="btn-kor parilti mt-10 flex h-16 w-full items-center justify-center rounded-2xl text-xl font-bold"
            >
              {t.bak}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

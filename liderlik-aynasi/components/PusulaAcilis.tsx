"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { titret, cal } from "@/lib/his";

const t = tr.pusulaAcilis;
const R = t.replik;

// "NEDENİNİ BUL" — Pusula sinematik açılışı. Kişiyi 40 sn'de "bir form daha"
// zihninden "burada hayatımı ilgilendiren bir şey var" zihnine taşır.
// Katmanlar: kara perde + AYNA sesi · sinematik video · tek satır tek nefes ·
// söz/mühür + kişisel kanca. Ses açılamazsa (autoplay/anahtar) sessiz+altyazı.

type Perde = { kod: keyof typeof R | string; oto: boolean; minSure: number };
// İndeks: 0 eşik · 1 tanıma · 2-3 bahis · 4 kıvılcım · 5 mühür · 6 geçiş
const PERDELER: Perde[] = [
  { kod: "p0", oto: true, minSure: 3200 },
  { kod: "p1", oto: true, minSure: 4800 },
  { kod: "p2a", oto: true, minSure: 2800 },
  { kod: "p2b", oto: true, minSure: 3400 },
  { kod: "p3", oto: true, minSure: 5200 },
  { kod: "p4", oto: false, minSure: 4600 }, // mühür: basılı tut ilerletir
  { kod: "p5", oto: true, minSure: 2600 },
];
const SON = PERDELER.length - 1;
const MUHUR_SURE = 1500; // basılı tutma süresi (ms)

export default function PusulaAcilis({
  ad,
  onBitti,
}: {
  ad: string;
  onBitti: () => void;
}) {
  const [basladi, setBasladi] = useState(false);
  const [perde, setPerde] = useState(0);
  const [sesAcik, setSesAcik] = useState(true);
  const [azalt, setAzalt] = useState(false);
  const [muhurOran, setMuhurOran] = useState(0); // 0..1
  const [muhurlendi, setMuhurlendi] = useState(false);

  const sesRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bittiRef = useRef(false);
  const muhurZam = useRef<ReturnType<typeof setTimeout> | null>(null);
  const muhurRaf = useRef<number | null>(null);

  // prefers-reduced-motion: video/parıltı yerine sade kararma, akış aynı kalır.
  useEffect(() => {
    setAzalt(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  function bitir() {
    if (bittiRef.current) return;
    bittiRef.current = true;
    try {
      sesRef.current?.pause();
      videoRef.current?.pause();
    } catch {}
    onBitti();
  }

  // PERDE SÜRÜCÜSÜ: her perdede AYNA replisini seslendirir; oto perdelerde ses
  // bitince VEYA minSure dolunca (hangisi geçse) sonrakine geçer. Ses yoksa
  // yalnız minSure. Mühür perdesi (oto:false) basılı-tut ile ilerler.
  useEffect(() => {
    if (!basladi) return;
    const def = PERDELER[perde];
    let iptal = false;
    let sesBitti = !sesAcik;
    let sureBitti = false;

    const ilerle = () => {
      if (iptal || !def.oto || !sesBitti || !sureBitti) return;
      if (perde >= SON) bitir();
      else setPerde((p) => p + 1);
    };

    const zaman = setTimeout(() => {
      sureBitti = true;
      ilerle();
    }, def.minSure);

    const a = sesRef.current;
    if (sesAcik && a) {
      a.onended = () => {
        sesBitti = true;
        ilerle();
      };
      a.onerror = () => {
        setSesAcik(false);
        sesBitti = true;
        ilerle();
      };
      a.src = `/api/ayna-ses?k=${def.kod}`;
      void a.play().catch(() => {
        // autoplay reddi / anahtar yok → sessiz moda düş, akış sürsün
        setSesAcik(false);
        sesBitti = true;
        ilerle();
      });
    }
    titret(perde === 0 ? [10, 40, 10] : 12);

    return () => {
      iptal = true;
      clearTimeout(zaman);
      if (a) {
        a.onended = null;
        a.onerror = null;
      }
    };
    // sesAcik bilerek bağımlılıkta değil: perde içinde tek sefer kurulum.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perde, basladi]);

  // İlk dokunuş: ses bağlamını aç (autoplay kilidi) + akışı başlat.
  function basla() {
    if (basladi) return;
    setBasladi(true);
  }

  // Mühür: basılı tutuldukça dolar; bırakınca sıfırlanır; dolunca ilerler.
  function muhurBasla() {
    if (muhurlendi) return;
    const t0 = performance.now();
    const tik = () => {
      const oran = Math.min(1, (performance.now() - t0) / MUHUR_SURE);
      setMuhurOran(oran);
      if (oran < 1) muhurRaf.current = requestAnimationFrame(tik);
    };
    muhurRaf.current = requestAnimationFrame(tik);
    muhurZam.current = setTimeout(() => {
      setMuhurlendi(true);
      setMuhurOran(1);
      titret([20, 60, 30]);
      cal("kazanim");
      // mühürden sonra geçiş perdesine
      setTimeout(() => {
        if (perde >= SON) bitir();
        else setPerde((p) => p + 1);
      }, 650);
    }, MUHUR_SURE);
  }
  function muhurBirak() {
    if (muhurlendi) return;
    if (muhurZam.current) clearTimeout(muhurZam.current);
    if (muhurRaf.current) cancelAnimationFrame(muhurRaf.current);
    setMuhurOran(0);
  }

  useEffect(
    () => () => {
      if (muhurZam.current) clearTimeout(muhurZam.current);
      if (muhurRaf.current) cancelAnimationFrame(muhurRaf.current);
    },
    []
  );

  const def = PERDELER[perde];

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-[#04060b] text-[#eef2f7]">
      {/* Sinematik arka plan (sessiz, döngü). Reduced-motion'da gösterilmez. */}
      {!azalt && (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover opacity-70"
          src="/pusula-acilis.mp4"
          poster="/pusula-acilis.webp"
          muted
          loop
          autoPlay
          playsInline
          aria-hidden
        />
      )}
      {/* Okunabilirlik için koyu vinyet */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#04060b]/85 via-[#04060b]/55 to-[#04060b]/92" />

      {/* AYNA sesi (gizli) */}
      <audio ref={sesRef} preload="auto" />

      {/* Geç — her zaman, soluk */}
      <button
        type="button"
        onClick={bitir}
        className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-20 rounded-full px-3 py-1.5 text-sm text-slate-400/80 transition-colors hover:text-slate-200"
      >
        {t.gec} →
      </button>

      {/* BAŞLAMADAN ÖNCE — dokunuş kapısı (ses autoplay kilidi için) */}
      {!basladi && (
        <button
          type="button"
          onClick={basla}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-8 text-center"
        >
          <p className="prizma-serif ay-metin text-3xl font-semibold leading-snug sm:text-4xl">
            {R.p0}
          </p>
          <span className="mt-10 inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-base text-slate-200">
            <span className="h-2.5 w-2.5 animate-ping rounded-full bg-gold" />
            {t.dokun}
          </span>
        </button>
      )}

      {/* PERDELER */}
      {basladi && (
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-8 text-center">
          <div key={perde} className="of-adim w-full max-w-md">
            {def.kod === "p1" && (
              <>
                <p className="prizma-serif ay-metin text-4xl font-bold tracking-wide text-gold-light sm:text-5xl">
                  {ad}
                </p>
                <p className="mt-5 text-xl leading-relaxed text-slate-200">{R.p1}</p>
              </>
            )}

            {def.kod === "p4" ? (
              <>
                <p className="text-lg leading-relaxed text-slate-200">{R.p4}</p>
                {/* MÜHÜR — basılı tut */}
                <div className="mt-8 flex flex-col items-center">
                  <button
                    type="button"
                    onPointerDown={muhurBasla}
                    onPointerUp={muhurBirak}
                    onPointerLeave={muhurBirak}
                    onContextMenu={(e) => e.preventDefault()}
                    className="relative flex h-32 w-32 select-none items-center justify-center rounded-full border-2 border-gold/50 bg-gold/[0.07] outline-none"
                    style={{ touchAction: "none" }}
                    aria-label={t.muhurIpucu}
                  >
                    {/* dolum halkası */}
                    <span
                      className="pointer-events-none absolute inset-0 rounded-full"
                      style={{
                        background: `conic-gradient(var(--gold,#d4af37) ${muhurOran * 360}deg, transparent 0deg)`,
                        opacity: 0.5,
                        mask: "radial-gradient(circle, transparent 58%, #000 60%)",
                        WebkitMask: "radial-gradient(circle, transparent 58%, #000 60%)",
                      }}
                    />
                    <span className="text-4xl" aria-hidden>
                      {muhurlendi ? "✓" : "🔒"}
                    </span>
                  </button>
                  <p className="mt-4 text-base font-semibold text-gold-light">{t.muhurYazi}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {muhurlendi ? t.muhurTamam : t.muhurIpucu}
                  </p>
                </div>
              </>
            ) : def.kod === "p3" ? (
              <p className="prizma-serif ay-metin text-2xl font-semibold leading-snug sm:text-3xl">
                {R.p3}
              </p>
            ) : def.kod === "p5" ? (
              <p className="prizma-serif ay-metin text-3xl font-bold leading-snug sm:text-4xl">
                {R.p5}
              </p>
            ) : def.kod === "p2a" || def.kod === "p2b" ? (
              <p className="prizma-serif text-2xl font-semibold leading-snug text-slate-50 sm:text-3xl">
                {def.kod === "p2a" ? R.p2a : R.p2b}
              </p>
            ) : def.kod === "p1" ? null : (
              <p className="prizma-serif ay-metin text-3xl font-semibold leading-snug">
                {R[def.kod]}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

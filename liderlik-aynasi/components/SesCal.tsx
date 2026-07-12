"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";

// YANSIMAN oynatıcısı: imzalı URL'deki mp3'ü çalar. Mobil tarayıcılar sesi
// ancak kullanıcı dokunuşuyla başlatır — buton tam da o ritüel dokunuştur.
// UX paketi #6: ilerleme çubuğu + 15 sn geri sarma (uzun radyo yayınlarında
// kaçan cümleye dönmek için). #8: cihaz başına TEK seferlik "sesi aç" ipucu.
const SES_IPUCU_ANAHTAR = "la_ses_ipucu_gosterildi";

export default function SesCal({
  url,
  etiket,
  onCaliyor,
}: {
  url: string;
  etiket?: string;
  /** Görsel paket #10 — çalma durumunu dışarı bildir (radyo kartındaki canlı maskot). */
  onCaliyor?: (caliyor: boolean) => void;
}) {
  const ses = useRef<HTMLAudioElement | null>(null);
  const [caliyor, setCaliyorHam] = useState(false);
  const [yuzde, setYuzde] = useState(0);
  const [basladi, setBasladi] = useState(false); // ilerleme/geri sar ancak ilk oynatmadan sonra
  const [ipucu, setIpucu] = useState(false);
  const setCaliyor = (c: boolean) => {
    setCaliyorHam(c);
    onCaliyor?.(c);
  };

  useEffect(() => {
    // #8 — bu cihazda daha önce hiç ses çalınmadıysa nazik ipucu göster.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!localStorage.getItem(SES_IPUCU_ANAHTAR)) setIpucu(true);
    } catch {}
    return () => ses.current?.pause();
  }, []);

  function kur(): HTMLAudioElement {
    if (!ses.current) {
      const a = new Audio(url);
      a.onended = () => {
        setCaliyor(false);
        setYuzde(0);
      };
      a.ontimeupdate = () => {
        if (a.duration > 0) setYuzde(Math.min(100, (a.currentTime / a.duration) * 100));
      };
      ses.current = a;
    }
    return ses.current;
  }

  function tikla() {
    const a = kur();
    if (caliyor) {
      a.pause();
      setCaliyor(false);
    } else {
      void a
        .play()
        .then(() => {
          setCaliyor(true);
          setBasladi(true);
          // İlk başarılı oynatma: ipucu görevini tamamladı, bir daha çıkmaz.
          try {
            localStorage.setItem(SES_IPUCU_ANAHTAR, "1");
          } catch {}
          setIpucu(false);
        })
        .catch(() => setCaliyor(false));
    }
  }

  // #6 — 15 sn geri: kaçan cümleye baştan dinlemeden dön.
  function geriSar() {
    const a = ses.current;
    if (!a) return;
    a.currentTime = Math.max(0, a.currentTime - 15);
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <button
          onClick={tikla}
          className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors ${
            caliyor
              ? "border-gold/50 bg-gold/15 text-gold-light"
              : "border-white/15 text-slate-200 hover:bg-white/[0.06]"
          }`}
        >
          {caliyor ? tr.gorevler.durdur : (etiket ?? tr.gorevler.dinle)}
        </button>
        {basladi && (
          <button
            onClick={geriSar}
            aria-label="15 saniye geri"
            title="15 saniye geri"
            className="flex h-10 w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/[0.06]"
          >
            ↺15
          </button>
        )}
      </div>
      {/* İlerleme çubuğu — yalnız oynatma başladıysa görünür */}
      {basladi && (
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10" aria-hidden>
          <div
            className="h-full rounded-full bg-gold/70 transition-[width] duration-300"
            style={{ width: `${yuzde}%` }}
          />
        </div>
      )}
      {/* #8 — cihaz başına tek seferlik "sesi aç" ipucu */}
      {ipucu && (
        <p className="mt-1.5 text-xs leading-relaxed text-amber-300/80">{tr.gorevler.sesIpucu}</p>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";

// YANSIMAN oynatıcısı: imzalı URL'deki mp3'ü çalar. Mobil tarayıcılar sesi
// ancak kullanıcı dokunuşuyla başlatır — buton tam da o ritüel dokunuştur.
export default function SesCal({ url }: { url: string }) {
  const ses = useRef<HTMLAudioElement | null>(null);
  const [caliyor, setCaliyor] = useState(false);

  useEffect(() => {
    return () => ses.current?.pause();
  }, []);

  function tikla() {
    if (!ses.current) {
      ses.current = new Audio(url);
      ses.current.onended = () => setCaliyor(false);
    }
    if (caliyor) {
      ses.current.pause();
      ses.current.currentTime = 0;
      setCaliyor(false);
    } else {
      void ses.current
        .play()
        .then(() => setCaliyor(true))
        .catch(() => setCaliyor(false));
    }
  }

  return (
    <button
      onClick={tikla}
      className={`mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors ${
        caliyor
          ? "border-gold/50 bg-gold/15 text-gold-light"
          : "border-white/15 text-slate-200 hover:bg-white/[0.06]"
      }`}
    >
      {caliyor ? tr.gorevler.durdur : tr.gorevler.dinle}
    </button>
  );
}

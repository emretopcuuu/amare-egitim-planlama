"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";

const t = tr.gorevler;

// AYNA'nın görev metnini sesli okur (tarayıcı TTS, tr-TR). Önceden üretilmiş
// ses (voice_path) olmayan görevlerde AYNA'yı bir metin değil "varlık" gibi
// hissettirir. Destek yoksa hiç görünmez (sessiz düşüş).
export default function OkuButonu({ metin }: { metin: string }) {
  const [okuyor, setOkuyor] = useState(false);
  const [destek, setDestek] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDestek(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {}
    };
  }, []);

  function oku() {
    try {
      const s = window.speechSynthesis;
      if (!s) return;
      if (okuyor) {
        s.cancel();
        setOkuyor(false);
        return;
      }
      s.cancel();
      titret(10);
      const u = new SpeechSynthesisUtterance(metin);
      u.lang = "tr-TR";
      u.rate = 0.96;
      u.pitch = 0.95;
      const trSes = s.getVoices().find((v) => v.lang?.toLowerCase().startsWith("tr"));
      if (trSes) u.voice = trSes;
      u.onend = () => setOkuyor(false);
      u.onerror = () => setOkuyor(false);
      setOkuyor(true);
      s.speak(u);
    } catch {
      setOkuyor(false);
    }
  }

  if (!destek) return null;
  return (
    <button
      type="button"
      onClick={oku}
      aria-pressed={okuyor}
      className="mt-3 inline-flex items-center gap-2 rounded-full border border-royal-light/30 px-3 py-1.5 text-sm text-royal-light transition-colors hover:bg-white/5"
    >
      {okuyor ? `■ ${t.okumaDurdur}` : `🔊 ${t.oku}`}
    </button>
  );
}

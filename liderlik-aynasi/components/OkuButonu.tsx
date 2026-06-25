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
  // A9 — karaoke: okunan kelimeyi canlı altyazıda vurgula (dikkat + erişilebilirlik).
  const [vurguIdx, setVurguIdx] = useState(-1);
  const kelimeler = metin.split(/\s+/).filter(Boolean);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDestek(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      try {
        window.speechSynthesis?.cancel();
      } catch {}
    };
  }, []);

  function durdur() {
    setOkuyor(false);
    setVurguIdx(-1);
  }

  function oku() {
    try {
      const s = window.speechSynthesis;
      if (!s) return;
      if (okuyor) {
        s.cancel();
        durdur();
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
      // Kelime sınırında imleci ilerlet: charIndex'e denk gelen kelimeyi bul.
      u.onboundary = (e) => {
        if (e.name && e.name !== "word") return;
        let sayac = 0;
        for (let i = 0; i < kelimeler.length; i++) {
          sayac += kelimeler[i].length + 1;
          if (e.charIndex < sayac) {
            setVurguIdx(i);
            break;
          }
        }
      };
      u.onend = durdur;
      u.onerror = durdur;
      setOkuyor(true);
      setVurguIdx(0);
      s.speak(u);
    } catch {
      durdur();
    }
  }

  if (!destek) return null;
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={oku}
        aria-pressed={okuyor}
        className="inline-flex items-center gap-2 rounded-full border border-royal-light/30 px-3 py-1.5 text-sm text-royal-light transition-colors hover:bg-white/5"
      >
        {okuyor ? `■ ${t.okumaDurdur}` : `🔊 ${t.oku}`}
      </button>
      {/* Canlı altyazı — okunurken kelime kelime vurgular */}
      {okuyor && (
        <p className="mt-2 text-sm leading-relaxed text-slate-400" aria-live="polite">
          {kelimeler.map((k, i) => (
            <span
              key={i}
              className={
                i === vurguIdx ? "rounded bg-gold/25 px-0.5 font-semibold text-gold-light" : ""
              }
            >
              {k}{" "}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

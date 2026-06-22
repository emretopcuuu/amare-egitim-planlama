"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";

// AYNA SESİ — anahtar momente AYNA'nın marka sesini ekler.
// Mobil autoplay politikası gereği kullanıcı dokunuşuyla başlar.
// ElevenLabs yoksa (503) bileşen sessizce kaybolur.
export default function AynaSesi({ kod }: { kod: string }) {
  const [durum, setDurum] = useState<"bekle" | "yukleniyor" | "caliyor" | "bitti" | "gizle">(
    "bekle"
  );
  const sesRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => sesRef.current?.pause();
  }, []);

  async function dinle() {
    if (durum === "caliyor") {
      sesRef.current?.pause();
      if (sesRef.current) sesRef.current.currentTime = 0;
      setDurum("bekle");
      return;
    }
    setDurum("yukleniyor");
    try {
      // Ses yoksa (503 / 404) bileşeni gizle — sessiz degradasyon
      const res = await fetch(`/api/ayna-ses?k=${encodeURIComponent(kod)}`);
      if (!res.ok) {
        setDurum("gizle");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const ses = new Audio(url);
      sesRef.current = ses;
      ses.onended = () => {
        URL.revokeObjectURL(url);
        setDurum("bitti");
      };
      ses.onerror = () => {
        URL.revokeObjectURL(url);
        setDurum("gizle");
      };
      await ses.play();
      setDurum("caliyor");
    } catch {
      setDurum("gizle");
    }
  }

  if (durum === "gizle") return null;

  const t = tr.aynaSesMomentleri;

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-gold/30 bg-gold/[0.06] px-4 py-3">
      <button
        onClick={dinle}
        disabled={durum === "yukleniyor"}
        className="flex w-full items-center gap-3 text-left"
        aria-label={durum === "caliyor" ? t.durdur : t.dinle}
      >
        {/* Dalga göstergesi */}
        <div className="flex shrink-0 items-end gap-[3px] py-0.5">
          {[0, 0.15, 0.3, 0.15].map((delay, i) => (
            <span
              key={i}
              className={`ses-cubuk ${durum !== "caliyor" ? "opacity-40" : ""}`}
              style={{
                animationDelay: `${delay}s`,
                animationPlayState: durum === "caliyor" ? "running" : "paused",
              }}
            />
          ))}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-light">
            AYNA
          </p>
          <p className="truncate text-sm font-medium text-slate-200">
            {durum === "yukleniyor"
              ? "Yükleniyor…"
              : durum === "caliyor"
                ? t.durdur
                : durum === "bitti"
                  ? t.dinle
                  : t.dinle}
          </p>
        </div>

        <span
          className={`shrink-0 text-gold-light transition-opacity ${durum === "yukleniyor" ? "opacity-40" : ""}`}
        >
          {durum === "caliyor" ? "⏹" : "▶"}
        </span>
      </button>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";

// Tarayıcının yerleşik konuşma tanıması (Web Speech API) ile sesle yazım.
// iOS Safari 14.5+ ve Android Chrome destekler; desteklemeyen cihazda düğme
// hiç görünmez. Sunucu/maliyet yok — tanıma cihazın kendi motorunda.

type TanimaSonucu = { transcript: string };
type TanimaOlayi = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<TanimaSonucu> & { isFinal: boolean }>;
};
type HataOlayi = { error?: string };
type Tanima = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: TanimaOlayi) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: HataOlayi) => void) | null;
};

// Web Speech API hata kodunu adaya gösterilecek net mesaja çevir.
function hataMesaji(kod: string | undefined): string {
  switch (kod) {
    case "not-allowed":
    case "service-not-allowed":
      return tr.ses.hata.izin;
    case "audio-capture":
      return tr.ses.hata.mesgul; // mikrofon yok ya da Zoom gibi bir uygulama tutuyor
    case "no-speech":
      return tr.ses.hata.sessiz;
    case "network":
      return tr.ses.hata.ag;
    default:
      return tr.ses.hata.genel;
  }
}

function tanimaOlustur(): Tanima | null {
  if (typeof window === "undefined") return null;
  const Sinif =
    (window as unknown as { SpeechRecognition?: new () => Tanima })
      .SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => Tanima })
      .webkitSpeechRecognition;
  return Sinif ? new Sinif() : null;
}

export default function MikrofonButonu({
  onMetin,
  disabled,
}: {
  onMetin: (parca: string) => void;
  disabled?: boolean;
}) {
  const [destekli, setDestekli] = useState(false);
  const [dinliyor, setDinliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const tanimaRef = useRef<Tanima | null>(null);
  const onMetinRef = useRef(onMetin);
  useEffect(() => {
    onMetinRef.current = onMetin;
  }, [onMetin]);

  useEffect(() => {
    // Destek ancak istemcide bilinebilir; tek seferlik kontrol.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tanimaOlustur()) setDestekli(true);
    return () => {
      const t = tanimaRef.current;
      if (t) {
        t.onresult = null;
        t.onend = null;
        t.stop();
      }
    };
  }, []);

  if (!destekli) return null;

  function degistir() {
    if (dinliyor) {
      const t = tanimaRef.current;
      if (t) {
        t.onend = null;
        t.stop();
      }
      setDinliyor(false);
      return;
    }
    setHata(null);
    // Her başlatmada TAZE tanıyıcı: önceki oturumun final sonuçları yeniden
    // eklenmesin (tekrar yazma hatasının kökü aynı örneğin yeniden kullanımı).
    const tanima = tanimaOlustur();
    if (!tanima) return;
    tanima.lang = "tr-TR";
    tanima.continuous = true;
    tanima.interimResults = false;
    tanima.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const sonuc = e.results[i];
        if (sonuc.isFinal && sonuc[0]?.transcript) {
          onMetinRef.current(sonuc[0].transcript.trim());
        }
      }
    };
    tanima.onend = () => setDinliyor(false);
    // Sessizce kapanma yerine adaya NEDEN çalışmadığını söyle (izin yok,
    // mikrofon başka uygulamada/Zoom'da, ses algılanmadı, internet yok…).
    tanima.onerror = (e) => {
      setDinliyor(false);
      if (e?.error !== "aborted") setHata(hataMesaji(e?.error));
    };
    tanimaRef.current = tanima;
    setDinliyor(true);
    try {
      tanima.start();
    } catch {
      setDinliyor(false);
      setHata(tr.ses.hata.genel);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={degistir}
        disabled={disabled}
        aria-pressed={dinliyor}
        className={`flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors disabled:opacity-40 ${
          dinliyor
            ? "animate-pulse bg-red-500/80 text-white"
            : "border border-royal-light/40 text-slate-200 hover:bg-midnight-soft"
        }`}
      >
        {dinliyor ? `⏺ ${tr.ses.dinliyor}` : `🎙 ${tr.ses.baslat}`}
      </button>
      {hata && (
        <p role="status" className="max-w-xs text-xs leading-relaxed text-amber-300/90">
          {hata}
        </p>
      )}
    </div>
  );
}

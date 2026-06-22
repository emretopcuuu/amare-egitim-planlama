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
  ikon = false,
}: {
  onMetin: (parca: string) => void;
  disabled?: boolean;
  // Kompakt ikon modu: dar giriş satırlarında (Hedef/Pusula sohbeti gibi)
  // textarea + Gönder ile aynı hizada duran kare ikon düğme.
  ikon?: boolean;
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

  // Kompakt ikon modu: dar giriş satırında textarea + Gönder ile aynı hizada
  // kare ikon düğme. Hata, satırı bozmamak için düğmenin ÜSTÜNDE balon olarak.
  if (ikon) {
    return (
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={degistir}
          disabled={disabled}
          aria-pressed={dinliyor}
          aria-label={dinliyor ? tr.ses.dinliyor : tr.ses.baslat}
          title={dinliyor ? tr.ses.dinliyor : tr.ses.baslat}
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl transition-colors disabled:opacity-40 ${
            dinliyor
              ? "animate-pulse bg-red-500/80 text-white ring-2 ring-red-400/50"
              : "bg-midnight-soft text-slate-300 ring-1 ring-royal-light/40 hover:text-slate-100"
          }`}
        >
          {dinliyor ? "⏹" : "🎤"}
        </button>
        {hata && (
          <p
            role="status"
            className="absolute bottom-full right-0 mb-2 w-max max-w-[15rem] rounded-lg bg-midnight px-3 py-1.5 text-xs leading-relaxed text-amber-300/90 shadow-lg ring-1 ring-amber-400/20"
          >
            {hata}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={degistir}
        disabled={disabled}
        aria-pressed={dinliyor}
        aria-label={dinliyor ? tr.ses.dinliyor : tr.ses.baslat}
        title={dinliyor ? tr.ses.dinliyor : undefined}
        className={`flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-colors disabled:opacity-40 ${
          dinliyor
            ? "animate-pulse bg-red-500/80 text-white"
            : "border border-royal-light/40 text-slate-200 hover:bg-midnight-soft"
        }`}
      >
        {dinliyor ? `⏺ ${tr.ses.dinliyorKisa}` : `🎙 ${tr.ses.baslat}`}
      </button>
      {hata && (
        <p role="status" className="max-w-xs text-xs leading-relaxed text-amber-300/90">
          {hata}
        </p>
      )}
    </div>
  );
}

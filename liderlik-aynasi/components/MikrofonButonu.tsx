"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";

// Tarayıcının yerleşik konuşma tanıması (Web Speech API) ile sesle yazım.
// iOS Safari 14.5+ ve Android Chrome destekler; desteklemeyen cihazda düğme
// hiç görünmez. Sunucu/maliyet yok — tanıma cihazın kendi motorunda.
//
// "Çalışmıyor gibi hissettiriyor" düzeltmeleri (saha geri bildirimi):
// 1. interimResults AÇIK — konuşurken kelimeler canlı önizleme şeridinde
//    anında akar; cümle kesinleşince kutuya işlenir. Eskiden yalnız final
//    sonuç gösterildiği için kişi konuşurken ekranda HİÇBİR şey olmuyordu.
// 2. Otomatik yeniden başlatma — iOS kısa bir sessizlikte tanımayı kendiliğinden
//    kapatır; kişi durdurmadıysa tanıma sessizce yeniden başlar (90 sn tavan).
// 3. Başlar başlamaz "Dinliyorum" + dalga; 5 sn ses gelmezse nazik ipucu.

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

// Toplam dinleme tavanı — otomatik yeniden başlatma bu süreyi aşmaz.
const AZAMI_DINLEME_MS = 90_000;
// Bu süre boyunca hiç ses gelmezse "seni duyamıyorum" ipucu göster.
const SESSIZLIK_IPUCU_MS = 5_000;

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
  // Canlı önizleme: konuşma sürerken motorun ara tahmini (henüz kesinleşmedi).
  const [araMetin, setAraMetin] = useState("");
  // Sessizlik ipucu: dinliyoruz ama hiç ses/kelime gelmedi.
  const [sessizIpucu, setSessizIpucu] = useState(false);
  const tanimaRef = useRef<Tanima | null>(null);
  const onMetinRef = useRef(onMetin);
  // Kişi mi durdurdu (buton), motor mu kendiliğinden kapandı ayrımı —
  // kendiliğinden kapanışta sessizce yeniden başlarız.
  const istekliDurdurmaRef = useRef(false);
  const baslangicMsRef = useRef(0);
  const sesGeldiRef = useRef(false);
  const ipucuZamanlayiciRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    onMetinRef.current = onMetin;
  }, [onMetin]);

  useEffect(() => {
    // Destek ancak istemcide bilinebilir; tek seferlik kontrol.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tanimaOlustur()) setDestekli(true);
    return () => {
      istekliDurdurmaRef.current = true;
      if (ipucuZamanlayiciRef.current) clearTimeout(ipucuZamanlayiciRef.current);
      const t = tanimaRef.current;
      if (t) {
        t.onresult = null;
        t.onend = null;
        t.stop();
      }
    };
  }, []);

  if (!destekli) return null;

  function ipucuKur() {
    if (ipucuZamanlayiciRef.current) clearTimeout(ipucuZamanlayiciRef.current);
    ipucuZamanlayiciRef.current = setTimeout(() => {
      if (!sesGeldiRef.current) setSessizIpucu(true);
    }, SESSIZLIK_IPUCU_MS);
  }

  // Tek bir tanıma oturumu kur ve başlat. Otomatik yeniden başlatmalarda da
  // aynı yol kullanılır — her seferinde TAZE tanıyıcı (önceki oturumun final
  // sonuçları yeniden eklenmesin; tekrar yazma hatasının kökü buydu).
  function oturumBaslat(): boolean {
    const tanima = tanimaOlustur();
    if (!tanima) return false;
    tanima.lang = "tr-TR";
    tanima.continuous = true;
    tanima.interimResults = true;
    tanima.onresult = (e) => {
      sesGeldiRef.current = true;
      setSessizIpucu(false);
      let ara = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const sonuc = e.results[i];
        const parca = sonuc[0]?.transcript ?? "";
        if (sonuc.isFinal) {
          if (parca.trim()) onMetinRef.current(parca.trim());
        } else {
          ara += parca;
        }
      }
      setAraMetin(ara.trim());
    };
    tanima.onend = () => {
      // iOS sessizlikte kendiliğinden kapatır — kişi durdurmadıysa ve tavanı
      // aşmadıysak sessizce devam et; kişi hiç fark etmez.
      setAraMetin("");
      if (
        !istekliDurdurmaRef.current &&
        Date.now() - baslangicMsRef.current < AZAMI_DINLEME_MS
      ) {
        if (!oturumBaslat()) setDinliyor(false);
        return;
      }
      setDinliyor(false);
    };
    tanima.onerror = (e) => {
      // "no-speech" ölümcül değil — onend yeniden başlatır; ipucu zaten görünür.
      if (e?.error === "no-speech" || e?.error === "aborted") return;
      istekliDurdurmaRef.current = true;
      setDinliyor(false);
      setAraMetin("");
      setHata(hataMesaji(e?.error));
    };
    tanimaRef.current = tanima;
    try {
      tanima.start();
      return true;
    } catch {
      return false;
    }
  }

  function degistir() {
    if (dinliyor) {
      istekliDurdurmaRef.current = true;
      if (ipucuZamanlayiciRef.current) clearTimeout(ipucuZamanlayiciRef.current);
      const t = tanimaRef.current;
      if (t) {
        t.onend = null;
        t.stop();
      }
      setDinliyor(false);
      setAraMetin("");
      setSessizIpucu(false);
      return;
    }
    setHata(null);
    setSessizIpucu(false);
    istekliDurdurmaRef.current = false;
    sesGeldiRef.current = false;
    baslangicMsRef.current = Date.now();
    if (oturumBaslat()) {
      setDinliyor(true);
      ipucuKur();
    } else {
      setHata(tr.ses.hata.genel);
    }
  }

  // Canlı şerit: konuşurken ara metin; henüz ses yoksa "konuş" ipucu; uzun
  // sessizlikte "duyamıyorum". Kişi İLK andan itibaren canlılık görür.
  const canliSerit = dinliyor ? (
    <p
      role="status"
      aria-live="polite"
      className={`max-w-xs text-xs leading-relaxed ${
        araMetin ? "text-slate-200" : sessizIpucu ? "text-amber-300/90" : "text-slate-500"
      }`}
    >
      {araMetin || (sessizIpucu ? tr.ses.duyamiyorum : tr.ses.konusIpucu)}
    </p>
  ) : null;

  // Kompakt ikon modu: dar giriş satırında textarea + Gönder ile aynı hizada
  // kare ikon düğme. Canlı şerit ve hata, satırı bozmamak için düğmenin
  // ÜSTÜNDE balon olarak.
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
        {(dinliyor || hata) && (
          <div
            className="absolute bottom-full right-0 mb-2 w-max max-w-[16rem] rounded-lg bg-midnight px-3 py-1.5 shadow-lg ring-1 ring-royal-light/25"
          >
            {hata ? (
              <p role="status" className="text-xs leading-relaxed text-amber-300/90">
                {hata}
              </p>
            ) : (
              canliSerit
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={degistir}
          disabled={disabled}
          aria-pressed={dinliyor}
          aria-label={dinliyor ? tr.ses.dinliyor : tr.ses.baslat}
          title={dinliyor ? tr.ses.dinliyor : undefined}
          className={`bas-his flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-colors disabled:opacity-40 ${
            dinliyor
              ? "bg-red-500/80 text-white ring-2 ring-red-400/40"
              : "border border-royal-light/40 text-slate-200 hover:bg-midnight-soft"
          }`}
        >
          {dinliyor ? `⏺ ${tr.ses.dinliyorKisa}` : `🎙 ${tr.ses.baslat}`}
        </button>
        {/* UX #7: dinlerken canlı ses dalgası */}
        {dinliyor && (
          <div className="flex h-8 items-center gap-[3px]" aria-hidden>
            {[0, 0.12, 0.24, 0.36, 0.18, 0.06, 0.3, 0.2].map((g, i) => (
              <span key={i} className="ses-cubuk" style={{ animationDelay: `${g}s` }} />
            ))}
          </div>
        )}
      </div>
      {canliSerit}
      {hata && (
        <p role="status" className="max-w-xs text-xs leading-relaxed text-amber-300/90">
          {hata}
        </p>
      )}
    </div>
  );
}

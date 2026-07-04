"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";

// SESLE YAZ — çift motorlu:
//
// 1) BİRİNCİL (Faz 2, "scribe"): MediaRecorder ile cihazda kayıt →
//    /api/ses-yaz → ElevenLabs Scribe metni döner. Türkçe'de cihaz motorundan
//    belirgin isabetli ve WhatsApp-içi tarayıcı gibi Web Speech'in HİÇ olmadığı
//    ortamlarda da çalışır (yalnız mikrofon kaydı gerekir).
// 2) YEDEK (Faz 1, "tarayici"): tarayıcının yerleşik tanıması (Web Speech) —
//    canlı önizleme + otomatik yeniden başlatma. Scribe ucu düşerse (503/502)
//    sonraki denemeler bu motora döner; MediaRecorder yoksa baştan bu moddur.
//
// İki motor da yoksa düğme hiç görünmez.

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

// Kayıt/dinleme tavanları.
const AZAMI_KAYIT_SN = 120; // Scribe kaydı — maliyet ve istek boyutu sınırı
const AZAMI_DINLEME_MS = 90_000; // Web Speech oturam tavanı (yedek motor)
const SESSIZLIK_IPUCU_MS = 5_000;

function hataMesaji(kod: string | undefined): string {
  switch (kod) {
    case "not-allowed":
    case "service-not-allowed":
      return tr.ses.hata.izin;
    case "audio-capture":
      return tr.ses.hata.mesgul;
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

function kayitDestekliMi(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

function sureYazi(sn: number): string {
  const d = Math.floor(sn / 60);
  const s = sn % 60;
  return `${d}:${s.toString().padStart(2, "0")}`;
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
  const [motor, setMotor] = useState<"yok" | "scribe" | "tarayici">("yok");
  const [dinliyor, setDinliyor] = useState(false);
  const [cevriliyor, setCevriliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [araMetin, setAraMetin] = useState("");
  const [sessizIpucu, setSessizIpucu] = useState(false);
  const [kayitSn, setKayitSn] = useState(0);

  const onMetinRef = useRef(onMetin);
  useEffect(() => {
    onMetinRef.current = onMetin;
  }, [onMetin]);

  // — Scribe kayıt durumu —
  const kayitciRef = useRef<MediaRecorder | null>(null);
  const akisRef = useRef<MediaStream | null>(null);
  const parcalarRef = useRef<Blob[]>([]);
  const sayacRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Kayıt vazgeçilerek mi durdu (unmount) — çeviriye gönderme.
  const vazgecildiRef = useRef(false);

  // — Web Speech (yedek) durumu —
  const tanimaRef = useRef<Tanima | null>(null);
  const istekliDurdurmaRef = useRef(false);
  const baslangicMsRef = useRef(0);
  const sesGeldiRef = useRef(false);
  const ipucuZamanlayiciRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Motor seçimi ancak istemcide bilinebilir; tek seferlik.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (kayitDestekliMi()) setMotor("scribe");
    else if (tanimaOlustur()) setMotor("tarayici");
    return () => {
      vazgecildiRef.current = true;
      istekliDurdurmaRef.current = true;
      if (sayacRef.current) clearInterval(sayacRef.current);
      if (ipucuZamanlayiciRef.current) clearTimeout(ipucuZamanlayiciRef.current);
      kayitciRef.current?.stream.getTracks().forEach((iz) => iz.stop());
      akisRef.current?.getTracks().forEach((iz) => iz.stop());
      const t = tanimaRef.current;
      if (t) {
        t.onresult = null;
        t.onend = null;
        t.stop();
      }
    };
  }, []);

  if (motor === "yok") return null;

  // ————— SCRIBE (birincil) —————

  async function kayitBaslat() {
    setHata(null);
    vazgecildiRef.current = false;
    try {
      const ses = await navigator.mediaDevices.getUserMedia({ audio: true });
      akisRef.current = ses;
      const tip = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const kaydedici = tip ? new MediaRecorder(ses, { mimeType: tip }) : new MediaRecorder(ses);
      parcalarRef.current = [];
      kaydedici.ondataavailable = (e) => {
        if (e.data.size > 0) parcalarRef.current.push(e.data);
      };
      kaydedici.onstop = () => {
        ses.getTracks().forEach((iz) => iz.stop());
        akisRef.current = null;
        if (sayacRef.current) clearInterval(sayacRef.current);
        if (!vazgecildiRef.current) void cevir(kaydedici.mimeType);
      };
      kayitciRef.current = kaydedici;
      kaydedici.start(1000);
      setDinliyor(true);
      setKayitSn(0);
      sayacRef.current = setInterval(() => {
        setKayitSn((sn) => {
          if (sn + 1 >= AZAMI_KAYIT_SN) kayitDurdur(); // tavana gelince otomatik bitir
          return sn + 1;
        });
      }, 1000);
    } catch (e) {
      const ad = (e as { name?: string })?.name ?? "";
      setHata(ad === "NotAllowedError" || ad === "SecurityError" ? tr.ses.hata.izin : tr.ses.hata.mesgul);
    }
  }

  function kayitDurdur() {
    setDinliyor(false);
    const k = kayitciRef.current;
    if (k && k.state !== "inactive") k.stop(); // onstop → cevir()
  }

  async function cevir(mime: string) {
    setCevriliyor(true);
    setHata(null);
    try {
      const tip = mime.includes("mp4") ? "audio/mp4" : "audio/webm";
      const blob = new Blob(parcalarRef.current, { type: tip });
      parcalarRef.current = [];
      if (blob.size === 0) return;
      const form = new FormData();
      form.append("ses", blob, tip.includes("mp4") ? "kayit.mp4" : "kayit.webm");
      const res = await fetch("/api/ses-yaz", { method: "POST", body: form });
      const veri = await res.json().catch(() => null);
      if (res.ok && veri?.metin) {
        if (veri.metin.trim()) onMetinRef.current(veri.metin.trim());
        return;
      }
      // Scribe düştü (anahtar yok / servis hatası): sonraki denemeler için
      // tarayıcı motoruna geç (varsa) — bu kayıt kurtarılamaz, kişiye söyle.
      if (tanimaOlustur()) setMotor("tarayici");
      setHata(tr.ses.cevirihata);
    } catch {
      if (tanimaOlustur()) setMotor("tarayici");
      setHata(tr.ses.cevirihata);
    } finally {
      setCevriliyor(false);
    }
  }

  // ————— WEB SPEECH (yedek — Faz 1 davranışı) —————

  function ipucuKur() {
    if (ipucuZamanlayiciRef.current) clearTimeout(ipucuZamanlayiciRef.current);
    ipucuZamanlayiciRef.current = setTimeout(() => {
      if (!sesGeldiRef.current) setSessizIpucu(true);
    }, SESSIZLIK_IPUCU_MS);
  }

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

  function tanimaDegistir() {
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

  // ————— Ortak tetik + görünüm —————

  function degistir() {
    if (cevriliyor) return;
    if (motor === "scribe") {
      if (dinliyor) kayitDurdur();
      else void kayitBaslat();
    } else {
      tanimaDegistir();
    }
  }

  const mesgul = cevriliyor;
  const etiketKisa = cevriliyor
    ? tr.ses.cevriliyor
    : dinliyor
      ? motor === "scribe"
        ? `⏺ ${tr.ses.dinliyorKisa} ${sureYazi(kayitSn)}`
        : `⏺ ${tr.ses.dinliyorKisa}`
      : `🎙 ${tr.ses.baslat}`;

  // Canlı şerit: scribe modunda kayıt ipucu; tarayıcı modunda ara metin/ipucu.
  const canliSerit = dinliyor ? (
    <p
      role="status"
      aria-live="polite"
      className={`max-w-xs text-xs leading-relaxed ${
        motor === "tarayici" && araMetin
          ? "text-slate-200"
          : sessizIpucu
            ? "text-amber-300/90"
            : "text-slate-500"
      }`}
    >
      {motor === "scribe"
        ? tr.ses.kayitIpucu
        : araMetin || (sessizIpucu ? tr.ses.duyamiyorum : tr.ses.konusIpucu)}
    </p>
  ) : null;

  if (ikon) {
    return (
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={degistir}
          disabled={disabled || mesgul}
          aria-pressed={dinliyor}
          aria-label={dinliyor ? tr.ses.dinliyor : tr.ses.baslat}
          title={dinliyor ? tr.ses.dinliyor : tr.ses.baslat}
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl transition-colors disabled:opacity-40 ${
            dinliyor
              ? "animate-pulse bg-red-500/80 text-white ring-2 ring-red-400/50"
              : "bg-midnight-soft text-slate-300 ring-1 ring-royal-light/40 hover:text-slate-100"
          }`}
        >
          {cevriliyor ? "✍️" : dinliyor ? "⏹" : "🎤"}
        </button>
        {(dinliyor || cevriliyor || hata) && (
          <div className="absolute bottom-full right-0 mb-2 w-max max-w-[16rem] rounded-lg bg-midnight px-3 py-1.5 shadow-lg ring-1 ring-royal-light/25">
            {hata ? (
              <p role="status" className="text-xs leading-relaxed text-amber-300/90">
                {hata}
              </p>
            ) : cevriliyor ? (
              <p role="status" className="text-xs leading-relaxed text-slate-300">
                {tr.ses.cevriliyor}
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
          disabled={disabled || mesgul}
          aria-pressed={dinliyor}
          aria-label={dinliyor ? tr.ses.dinliyor : tr.ses.baslat}
          title={dinliyor ? tr.ses.dinliyor : undefined}
          className={`bas-his flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-colors disabled:opacity-40 ${
            dinliyor
              ? "bg-red-500/80 text-white ring-2 ring-red-400/40"
              : "border border-royal-light/40 text-slate-200 hover:bg-midnight-soft"
          }`}
        >
          {etiketKisa}
        </button>
        {/* Dinlerken canlı ses dalgası */}
        {dinliyor && (
          <div className="flex h-8 items-center gap-[3px]" aria-hidden>
            {[0, 0.12, 0.24, 0.36, 0.18, 0.06, 0.3, 0.2].map((g, i) => (
              <span key={i} className="ses-cubuk" style={{ animationDelay: `${g}s` }} />
            ))}
          </div>
        )}
      </div>
      {canliSerit}
      {cevriliyor && !dinliyor && (
        <p role="status" className="text-xs text-slate-400">
          {tr.ses.cevriliyor}
        </p>
      )}
      {hata && (
        <p role="status" className="max-w-xs text-xs leading-relaxed text-amber-300/90">
          {hata}
        </p>
      )}
    </div>
  );
}

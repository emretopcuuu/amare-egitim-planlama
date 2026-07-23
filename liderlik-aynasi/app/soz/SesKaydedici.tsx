"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.kapanisSoz;

// Söz kaydedici: kaydet → durdur → dinle/tekrar. Blob'u üst bileşene onKayit ile
// verir. Süre sınırı 5 DK (söz 90-140 kelime; sesli okuması ~1-2 dk — eski 30sn
// sınırı sözü ortasında kesiyordu). Kayıt sırasında büyük "KAYITTA" + dakika:sn
// sayaç + CANLI ses seviye çubuğu (gerçekten ses aldığını görür). Mikrofon yoksa
// sessizce devre dışı.
const AZAMI_SN = 300; // 5 dk
const UYARI_SN = 270; // son 30 sn: "toparla" uyarısı

function mmss(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function SesKaydedici({
  onKayit,
}: {
  onKayit: (blob: Blob | null) => void;
}) {
  const [durum, setDurum] = useState<"bos" | "kayit" | "hazir">("bos");
  const [saniye, setSaniye] = useState(0);
  const [seviye, setSeviye] = useState(0); // 0..1 canlı ses seviyesi
  const [sessizUzun, setSessizUzun] = useState(false);
  const [caliyor, setCaliyor] = useState(false);
  const [onizleme, setOnizleme] = useState<string | null>(null);
  const [hata, setHata] = useState(false);

  const kayitci = useRef<MediaRecorder | null>(null);
  const parcalar = useRef<Blob[]>([]);
  const akis = useRef<MediaStream | null>(null);
  const ses = useRef<HTMLAudioElement | null>(null);
  const zamanlayici = useRef<ReturnType<typeof setInterval> | null>(null);
  const baslangicMs = useRef<number>(0);
  const durdurulabilirMs = useRef<number>(0); // kazara çift-dokunuşa karşı
  // Ses seviyesi (VU) için Web Audio.
  const audioCtx = useRef<AudioContext | null>(null);
  const analiz = useRef<AnalyserNode | null>(null);
  const raf = useRef<number | null>(null);
  const sessizBaslangic = useRef<number | null>(null); // sessizliğin başladığı an

  function temizle() {
    if (zamanlayici.current) clearInterval(zamanlayici.current);
    if (raf.current) cancelAnimationFrame(raf.current);
    zamanlayici.current = null;
    raf.current = null;
    akis.current?.getTracks().forEach((iz) => iz.stop());
    audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
    analiz.current = null;
  }

  useEffect(() => {
    return () => {
      if (kayitci.current?.state === "recording") kayitci.current.stop();
      ses.current?.pause();
      temizle();
    };
  }, []);

  // Canlı ses seviyesi döngüsü — gerçekten ses aldığını gösterir + uzun sessizlik uyarısı.
  function seviyeDongusu() {
    const a = analiz.current;
    if (!a) return;
    const veri = new Uint8Array(a.fftSize);
    a.getByteTimeDomainData(veri);
    let toplam = 0;
    for (let i = 0; i < veri.length; i++) {
      const v = (veri[i] - 128) / 128;
      toplam += v * v;
    }
    const rms = Math.sqrt(toplam / veri.length); // 0..~1
    const norm = Math.min(1, rms * 3.5); // görsel için yükselt
    setSeviye(norm);
    // Uzun sessizlik: ~4 sn kesintisiz eşik altı → uyarı (mikrofon ses almıyor
    // olabilir). Gerçek zaman damgasıyla ölçülür — cümle araları tetiklemez.
    const simdi = Date.now();
    if (norm < 0.06) {
      if (sessizBaslangic.current == null) sessizBaslangic.current = simdi;
      else if (simdi - sessizBaslangic.current > 4000) setSessizUzun(true);
    } else {
      sessizBaslangic.current = null;
      setSessizUzun(false);
    }
    raf.current = requestAnimationFrame(seviyeDongusu);
  }

  async function basla() {
    setHata(false);
    if (typeof MediaRecorder === "undefined") {
      setHata(true);
      return;
    }
    try {
      const m = await navigator.mediaDevices.getUserMedia({ audio: true });
      akis.current = m;
      const tip = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const k = tip ? new MediaRecorder(m, { mimeType: tip }) : new MediaRecorder(m);
      parcalar.current = [];
      k.ondataavailable = (e) => {
        if (e.data.size > 0) parcalar.current.push(e.data);
      };
      k.onstop = () => {
        const t2 = k.mimeType.includes("mp4") ? "audio/mp4" : "audio/webm";
        const blob = new Blob(parcalar.current, { type: t2 });
        temizle();
        setOnizleme((eski) => {
          if (eski) URL.revokeObjectURL(eski);
          return URL.createObjectURL(blob);
        });
        onKayit(blob);
        setSeviye(0);
        setSessizUzun(false);
        setDurum("hazir");
      };
      kayitci.current = k;
      // Timeslice (1sn): parçalar periyodik toplanır — uzun kayıt/kesinti daha sağlam.
      k.start(1000);
      baslangicMs.current = Date.now();
      durdurulabilirMs.current = Date.now() + 600; // ilk 0.6sn kazara durdurmayı yut
      setSaniye(0);
      setSessizUzun(false);
      sessizBaslangic.current = null;
      setDurum("kayit");

      // Ses seviyesi analizörü.
      try {
        const AC =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AC) {
          const ctx = new AC();
          audioCtx.current = ctx;
          const kaynak = ctx.createMediaStreamSource(m);
          const an = ctx.createAnalyser();
          an.fftSize = 512;
          kaynak.connect(an);
          analiz.current = an;
          raf.current = requestAnimationFrame(seviyeDongusu);
        }
      } catch {
        // seviye çubuğu olmadan da kayıt çalışır
      }

      // Saniye sayacı — gerçek zaman damgasından okunur (setState updater içinde
      // yan etki YOK; eski kod durdur()'u updater'da çağırıyordu → kararsızdı).
      zamanlayici.current = setInterval(() => {
        const gecen = Math.floor((Date.now() - baslangicMs.current) / 1000);
        setSaniye(gecen);
        if (gecen >= AZAMI_SN) durdur();
      }, 250);
    } catch {
      setHata(true);
    }
  }

  function durdur() {
    // Kazara çift-dokunuş: kayıt henüz yeni başladıysa yut (kullanıcı "başlat"
    // sandığı düğmeye ikinci kez basmış olabilir).
    if (Date.now() < durdurulabilirMs.current) return;
    if (zamanlayici.current) clearInterval(zamanlayici.current);
    zamanlayici.current = null;
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    if (kayitci.current?.state === "recording") kayitci.current.stop();
  }

  function dinle() {
    if (!onizleme) return;
    if (caliyor) {
      ses.current?.pause();
      setCaliyor(false);
      return;
    }
    const a = new Audio(onizleme);
    ses.current = a;
    a.onended = () => setCaliyor(false);
    void a.play().then(() => setCaliyor(true)).catch(() => setCaliyor(false));
  }

  function tekrar() {
    ses.current?.pause();
    setCaliyor(false);
    setOnizleme((eski) => {
      if (eski) URL.revokeObjectURL(eski);
      return null;
    });
    onKayit(null);
    setDurum("bos");
  }

  if (hata) {
    return <p className="text-sm text-amber-300">{t.mikrofonYok}</p>;
  }

  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-4">
      {durum === "bos" && (
        <>
          <button
            type="button"
            onClick={basla}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-white/20 text-base font-semibold text-slate-100 hover:bg-white/[0.06]"
          >
            🎤 {t.sesKaydet}
          </button>
          <p className="mt-2 text-center text-xs leading-relaxed text-slate-400">{t.sesIpucu}</p>
        </>
      )}

      {durum === "kayit" && (
        <div className="space-y-3">
          {/* Büyük, yanılmaz KAYITTA göstergesi + dakika:saniye */}
          <div className="flex items-center justify-center gap-2.5">
            <span className="relative flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/70" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-red-500" />
            </span>
            <span className="text-sm font-bold uppercase tracking-widest text-red-300">
              {t.sesKayitAktif}
            </span>
            <span className="font-mono text-lg font-bold tabular-nums text-slate-100">
              {mmss(saniye)}
            </span>
          </div>

          {/* Canlı ses seviye çubuğu — "gerçekten kaydediyor mu?" sorusunu bitirir */}
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-gold transition-[width] duration-100"
              style={{ width: `${Math.round(seviye * 100)}%` }}
            />
          </div>
          <p className="text-center text-xs text-slate-400">
            {sessizUzun ? (
              <span className="text-amber-300">{t.sesSessiz}</span>
            ) : saniye >= UYARI_SN ? (
              <span className="text-amber-300">{t.sesNeredeyseDoldu}</span>
            ) : (
              t.sesDinliyor
            )}
          </p>

          <button
            type="button"
            onClick={durdur}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-red-600 text-base font-bold text-white hover:bg-red-500"
          >
            {t.sesDurdurKaydet}
          </button>
        </div>
      )}

      {durum === "hazir" && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={dinle}
            className="h-12 flex-1 rounded-xl border-2 border-white/20 text-sm font-semibold text-slate-100 hover:bg-white/[0.06]"
          >
            {caliyor ? t.sesDurdur : t.sesDinle}
          </button>
          <button
            type="button"
            onClick={tekrar}
            className="h-12 flex-1 rounded-xl border-2 border-white/20 text-sm font-medium text-slate-200 hover:bg-white/[0.06]"
          >
            {t.sesTekrar}
          </button>
        </div>
      )}
    </div>
  );
}

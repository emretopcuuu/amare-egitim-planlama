"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.kapanisSoz;

// Kompakt ses kaydedici: kaydet → durdur → dinle/tekrar. Blob'u üst bileşene
// onKayit ile verir. ~30 sn üst sınır. Mikrofon yoksa sessizce devre dışı.
export default function SesKaydedici({
  onKayit,
}: {
  onKayit: (blob: Blob | null) => void;
}) {
  const [durum, setDurum] = useState<"bos" | "kayit" | "hazir">("bos");
  const [saniye, setSaniye] = useState(0);
  const [caliyor, setCaliyor] = useState(false);
  const [onizleme, setOnizleme] = useState<string | null>(null);
  const [hata, setHata] = useState(false);

  const kayitci = useRef<MediaRecorder | null>(null);
  const parcalar = useRef<Blob[]>([]);
  const akis = useRef<MediaStream | null>(null);
  const ses = useRef<HTMLAudioElement | null>(null);
  const zamanlayici = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (zamanlayici.current) clearInterval(zamanlayici.current);
      if (kayitci.current?.state === "recording") kayitci.current.stop();
      akis.current?.getTracks().forEach((iz) => iz.stop());
      ses.current?.pause();
    };
  }, []);

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
        akis.current?.getTracks().forEach((iz) => iz.stop());
        const t2 = k.mimeType.includes("mp4") ? "audio/mp4" : "audio/webm";
        const blob = new Blob(parcalar.current, { type: t2 });
        setOnizleme((eski) => {
          if (eski) URL.revokeObjectURL(eski);
          return URL.createObjectURL(blob);
        });
        onKayit(blob);
        setDurum("hazir");
      };
      kayitci.current = k;
      k.start();
      setSaniye(0);
      setDurum("kayit");
      zamanlayici.current = setInterval(() => {
        setSaniye((s) => {
          if (s >= 29) durdur();
          return s + 1;
        });
      }, 1000);
    } catch {
      setHata(true);
    }
  }

  function durdur() {
    if (zamanlayici.current) clearInterval(zamanlayici.current);
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
        <button
          type="button"
          onClick={basla}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-white/20 text-base font-semibold text-slate-100 hover:bg-white/[0.06]"
        >
          🎤 {t.sesKaydet}
        </button>
      )}
      {durum === "kayit" && (
        <button
          type="button"
          onClick={durdur}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-red-600 text-base font-bold text-white"
        >
          <span className="h-3 w-3 animate-pulse rounded-full bg-white" /> {t.sesDurdur} ({saniye}sn)
        </button>
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

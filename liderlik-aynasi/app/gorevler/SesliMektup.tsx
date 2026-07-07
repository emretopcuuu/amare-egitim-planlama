"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";
import { MEKTUP_KIVILCIMI } from "@/lib/kivilcim";
import { sesCal } from "@/lib/sesEfekti";

const t = tr.gorevler.mektupKart;

// Özellik 4 — SESLİ MEKTUP yanıt kartı: "90 gün sonraki sana" görevinin özel
// yanıt bileşeni. Yazı formu yerine mikrofonla EN FAZLA 60 sn kayıt →
// dinle/yeniden kaydet → POST /api/sesli-mektup (multipart). AynaRituel'in
// MediaRecorder deseninin hafifletilmiş uyarlaması (kalite ölçümü/klon yok).

const AZAMI_SN = 60;

type Asama = "hazir" | "kayit" | "inceleme" | "gonderiliyor" | "tamam" | "hata";

export default function SesliMektup({ gorevId }: { gorevId: string }) {
  const router = useRouter();
  const [asama, setAsama] = useState<Asama>("hazir");
  const [sure, setSure] = useState(0);
  const [hataMesaji, setHataMesaji] = useState<string | null>(null);
  const [yorum, setYorum] = useState<string | null>(null);
  const [onizlemeUrl, setOnizlemeUrl] = useState<string | null>(null);
  const [caliyor, setCaliyor] = useState(false);

  const kayitci = useRef<MediaRecorder | null>(null);
  const akis = useRef<MediaStream | null>(null);
  const parcalar = useRef<Blob[]>([]);
  const kayitVerisi = useRef<{ blob: Blob; tip: string; sn: number } | null>(null);
  const onizlemeSes = useRef<HTMLAudioElement | null>(null);
  const sayac = useRef<ReturnType<typeof setInterval> | null>(null);
  const baslangic = useRef(0);
  const bitiriliyor = useRef(false);

  // Mektup kartı ilk göründüğünde zarf açılış sesi (mount'ta bir kez).
  useEffect(() => {
    sesCal("sesli-mektup");
  }, []);

  // unmount temizliği: mikrofon + sayaç serbest bırakılır
  useEffect(() => {
    return () => {
      if (sayac.current) clearInterval(sayac.current);
      onizlemeSes.current?.pause();
      if (kayitci.current?.state === "recording") kayitci.current.stop();
      akis.current?.getTracks().forEach((iz) => iz.stop());
    };
  }, []);

  async function kayitBasla() {
    setHataMesaji(null);
    if (typeof MediaRecorder === "undefined") {
      setHataMesaji(t.mikrofonYok);
      setAsama("hata");
      return;
    }
    try {
      const ses = await navigator.mediaDevices.getUserMedia({ audio: true });
      akis.current = ses;
      const tip = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const kaydedici = tip ? new MediaRecorder(ses, { mimeType: tip }) : new MediaRecorder(ses);
      parcalar.current = [];
      kaydedici.ondataavailable = (e) => {
        if (e.data.size > 0) parcalar.current.push(e.data);
      };
      kayitci.current = kaydedici;
      baslangic.current = Date.now();
      bitiriliyor.current = false;
      kaydedici.start(1000);
      titret([20, 60, 20]);
      setSure(0);
      setAsama("kayit");
      // 60 sn tavanı: sayaç dolunca kayıt kendiliğinden biter.
      sayac.current = setInterval(() => {
        const sn = Math.floor((Date.now() - baslangic.current) / 1000);
        setSure(sn);
        if (sn >= AZAMI_SN) kayitBitir();
      }, 250);
    } catch {
      setHataMesaji(t.mikrofonYok);
      setAsama("hata");
    }
  }

  function kayitBitir() {
    if (bitiriliyor.current) return;
    bitiriliyor.current = true;
    if (sayac.current) clearInterval(sayac.current);
    const kaydedici = kayitci.current;
    if (!kaydedici) {
      setAsama("hata");
      return;
    }
    kaydedici.onstop = () => {
      akis.current?.getTracks().forEach((iz) => iz.stop());
      const tip = kaydedici.mimeType.includes("mp4") ? "audio/mp4" : "audio/webm";
      const blob = new Blob(parcalar.current, { type: tip });
      const sn = Math.min(AZAMI_SN, Math.max(1, Math.round((Date.now() - baslangic.current) / 1000)));
      kayitVerisi.current = { blob, tip, sn };
      setOnizlemeUrl((eski) => {
        if (eski) URL.revokeObjectURL(eski);
        return URL.createObjectURL(blob);
      });
      setCaliyor(false);
      setAsama("inceleme");
    };
    if (kaydedici.state !== "inactive") kaydedici.stop();
  }

  function dinle() {
    if (!onizlemeUrl) return;
    if (caliyor) {
      onizlemeSes.current?.pause();
      if (onizlemeSes.current) onizlemeSes.current.currentTime = 0;
      setCaliyor(false);
      return;
    }
    const ses = new Audio(onizlemeUrl);
    onizlemeSes.current = ses;
    ses.onended = () => setCaliyor(false);
    void ses
      .play()
      .then(() => setCaliyor(true))
      .catch(() => setCaliyor(false));
  }

  function tekrarKaydet() {
    onizlemeSes.current?.pause();
    setCaliyor(false);
    setOnizlemeUrl((eski) => {
      if (eski) URL.revokeObjectURL(eski);
      return null;
    });
    kayitVerisi.current = null;
    void kayitBasla();
  }

  async function gonder() {
    const v = kayitVerisi.current;
    if (!v) {
      setAsama("hata");
      return;
    }
    onizlemeSes.current?.pause();
    setCaliyor(false);
    setAsama("gonderiliyor");
    try {
      const form = new FormData();
      form.append("gorevId", gorevId);
      form.append("sure", String(v.sn));
      form.append(
        "ses",
        new File([v.blob], v.tip.includes("mp4") ? "mektup.mp4" : "mektup.webm", { type: v.tip })
      );
      const res = await fetch("/api/sesli-mektup", { method: "POST", body: form });
      if (!res.ok) throw new Error();
      const veri = (await res.json()) as { yorum?: string };
      setYorum(veri.yorum ?? null);
      titret([30, 80, 30]);
      setAsama("tamam");
      router.refresh();
    } catch {
      // Kayıt elde — kişi tekrar gönderebilir.
      setHataMesaji(t.hata);
      setAsama("inceleme");
    }
  }

  const birincil =
    "flex h-12 w-full items-center justify-center rounded-xl bg-gold/90 px-4 text-base font-bold text-midnight transition-colors hover:bg-gold";
  const ikincil =
    "flex h-12 w-full items-center justify-center rounded-xl border border-white/25 px-4 text-base font-semibold text-slate-100 transition-colors hover:bg-white/[0.08]";

  if (asama === "tamam") {
    return (
      <div className="mt-4 rounded-2xl border border-gold/40 bg-gold/[0.08] p-4 text-center">
        <p className="text-2xl" aria-hidden>📩</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-100">
          {yorum ?? tr.gorevler.mektupTesekkur}
        </p>
        <p className="mt-2 text-xs font-semibold text-gold-light">+{MEKTUP_KIVILCIMI} ⚡</p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-white/15 bg-midnight/40 p-4">
      {asama === "hazir" && (
        <>
          <button type="button" onClick={kayitBasla} className={birincil}>
            {t.baslat}
          </button>
          <p className="mt-2 text-center text-xs text-slate-500">{t.ipucu}</p>
        </>
      )}

      {asama === "kayit" && (
        <>
          <div className="flex items-center justify-between rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-bold text-red-300">
              <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
              {t.kaydediliyor}
            </span>
            <span className="text-sm font-bold tabular-nums text-red-200">
              {sure}s / {AZAMI_SN}s
            </span>
          </div>
          <button type="button" onClick={kayitBitir} className={`${birincil} mt-3`}>
            {t.durdur}
          </button>
        </>
      )}

      {asama === "inceleme" && (
        <>
          {hataMesaji && (
            <p className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-200">
              {hataMesaji}
            </p>
          )}
          <button type="button" onClick={dinle} className={ikincil}>
            {caliyor ? t.dinleDurdur : t.dinle}
          </button>
          <button type="button" onClick={gonder} className={`${birincil} mt-3`}>
            {t.gonder}
          </button>
          <button type="button" onClick={tekrarKaydet} className={`${ikincil} mt-3`}>
            {t.tekrar}
          </button>
        </>
      )}

      {asama === "gonderiliyor" && (
        <p className="py-3 text-center text-sm font-semibold text-slate-300">{t.gonderiliyor}</p>
      )}

      {asama === "hata" && (
        <>
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-200">
            {hataMesaji ?? t.hata}
          </p>
          <button type="button" onClick={kayitBasla} className={`${birincil} mt-3`}>
            {t.baslat}
          </button>
        </>
      )}
    </div>
  );
}

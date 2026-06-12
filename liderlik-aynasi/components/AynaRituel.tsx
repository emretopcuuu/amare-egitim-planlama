"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.rituel;

// SES RİTÜELİ — YANSIMAN'ın doğum anı.
// Katılımcı ayna yeminini okur (klon malzemesi), tek cümlelik beklentisini
// söyler (Web Speech ile yazıya döner), kayıt aynaya verilir ve ~20 saniye
// sonra telefondan KENDİ SESİ konuşur. Onay vermeyen "sessiz ayna" seçer.

type Asama =
  | "giris"
  | "kayit"
  | "soru"
  | "gonderiliyor"
  | "hazir"
  | "sonra"
  | "hata"
  | "kapandi";

type Taniyici = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((e: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function taniyiciKur(): Taniyici | null {
  const w = window as unknown as {
    webkitSpeechRecognition?: new () => Taniyici;
    SpeechRecognition?: new () => Taniyici;
  };
  const Sinif = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Sinif ? new Sinif() : null;
}

export default function AynaRituel() {
  const [asama, setAsama] = useState<Asama>("giris");
  const [onayli, setOnayli] = useState(false);
  const [sayac, setSayac] = useState(0);
  const [beklenti, setBeklenti] = useState("");
  const [sesUrl, setSesUrl] = useState<string | null>(null);
  const [calindi, setCalindi] = useState(false);
  const [hataMesaji, setHataMesaji] = useState<string | null>(null);

  const kayitci = useRef<MediaRecorder | null>(null);
  const parcalar = useRef<Blob[]>([]);
  const akis = useRef<MediaStream | null>(null);
  const taniyici = useRef<Taniyici | null>(null);
  const zamanlayici = useRef<ReturnType<typeof setInterval> | null>(null);
  const kalan = useRef(0);
  const bitiriliyor = useRef(false);

  useEffect(() => {
    // unmount temizliği: mikrofonu ve sayaçları serbest bırak
    return () => {
      if (zamanlayici.current) clearInterval(zamanlayici.current);
      taniyici.current?.stop();
      if (kayitci.current?.state === "recording") kayitci.current.stop();
      akis.current?.getTracks().forEach((iz) => iz.stop());
    };
  }, []);

  function geriSayim(saniye: number, bitince: () => void) {
    if (zamanlayici.current) clearInterval(zamanlayici.current);
    kalan.current = saniye;
    setSayac(saniye);
    const id = setInterval(() => {
      kalan.current -= 1;
      setSayac(Math.max(0, kalan.current));
      if (kalan.current <= 0) {
        clearInterval(id);
        bitince();
      }
    }, 1000);
    zamanlayici.current = id;
  }

  async function basla() {
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
      kaydedici.start(1000);
      bitiriliyor.current = false;
      setAsama("kayit");
      geriSayim(40, soruyaGec);
    } catch {
      setHataMesaji(t.mikrofonYok);
      setAsama("hata");
    }
  }

  function soruyaGec() {
    setAsama("soru");
    geriSayim(20, bitir);
    // beklenti cümlesi konuşulurken yazıya dökülür (destekleyen tarayıcıda)
    const tan = taniyiciKur();
    if (tan) {
      tan.lang = "tr-TR";
      tan.continuous = true;
      tan.interimResults = true;
      tan.onresult = (e) => {
        let metin = "";
        for (let i = 0; i < e.results.length; i++) {
          metin += e.results[i][0]?.transcript ?? "";
        }
        setBeklenti(metin.trim().slice(0, 300));
      };
      tan.onerror = () => {};
      try {
        tan.start();
        taniyici.current = tan;
      } catch {
        taniyici.current = null;
      }
    }
  }

  function bitir() {
    if (bitiriliyor.current) return;
    bitiriliyor.current = true;
    if (zamanlayici.current) clearInterval(zamanlayici.current);
    taniyici.current?.stop();

    const kaydedici = kayitci.current;
    if (!kaydedici) {
      setAsama("hata");
      return;
    }
    setAsama("gonderiliyor");
    kaydedici.onstop = () => {
      akis.current?.getTracks().forEach((iz) => iz.stop());
      const tip = kaydedici.mimeType.includes("mp4") ? "audio/mp4" : "audio/webm";
      const blob = new Blob(parcalar.current, { type: tip });
      void gonder(blob, tip);
    };
    if (kaydedici.state !== "inactive") kaydedici.stop();
  }

  async function gonder(blob: Blob, tip: string) {
    try {
      const form = new FormData();
      form.append("onay", "1");
      form.append("beklenti", beklenti);
      form.append(
        "ses",
        new File([blob], tip.includes("mp4") ? "ornek.mp4" : "ornek.webm", { type: tip })
      );
      const res = await fetch("/api/ses-rituel", { method: "POST", body: form });
      if (!res.ok) throw new Error();
      const veri = (await res.json()) as { durum: string; url?: string | null };
      if (veri.durum === "hazir" && veri.url) {
        setSesUrl(veri.url);
        setAsama("hazir");
      } else {
        setAsama("sonra");
      }
    } catch {
      setHataMesaji(t.hata);
      setAsama("hata");
    }
  }

  async function sessizSec() {
    try {
      const form = new FormData();
      form.append("onay", "0");
      await fetch("/api/ses-rituel", { method: "POST", body: form });
    } catch {
      // tercih sonraki girişte tekrar sorulur; akışı kesme
    }
    setAsama("kapandi");
  }

  function dinle() {
    if (!sesUrl) return;
    const ses = new Audio(sesUrl);
    ses.onended = () => setCalindi(true);
    void ses.play().catch(() => setCalindi(true));
  }

  if (asama === "kapandi") return null;

  return (
    <div className="kart-cam relative overflow-hidden rounded-3xl p-6">
      <span className="altin-tel" />

      {asama === "giris" && (
        <>
          <p className="prizma-serif text-xs uppercase tracking-[0.45em] text-slate-400">
            Ses Ritüeli
          </p>
          <h2 className="prizma-serif ay-metin mt-2 text-2xl font-semibold">
            🌊 {t.baslik}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{t.aciklama}</p>
          <label className="mt-4 flex items-start gap-3 text-xs leading-relaxed text-slate-400">
            <input
              type="checkbox"
              checked={onayli}
              onChange={(e) => setOnayli(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
            />
            {t.onay}
          </label>
          <button
            onClick={basla}
            disabled={!onayli}
            className="btn-kor parilti mt-5 flex h-12 w-full items-center justify-center rounded-xl font-bold disabled:opacity-40"
          >
            {t.basla}
          </button>
          <button
            onClick={sessizSec}
            className="mt-3 w-full text-center text-xs text-slate-500 underline-offset-4 hover:underline"
          >
            {t.sessiz}
          </button>
        </>
      )}

      {asama === "kayit" && (
        <>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold text-red-300">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-400" />
              REC
            </span>
            <span className="font-mono text-sm text-slate-400">{sayac}s</span>
          </div>
          <p className="mt-3 text-xs uppercase tracking-widest text-slate-400">
            {t.yeminYonerge}
          </p>
          <p className="prizma-serif mt-3 text-base leading-relaxed text-slate-100">
            “{t.yemin}”
          </p>
          <button
            onClick={soruyaGec}
            className="mt-5 flex h-11 w-full items-center justify-center rounded-xl border border-white/15 text-sm font-semibold text-slate-200 hover:bg-white/[0.06]"
          >
            {t.devam} →
          </button>
        </>
      )}

      {asama === "soru" && (
        <>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold text-red-300">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-400" />
              REC
            </span>
            <span className="font-mono text-sm text-slate-400">{sayac}s</span>
          </div>
          <h3 className="prizma-serif ay-metin mt-3 text-xl font-semibold">{t.soru}</h3>
          <p className="mt-1 text-xs text-slate-500">{t.soruNot}</p>
          <textarea
            value={beklenti}
            onChange={(e) => setBeklenti(e.target.value.slice(0, 300))}
            rows={2}
            className="mt-3 w-full rounded-xl border border-white/15 bg-white/[0.06] p-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-sky-200/70 focus:outline-none"
            placeholder="…"
          />
          <button
            onClick={bitir}
            className="btn-kor mt-4 flex h-12 w-full items-center justify-center rounded-xl font-bold"
          >
            {t.bitir}
          </button>
        </>
      )}

      {asama === "gonderiliyor" && (
        <div className="py-8 text-center">
          <div className="ayna-halka mx-auto h-14 w-14" />
          <p className="prizma-serif ay-metin mt-5 text-xl font-semibold">{t.uyaniyor}</p>
        </div>
      )}

      {asama === "hazir" && (
        <div className="py-4 text-center">
          {!calindi ? (
            <>
              <p className="prizma-serif text-xs uppercase tracking-[0.45em] text-slate-400">
                Yansıman hazır
              </p>
              <button
                onClick={dinle}
                className="btn-kor parilti mx-auto mt-5 flex h-14 w-full items-center justify-center rounded-xl text-lg font-bold"
              >
                {t.dinle}
              </button>
            </>
          ) : (
            <>
              <p className="prizma-serif ay-metin text-xl font-semibold">{t.seninle}</p>
              <button
                onClick={() => setAsama("kapandi")}
                className="mt-4 text-xs text-slate-500 underline-offset-4 hover:underline"
              >
                {t.kapat}
              </button>
            </>
          )}
        </div>
      )}

      {asama === "sonra" && (
        <div className="py-4 text-center">
          <p className="text-sm leading-relaxed text-slate-300">{t.sonra}</p>
          <button
            onClick={() => setAsama("kapandi")}
            className="mt-4 text-xs text-slate-500 underline-offset-4 hover:underline"
          >
            {t.kapat}
          </button>
        </div>
      )}

      {asama === "hata" && (
        <div className="py-4 text-center">
          <p className="text-sm text-red-300">{hataMesaji ?? t.hata}</p>
          <button
            onClick={basla}
            className="btn-kor mx-auto mt-4 flex h-11 w-full items-center justify-center rounded-xl font-bold"
          >
            {t.tekrar}
          </button>
          <button
            onClick={sessizSec}
            className="mt-3 w-full text-center text-xs text-slate-500 underline-offset-4 hover:underline"
          >
            {t.sessiz}
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";

const t = tr.takdir;

// A9 + A3 — Takdire foto ya da kısa ses ekleme. Seçilen medya /api/takdir/medya'ya
// yüklenir, dönen yol üst bileşene bildirilir (takdir POST'unda taşınır). Opsiyonel:
// hiç medya olmadan da takdir gönderilebilir.

const AZAMI_SN = 30;

export default function TakdirMedya({
  onDegis,
}: {
  onDegis: (m: { fotoPath: string | null; sesPath: string | null }) => void;
}) {
  const [fotoPath, setFotoPath] = useState<string | null>(null);
  const [sesPath, setSesPath] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);
  const [kayitta, setKayitta] = useState(false);
  const [sure, setSure] = useState(0);
  const [hata, setHata] = useState<string | null>(null);
  const fotoInput = useRef<HTMLInputElement | null>(null);

  const kayitci = useRef<MediaRecorder | null>(null);
  const akis = useRef<MediaStream | null>(null);
  const parcalar = useRef<Blob[]>([]);
  const sayac = useRef<ReturnType<typeof setInterval> | null>(null);
  const baslangic = useRef(0);
  const bitiriliyor = useRef(false);

  function bildir(next: { fotoPath?: string | null; sesPath?: string | null }) {
    const f = next.fotoPath !== undefined ? next.fotoPath : fotoPath;
    const s = next.sesPath !== undefined ? next.sesPath : sesPath;
    onDegis({ fotoPath: f, sesPath: s });
  }

  async function yukle(tur: "foto" | "ses", dosya: File) {
    setHata(null);
    setMesgul(true);
    try {
      const form = new FormData();
      form.append("tur", tur);
      form.append("dosya", dosya);
      const res = await fetch("/api/takdir/medya", { method: "POST", body: form });
      if (!res.ok) throw new Error();
      const { yol } = (await res.json()) as { yol: string };
      if (tur === "foto") {
        setFotoPath(yol);
        bildir({ fotoPath: yol });
      } else {
        setSesPath(yol);
        bildir({ sesPath: yol });
      }
    } catch {
      setHata(t.medyaHata);
    } finally {
      setMesgul(false);
    }
  }

  function fotoSec(e: React.ChangeEvent<HTMLInputElement>) {
    const d = e.target.files?.[0];
    if (d) void yukle("foto", d);
    e.target.value = "";
  }

  async function kayitBasla() {
    setHata(null);
    if (typeof MediaRecorder === "undefined") {
      setHata(t.medyaHata);
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
      kaydedici.onstop = () => {
        akis.current?.getTracks().forEach((iz) => iz.stop());
        const mt = kaydedici.mimeType.includes("mp4") ? "audio/mp4" : "audio/webm";
        const blob = new Blob(parcalar.current, { type: mt });
        const ad = mt.includes("mp4") ? "takdir.mp4" : "takdir.webm";
        void yukle("ses", new File([blob], ad, { type: mt }));
      };
      kayitci.current = kaydedici;
      baslangic.current = Date.now();
      bitiriliyor.current = false;
      kaydedici.start(1000);
      titret([20, 60, 20]);
      setSure(0);
      setKayitta(true);
      sayac.current = setInterval(() => {
        const sn = Math.floor((Date.now() - baslangic.current) / 1000);
        setSure(sn);
        if (sn >= AZAMI_SN) kayitBitir();
      }, 250);
    } catch {
      setHata(t.medyaHata);
    }
  }

  function kayitBitir() {
    if (bitiriliyor.current) return;
    bitiriliyor.current = true;
    if (sayac.current) clearInterval(sayac.current);
    setKayitta(false);
    const k = kayitci.current;
    if (k && k.state !== "inactive") k.stop();
  }

  function fotoKaldir() {
    setFotoPath(null);
    bildir({ fotoPath: null });
  }
  function sesKaldir() {
    setSesPath(null);
    bildir({ sesPath: null });
  }

  return (
    <div className="mt-3">
      <input
        ref={fotoInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={fotoSec}
        className="hidden"
      />
      <div className="flex flex-wrap gap-2">
        {fotoPath ? (
          <button
            type="button"
            onClick={fotoKaldir}
            className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-sm font-medium text-emerald-200"
          >
            📷 {t.fotoEklendi} ✕
          </button>
        ) : (
          <button
            type="button"
            disabled={mesgul}
            onClick={() => fotoInput.current?.click()}
            className="rounded-full border border-royal-light/30 bg-midnight-soft px-3 py-1.5 text-sm font-medium text-slate-300 hover:border-gold/50 disabled:opacity-50"
          >
            📷 {t.fotoEkle}
          </button>
        )}

        {sesPath ? (
          <button
            type="button"
            onClick={sesKaldir}
            className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-sm font-medium text-emerald-200"
          >
            🎤 {t.sesEklendi} ✕
          </button>
        ) : kayitta ? (
          <button
            type="button"
            onClick={kayitBitir}
            className="rounded-full border border-red-500/40 bg-red-500/15 px-3 py-1.5 text-sm font-bold text-red-200"
          >
            ● {t.sesDurdur} {sure}s
          </button>
        ) : (
          <button
            type="button"
            disabled={mesgul}
            onClick={() => void kayitBasla()}
            className="rounded-full border border-royal-light/30 bg-midnight-soft px-3 py-1.5 text-sm font-medium text-slate-300 hover:border-gold/50 disabled:opacity-50"
          >
            🎤 {t.sesEkle}
          </button>
        )}
      </div>
      {mesgul && <p className="mt-1 text-xs text-slate-400">{t.medyaYukleniyor}</p>}
      {hata && <p className="mt-1 text-xs text-red-400">{hata}</p>}
    </div>
  );
}

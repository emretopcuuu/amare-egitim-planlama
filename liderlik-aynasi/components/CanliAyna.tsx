"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { useEsc } from "@/lib/useEsc";

const t = tr.canliAyna;

const ADIMLAR = [
  { aci: "duz", yonerge: t.duz, ikon: "🙂" },
  { aci: "sag", yonerge: t.sag, ikon: "➡️" },
  { aci: "sol", yonerge: t.sol, ikon: "⬅️" },
] as const;

// Selfie sonrası "Canlı Ayna": çemberde düz/sağ/sol yüz kareleri (KYC hissi).
// Video üretiminde mimik malzemesi için. Kamera tam ekran sihirbaz.
//
// `gomulu`: Ritüel'in kendi adım akışına gömülü kullanıldığında (ses kaydından
// ÖNCE) sayfa yenilemez — akışı Ritüel'in kendi state'i yönetir, `onTamam`
// çağrılır. Bağımsız kullanımda (Pusula hub'ı) eskisi gibi router.refresh().
export default function CanliAyna({
  varMi = false,
  gomulu = false,
  onTamam,
}: {
  varMi?: boolean;
  gomulu?: boolean;
  onTamam?: () => void;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const akisRef = useRef<MediaStream | null>(null);
  const [acik, setAcik] = useState(false);
  const [adim, setAdim] = useState(0);
  const [kareler, setKareler] = useState<{ aci: string; blob: Blob }[]>([]);
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bitti, setBitti] = useState(varMi);
  useEsc(acik, () => kapat());

  function durdur() {
    akisRef.current?.getTracks().forEach((iz) => iz.stop());
    akisRef.current = null;
  }
  useEffect(() => () => durdur(), []);

  // Akışı video elemanına, eleman DOM'a girdikten SONRA bağla (rAF yarışı yok).
  useEffect(() => {
    const v = videoRef.current;
    if (acik && v && akisRef.current) {
      v.srcObject = akisRef.current;
      v.play().catch(() => {});
    }
  }, [acik]);

  async function baslat() {
    setHata(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setHata(t.desteklenmiyor);
      return;
    }
    try {
      const akis = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 720, height: 720 },
      });
      akisRef.current = akis;
      setAdim(0);
      setKareler([]);
      setAcik(true); // effect akışı bağlar
    } catch (e) {
      const ad = (e as { name?: string })?.name ?? "";
      if (ad === "NotAllowedError" || ad === "SecurityError") setHata(t.izinRet);
      else if (ad === "NotFoundError" || ad === "OverconstrainedError") setHata(t.kameraYok);
      else if (ad === "NotReadableError") setHata(t.kameraMesgul);
      else setHata(t.izinHata);
    }
  }

  async function cek() {
    const v = videoRef.current;
    if (!v || mesgul) return;
    const boyut = Math.min(v.videoWidth, v.videoHeight) || 720;
    const c = document.createElement("canvas");
    c.width = boyut;
    c.height = boyut;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const sx = (v.videoWidth - boyut) / 2;
    const sy = (v.videoHeight - boyut) / 2;
    ctx.drawImage(v, sx, sy, boyut, boyut, 0, 0, boyut, boyut);
    const blob = await new Promise<Blob | null>((res) =>
      c.toBlob(res, "image/jpeg", 0.9)
    );
    if (!blob) return;
    const yeni = [...kareler, { aci: ADIMLAR[adim].aci, blob }];
    setKareler(yeni);
    if (adim < ADIMLAR.length - 1) {
      setAdim(adim + 1);
    } else {
      await gonder(yeni);
    }
  }

  async function gonder(hepsi: { aci: string; blob: Blob }[]) {
    setMesgul(true);
    setHata(null);
    try {
      const form = new FormData();
      for (const k of hepsi) form.append(k.aci, k.blob, `${k.aci}.jpg`);
      const res = await fetch("/api/yuz-yakala", { method: "POST", body: form });
      if (!res.ok) throw new Error();
      durdur();
      setAcik(false);
      setBitti(true);
      if (gomulu) {
        onTamam?.();
      } else {
        router.refresh();
      }
    } catch {
      setHata(t.hata);
    } finally {
      setMesgul(false);
    }
  }

  function kapat() {
    durdur();
    setAcik(false);
  }

  if (bitti && !acik) {
    return <p className="text-sm font-medium text-emerald-400">{t.tamam}</p>;
  }

  if (!acik) {
    return (
      <div className="space-y-2">
        <button
          onClick={baslat}
          className="btn-kor flex h-11 w-full items-center justify-center rounded-xl text-sm font-bold"
        >
          {t.basla}
        </button>
        {hata && <p className="text-sm text-red-400">{hata}</p>}
      </div>
    );
  }

  // Tam ekran kamera — transform'lu ata `fixed`'i hapsetmesin diye portal ile body'ye.
  const katman = (
    <div
      role="dialog"
      aria-modal="true"
      className="koyu-alan fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black px-6 py-8"
    >
      <p className="prizma-serif text-[0.7rem] uppercase tracking-[0.35em] text-slate-400">
        {t.ust}
      </p>
      <p className="prizma-serif ay-metin mt-1 text-2xl font-semibold">{t.ustBaslik}</p>

      {/* Belirgin yönerge — büyük ikon + kalın metin + adım sayacı (kişi her
          karede ne yapacağını net görür; küçük gri satır fark edilmiyordu). */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-gold/45 bg-gold/10 px-5 py-3 shadow-[0_0_24px_-6px_rgba(245,158,11,0.5)]">
        <span aria-hidden className="text-3xl leading-none">{ADIMLAR[adim].ikon}</span>
        <span className="text-2xl font-bold text-gold-light">{ADIMLAR[adim].yonerge}</span>
      </div>
      <p className="mt-1.5 text-sm font-medium text-slate-400">{t.adimSayac(adim + 1, ADIMLAR.length)}</p>

      <div className="relative my-5 h-72 w-72 overflow-hidden rounded-full ring-4 ring-gold/60">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className="h-full w-full -scale-x-100 object-cover"
        />
      </div>

      <div className="flex gap-1.5">
        {ADIMLAR.map((_, i) => (
          <span
            key={i}
            className={`h-2 rounded-full transition-all ${
              i <= adim ? "w-6 bg-gold" : "w-2 bg-white/25"
            }`}
          />
        ))}
      </div>

      {hata && <p className="mt-3 text-sm text-red-400">{hata}</p>}

      <button
        onClick={cek}
        disabled={mesgul}
        className="btn-kor parilti mt-6 flex h-14 w-full max-w-xs items-center justify-center rounded-2xl text-lg font-bold disabled:opacity-50"
      >
        {mesgul ? t.gonderiliyor : t.cek}
      </button>
      <button onClick={kapat} className="mt-3 text-sm text-slate-400 hover:text-slate-200">
        {t.vazgec}
      </button>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(katman, document.body) : null;
}

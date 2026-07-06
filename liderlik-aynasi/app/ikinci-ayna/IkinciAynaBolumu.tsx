"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";
import AynaDusunuyor from "@/components/AynaDusunuyor";

// FAZ 13 — 90. Gün Finali. Kamptaki mektup akışıyla aynı desen: mount'ta
// getir/üret dener, yükleniyor/hata/kapalı/hazır durumlarını yönetir.
export default function IkinciAynaBolumu() {
  const [icerik, setIcerik] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [durum, setDurum] = useState<"bekliyor" | "kapali" | "hata" | null>(null);
  const denendi = useRef(false);

  async function getir() {
    setYukleniyor(true);
    setDurum(null);
    try {
      const res = await fetch("/api/ikinci-ayna", { method: "POST" });
      const veri = await res.json().catch(() => null);
      if (res.ok && veri?.icerik) {
        setIcerik(veri.icerik);
      } else if (veri?.hata === "kapali") {
        setDurum("kapali");
      } else {
        setDurum("hata");
      }
    } catch {
      setDurum("hata");
    } finally {
      setYukleniyor(false);
    }
  }

  useEffect(() => {
    if (denendi.current) return;
    denendi.current = true;
    void getir();
  }, []);

  return (
    <div className="space-y-5">
      <header className="text-center">
        <p className="text-4xl" aria-hidden>🌊</p>
        <h1 className="prizma-serif ay-metin mt-2 text-2xl font-semibold">İkinci Aynan</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          90 gün önce bir söz vermiştin. Şimdi AYNA, o sözden bugüne yürüdüğün yola bakıyor.
        </p>
      </header>

      {yukleniyor ? (
        <AynaDusunuyor satirlar={tr.dusunuyor.mektup} />
      ) : durum === "kapali" ? (
        <div className="kart-cam rounded-3xl p-8 text-center">
          <p className="text-sm leading-relaxed text-slate-300">
            İkinci Aynan henüz açılmadı — 90 gün dolduğunda burada seni bekleyecek.
          </p>
        </div>
      ) : durum === "hata" ? (
        <div className="kart-cam rounded-3xl p-8 text-center">
          <p className="text-sm leading-relaxed text-slate-300">Bir aksilik oldu. Tekrar dene.</p>
          <button
            onClick={getir}
            className="btn-kor mt-5 inline-flex h-11 items-center justify-center rounded-xl px-6 font-semibold"
          >
            Tekrar dene
          </button>
        </div>
      ) : icerik ? (
        <div className="kart-cam whitespace-pre-wrap rounded-3xl p-6 font-serif text-base leading-relaxed text-slate-100">
          {icerik}
        </div>
      ) : null}

      <p className="text-center">
        <Link href="/" className="text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline">
          Ana sayfa
        </Link>
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import TelefonaKurKocu from "@/components/TelefonaKurKocu";

// OYUN SEÇİMİ'nden HEMEN ÖNCE: "uygulamayı telefonuna kur" geçidi. Telefon +
// tarayıcı algılanır (TelefonaKurKocu), ona göre görsel yönlendirme gösterilir.
// Atlanabilir: "Kurdum / Devam et" ya da "Şimdilik geç". Kurulu (standalone),
// masaüstü ya da daha önce geçilmişse hiç gösterilmez — doğrudan içerik akar.
const DEPO = "la_kurulum_gecildi_v1";

export default function KurulumGecidi({ children }: { children: React.ReactNode }) {
  const [durum, setDurum] = useState<"yukleniyor" | "kurulum" | "gec">("yukleniyor");

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    const mobil = /iphone|ipad|ipod|android/i.test(ua);
    let gecildi = false;
    try {
      gecildi = localStorage.getItem(DEPO) === "1";
    } catch {}
    // Kuruluysa, masaüstündeyse ya da daha önce geçildiyse: geçit yok.
    setDurum(standalone || !mobil || gecildi ? "gec" : "kurulum");
  }, []);

  function gec() {
    try {
      localStorage.setItem(DEPO, "1");
    } catch {}
    setDurum("gec");
  }

  if (durum === "yukleniyor") return null;
  if (durum === "gec") return <>{children}</>;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-5xl" aria-hidden>
          📲
        </p>
        <h1 className="prizma-serif ay-metin mt-3 text-2xl font-semibold">
          Önce uygulamayı telefonuna kur
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Liderlik Aynası&apos;nı bir uygulama gibi ana ekranına ekle; kampı oradan kesintisiz
          takip edersin. Kurduktan sonra uygulamadan devam et.
        </p>
      </div>

      {/* Telefon + tarayıcıya göre kurulum koçu (algılamalı) */}
      <TelefonaKurKocu />

      <button
        onClick={gec}
        className="btn-kor parilti flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold"
      >
        Kurdum / Devam et →
      </button>
      <button
        onClick={gec}
        className="mx-auto block text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
      >
        Şimdilik geç, sonra yaparım
      </button>
    </div>
  );
}

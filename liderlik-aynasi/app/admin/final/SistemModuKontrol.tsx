"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import Bekle from "@/components/Bekle";

const t = tr.admin.aynaDirektor;

// Sistem modu: kamp ↔ 90 günlük yolculuk. "Yolculuğu Başlat" kamp bittikten
// sonra basılan bir kapanış adımı olduğu için Final & Sonrası sayfasında yaşar
// (AYNA Direktörü canlı kamp ekranı; bu kamp-sonrası bir geçiş).
export default function SistemModuKontrol({ mod }: { mod: string }) {
  const router = useRouter();
  const [bekliyor, setBekliyor] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  async function modDegistir(yeni: "kamp" | "yolculuk") {
    setBekliyor(yeni);
    setHata(null);
    try {
      const res = await fetch("/api/admin/ayna-direktoru", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ islem: "mod", mod: yeni }),
      });
      if (!res.ok) {
        setHata(t.hata);
        return;
      }
      router.refresh();
    } catch {
      setHata(t.hata);
    } finally {
      setBekliyor(null);
    }
  }

  return (
    <div>
      <p className="text-sm text-slate-400">{t.modAciklama}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          onClick={() => modDegistir("kamp")}
          disabled={bekliyor !== null || mod === "kamp"}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
            mod === "kamp"
              ? "bg-royal/50 text-gold-light"
              : "border border-royal-light/30 text-slate-300 hover:bg-midnight-soft"
          }`}
        >
          {bekliyor === "kamp" ? <Bekle /> : t.kampaDon}
        </button>
        <button
          onClick={() => modDegistir("yolculuk")}
          disabled={bekliyor !== null || mod === "yolculuk"}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
            mod === "yolculuk"
              ? "bg-royal/50 text-gold-light"
              : "border border-gold/50 text-gold-light hover:bg-gold/10"
          }`}
        >
          {bekliyor === "yolculuk" ? <Bekle /> : t.yolculukBaslat}
        </button>
      </div>
      {hata && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-400">
          {hata}
        </p>
      )}
    </div>
  );
}

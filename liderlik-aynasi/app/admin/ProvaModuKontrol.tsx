"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tost } from "@/lib/tost";
import Bekle from "@/components/Bekle";

export default function ProvaModuKontrol({ acik }: { acik: boolean }) {
  const router = useRouter();
  const [mesgul, setMesgul] = useState(false);

  async function degistir(yeniDurum: boolean) {
    setMesgul(true);
    try {
      const res = await fetch("/api/admin/prova-modu", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ acik: yeniDurum }),
      });
      if (!res.ok) { tost("Güncellenemedi", "hata"); return; }
      tost(
        yeniDurum ? "⚠️ PROVA MODU açıldı — kırmızı şerit tüm sayfalarda görünür" : "Prova modu kapatıldı",
        yeniDurum ? "bilgi" : "basari"
      );
      router.refresh();
    } catch {
      tost("Güncellenemedi", "hata");
    } finally {
      setMesgul(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${acik ? "bg-red-500 animate-pulse" : "bg-slate-600"}`}
        />
        <span className={`text-sm font-medium ${acik ? "text-red-300" : "text-slate-400"}`}>
          {acik ? "⚠️ PROVA MODU açık — tüm sayfalarda kırmızı şerit görünüyor" : "Prova modu kapalı"}
        </span>
      </div>
      <button
        onClick={() => void degistir(!acik)}
        disabled={mesgul}
        className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
          acik
            ? "border border-red-400/40 text-red-300 hover:bg-red-400/10"
            : "border border-royal-light/40 text-slate-300 hover:bg-midnight-soft"
        }`}
      >
        {mesgul ? <Bekle /> : acik ? "Kapat" : "Prova Modunu Aç"}
      </button>
    </div>
  );
}

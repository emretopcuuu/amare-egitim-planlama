"use client";

import { useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.durt;

// #9 Tek dokunuşla dürtme: öz-puanını bitirmemiş katılımcılara hatırlatma
// push'u gönderir. Admin tek tek peşinden koşmasın — tek buton.
export default function EksikDurt({ eksikSayisi }: { eksikSayisi: number }) {
  const [durum, setDurum] = useState<"hazir" | "gonderiliyor" | "bitti" | "hata">(
    "hazir"
  );
  const [sonuc, setSonuc] = useState(0);

  async function durt() {
    setDurum("gonderiliyor");
    try {
      const res = await fetch("/api/admin/durt", { method: "POST" });
      if (!res.ok) {
        setDurum("hata");
        return;
      }
      const veri = await res.json().catch(() => ({}));
      setSonuc(veri.gonderildi ?? 0);
      setDurum("bitti");
    } catch {
      setDurum("hata");
    }
  }

  if (durum === "bitti") {
    return (
      <p className="mt-4 rounded-xl bg-emerald-400/10 p-3 text-center text-sm font-semibold text-emerald-300">
        {t.sonuc(sonuc)}
      </p>
    );
  }

  return (
    <div className="mt-4">
      <button
        onClick={durt}
        disabled={durum === "gonderiliyor"}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-gold px-4 text-sm font-bold text-[#1a1206] transition-colors hover:bg-gold-light disabled:opacity-50"
      >
        {durum === "gonderiliyor" ? t.gonderiliyor : t.dugme(eksikSayisi)}
      </button>
      {durum === "hata" && (
        <p role="alert" className="mt-2 text-center text-sm font-medium text-red-400">
          {t.hata}
        </p>
      )}
    </div>
  );
}

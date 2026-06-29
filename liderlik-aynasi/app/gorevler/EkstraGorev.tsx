"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";

const t = tr.gorevler;

// "Bana ekstra görev ver" — bekleyen görev yokken (boş zaman / puanını artırma)
// kendi isteğiyle taze bir görev ister. AYNA üretip pending olarak düşürür.
export default function EkstraGorev({ ikincil = false }: { ikincil?: boolean }) {
  const router = useRouter();
  const [durum, setDurum] = useState<"idle" | "uretiliyor" | "hazir" | "hata">("idle");

  async function iste() {
    if (durum === "uretiliyor") return;
    setDurum("uretiliyor");
    try {
      const res = await fetch("/api/gorev-ekstra", { method: "POST" });
      if (res.ok) {
        titret([10, 30, 10]);
        setDurum("hazir");
        setTimeout(() => router.refresh(), 900);
      } else {
        setDurum("hata");
      }
    } catch {
      setDurum("hata");
    }
  }

  if (durum === "hazir") {
    return (
      <p className="mt-1 text-center text-sm font-medium text-emerald-400">{t.ekstraHazir}</p>
    );
  }

  return (
    <button
      type="button"
      onClick={iste}
      disabled={durum === "uretiliyor"}
      className={
        ikincil
          ? "flex h-12 w-full items-center justify-center rounded-xl border border-gold/40 text-sm font-semibold text-gold-light transition-colors hover:bg-gold/10 disabled:opacity-50"
          : "btn-kor parilti flex h-12 w-full items-center justify-center rounded-xl text-sm font-bold disabled:opacity-50"
      }
    >
      {durum === "uretiliyor"
        ? t.ekstraUretiliyor
        : durum === "hata"
          ? t.ekstraOlmadi
          : `🔥 ${t.ekstraIste}`}
    </button>
  );
}

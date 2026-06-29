"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { tost } from "@/lib/tost";
import { titret } from "@/lib/his";

const t = tr.gorevler;

// "Yeni görev iste" — kişi beklemek yerine AYNA'dan o an taze bir görev çeker.
// Bekleyen görev varsa sunucu reddeder (önce eldekini bitir). Üretilince /gorevler'e
// götürür. Yalnız bekleme/boş durumda gösterilir (görev varken zaten gizli).
export default function YeniGorevButonu({
  etiket,
  vurgu = false,
}: {
  etiket?: string;
  vurgu?: boolean;
}) {
  const router = useRouter();
  const [mesgul, setMesgul] = useState(false);

  async function iste() {
    if (mesgul) return;
    setMesgul(true);
    titret(8);
    try {
      const r = await fetch("/api/yeni-gorev", { method: "POST" });
      if (r.ok) {
        router.push("/gorevler");
        router.refresh();
        return;
      }
      const d = await r.json().catch(() => null);
      tost(d?.kod === "var" ? t.zatenGorevVar : d?.hata || t.benzeriOlmaz, "hata");
      if (d?.kod === "var") router.push("/gorevler");
    } catch {
      tost(t.benzeriOlmaz, "hata");
    } finally {
      setMesgul(false);
    }
  }

  return (
    <button
      onClick={() => void iste()}
      disabled={mesgul}
      className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold transition-transform hover:scale-[1.01] disabled:opacity-60 ${
        vurgu ? "parilti btn-kor" : "btn-kor"
      }`}
    >
      {mesgul ? t.yeniGorevUretiliyor : etiket || t.yeniGorevIste}
    </button>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Bekle from "@/components/Bekle";

export default function SozAcKapat({ acik }: { acik: boolean }) {
  const router = useRouter();
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState(false);

  async function cevir() {
    setCalisiyor(true);
    setHata(false);
    try {
      const res = await fetch("/api/admin/soz-ac", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ acik: !acik }),
      });
      if (!res.ok) {
        setHata(true);
        return;
      }
      router.refresh();
    } catch {
      setHata(true);
    } finally {
      setCalisiyor(false);
    }
  }

  return (
    <div>
      <button
        onClick={cevir}
        disabled={calisiyor}
        className={`rounded-xl px-5 py-2.5 font-semibold transition-colors disabled:opacity-50 ${
          acik
            ? "border border-amber-400/50 text-amber-300 hover:bg-amber-400/10"
            : "btn-3d bg-gold text-[#1a1206] hover:bg-gold-light"
        }`}
      >
        {calisiyor ? <Bekle /> : acik ? "Kamp Sözünü Kapat" : "Kamp Sözünü Aç"}
      </button>
      {hata && <p className="mt-2 text-sm font-medium text-red-400">İşlem başarısız.</p>}
    </div>
  );
}

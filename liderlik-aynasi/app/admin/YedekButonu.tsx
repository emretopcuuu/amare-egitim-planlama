"use client";

import { useState } from "react";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.yedek;

// Felaket sigortası: /api/admin/yedek'ten JSON dosyasını indirir.
export default function YedekButonu() {
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState(false);

  async function indir() {
    setMesgul(true);
    setHata(false);
    try {
      const res = await fetch("/api/admin/yedek");
      if (!res.ok) {
        setHata(true);
        return;
      }
      const blob = await res.blob();
      const ad =
        res.headers
          .get("content-disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? "liderlik-aynasi-yedek.json";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = ad;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setHata(true);
    } finally {
      setMesgul(false);
    }
  }

  return (
    <div>
      <button
        onClick={indir}
        disabled={mesgul}
        className="btn-3d rounded-xl bg-gold px-5 py-2.5 font-semibold text-midnight transition-colors hover:bg-gold-light disabled:opacity-50"
      >
        {mesgul ? t.indiriliyor : t.indir}
      </button>
      {hata && <p className="mt-2 text-sm font-medium text-red-400">{t.hata}</p>}
    </div>
  );
}

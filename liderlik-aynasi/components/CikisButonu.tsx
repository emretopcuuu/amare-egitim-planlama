"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { tr } from "@/lib/i18n/tr";

export default function CikisButonu() {
  const router = useRouter();
  const [yukleniyor, setYukleniyor] = useState(false);

  async function cikis() {
    setYukleniyor(true);
    try {
      await fetch("/api/cikis", { method: "POST" });
    } finally {
      router.replace("/giris");
      router.refresh();
    }
  }

  return (
    <button
      onClick={cikis}
      disabled={yukleniyor}
      className="h-12 rounded-xl border border-royal-light/40 font-medium text-slate-300 transition-colors hover:bg-midnight-card disabled:opacity-50"
    >
      {tr.anaSayfa.cikisYap}
    </button>
  );
}

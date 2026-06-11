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
      className="mx-auto text-sm text-slate-500 underline-offset-4 transition-colors hover:text-slate-300 hover:underline disabled:opacity-50"
    >
      {tr.anaSayfa.cikisYap}
    </button>
  );
}

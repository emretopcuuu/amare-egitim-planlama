"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.ortak;

export default function OrtakSohbet() {
  const router = useRouter();
  const [mesaj, setMesaj] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState(false);

  async function gonder() {
    if (gonderiliyor || mesaj.trim().length < 1) return;
    setGonderiliyor(true);
    setHata(false);
    try {
      const res = await fetch("/api/ortak-mesaj", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mesaj: mesaj.trim() }),
      });
      if (!res.ok) {
        setHata(true);
        return;
      }
      setMesaj("");
      router.refresh();
    } catch {
      setHata(true);
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={mesaj}
          onChange={(e) => setMesaj(e.target.value.slice(0, 500))}
          onKeyDown={(e) => {
            if (e.key === "Enter") gonder();
          }}
          placeholder={t.mesajYer}
          className="h-12 flex-1 rounded-xl border border-royal-light/30 bg-midnight-soft px-3 text-base text-slate-100 outline-none placeholder:text-slate-500 focus:border-gold"
        />
        <button
          onClick={gonder}
          disabled={gonderiliyor || mesaj.trim().length < 1}
          className="shrink-0 btn-3d rounded-xl bg-gold px-5 font-semibold text-[#1a1206] transition-colors hover:bg-gold-light disabled:opacity-40"
        >
          {gonderiliyor ? "…" : t.gonder}
        </button>
      </div>
      {hata && <p className="mt-2 text-sm font-medium text-red-400">{t.hata}</p>}
    </div>
  );
}

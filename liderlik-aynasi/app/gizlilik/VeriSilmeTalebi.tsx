"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.kvkk;

export default function VeriSilmeTalebi({
  mevcutTarih,
}: {
  mevcutTarih: string | null;
}) {
  const router = useRouter();
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [onay, setOnay] = useState(false);
  const [hata, setHata] = useState(false);

  if (mevcutTarih) {
    return (
      <p className="rounded-xl bg-amber-500/10 p-3 text-sm font-medium text-amber-300">
        {t.silMevcut(mevcutTarih)}
      </p>
    );
  }

  async function gonder() {
    setGonderiliyor(true);
    setHata(false);
    try {
      const res = await fetch("/api/veri-silme", { method: "POST" });
      if (!res.ok) {
        setHata(true);
        return;
      }
      router.refresh();
    } catch {
      setHata(true);
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <div>
      <h3 className="text-base font-semibold text-red-300">{t.silBaslik}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-300">{t.silAciklama}</p>
      <button
        onClick={() => {
          if (!onay) {
            setOnay(true);
            setTimeout(() => setOnay(false), 4000);
            return;
          }
          setOnay(false);
          void gonder();
        }}
        disabled={gonderiliyor}
        className="mt-3 w-full rounded-xl border border-red-400/40 px-4 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-400/10 disabled:opacity-50"
      >
        {gonderiliyor ? t.silGonderiliyor : onay ? "Emin misin? Tekrar bas" : t.silDugme}
      </button>
      {hata && <p className="mt-2 text-sm font-medium text-red-400">{t.hata}</p>}
    </div>
  );
}

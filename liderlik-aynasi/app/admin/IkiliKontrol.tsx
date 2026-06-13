"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.ikili;

export default function IkiliKontrol({ mevcut }: { mevcut: number }) {
  const router = useRouter();
  const [calisiyor, setCalisiyor] = useState(false);
  const [sonuc, setSonuc] = useState<number | null>(null);
  const [hata, setHata] = useState(false);

  async function olustur() {
    setCalisiyor(true);
    setHata(false);
    setSonuc(null);
    try {
      const res = await fetch("/api/admin/eslestir-ikili", { method: "POST" });
      const veri = await res.json().catch(() => null);
      if (!res.ok) {
        setHata(true);
        return;
      }
      setSonuc(veri.ikiliSayisi ?? 0);
      router.refresh();
    } catch {
      setHata(true);
    } finally {
      setCalisiyor(false);
    }
  }

  return (
    <div>
      <p className="mb-3 text-sm text-slate-400">{t.mevcut(mevcut)}</p>
      <button
        onClick={olustur}
        disabled={calisiyor}
        className="btn-3d rounded-xl bg-gold px-5 py-2.5 font-semibold text-midnight transition-colors hover:bg-gold-light disabled:opacity-50"
      >
        {calisiyor ? t.olusturuluyor : t.olustur}
      </button>
      {sonuc !== null && (
        <p className="mt-2 text-sm font-semibold text-emerald-300">{t.olusturuldu(sonuc)}</p>
      )}
      {hata && <p className="mt-2 text-sm font-medium text-red-400">{t.hata}</p>}
    </div>
  );
}

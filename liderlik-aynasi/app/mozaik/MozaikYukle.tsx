"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";
import { sesCal } from "@/lib/sesEfekti";

const t = tr.mozaik;

// B3 — Mozaik parça yükleme düğmesi. Foto seç → /api/mozaik → grubun mozaiğine
// eklenir (kişi başına tek parça; tekrar yüklerse günceller).
export default function MozaikYukle({ zatenVar }: { zatenVar: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement | null>(null);
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [eklendi, setEklendi] = useState(false);

  async function sec(e: React.ChangeEvent<HTMLInputElement>) {
    const d = e.target.files?.[0];
    e.target.value = "";
    if (!d) return;
    setHata(null);
    setMesgul(true);
    try {
      const form = new FormData();
      form.append("dosya", d);
      const r = await fetch("/api/mozaik", { method: "POST", body: form });
      if (!r.ok) throw new Error();
      titret([14, 40, 14]);
      sesCal("mozaik");
      setEklendi(true);
      router.refresh();
    } catch {
      setHata(t.hata);
    } finally {
      setMesgul(false);
    }
  }

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={sec}
        className="hidden"
      />
      <button
        type="button"
        disabled={mesgul}
        onClick={() => input.current?.click()}
        className="w-full btn-3d rounded-xl bg-gold px-4 py-3 font-semibold text-[#1a1206] transition-colors hover:bg-gold-light disabled:opacity-40"
      >
        {mesgul ? t.yukleniyor : zatenVar ? t.parcamGuncelle : t.parcaEkle}
      </button>
      {eklendi && <p className="mt-2 text-center text-sm font-semibold text-emerald-300">{t.eklendi}</p>}
      {hata && <p className="mt-2 text-center text-sm font-medium text-red-400">{hata}</p>}
    </div>
  );
}

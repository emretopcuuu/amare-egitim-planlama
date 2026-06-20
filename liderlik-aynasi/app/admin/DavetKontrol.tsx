"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.doksanGun;

type Props = {
  epostali: number;
  toplam: number;
  sonGonderim: string | null; // ISO zaman — daha önce gönderildiyse
};

export default function DavetKontrol({ epostali, toplam, sonGonderim }: Props) {
  const router = useRouter();
  const [onay, setOnay] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [ilerleme, setIlerleme] = useState(0);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const tekrarMi = sonGonderim !== null;
  const hazir = epostali > 0 && (!tekrarMi || onay) && !gonderiliyor;

  async function gonder() {
    if (!hazir) return;
    setGonderiliyor(true);
    setMesaj(null);
    setHata(null);
    let offset = 0;
    let toplamGonderilen = 0;
    let toplamBasarisiz = 0;
    try {
      for (;;) {
        const res = await fetch("/api/admin/davetler", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ offset }),
        });
        const veri = await res.json().catch(() => null);
        if (!res.ok) {
          setHata(veri?.hata ?? t.hata);
          return;
        }
        toplamGonderilen += veri.gonderilen;
        toplamBasarisiz += veri.basarisiz;
        offset = veri.sonraki;
        setIlerleme(offset);
        if (veri.bitti) break;
      }
      setMesaj(
        toplamBasarisiz > 0
          ? `${t.basarili(toplamGonderilen)} ${t.kismiHata(toplamBasarisiz)}`
          : t.basarili(toplamGonderilen)
      );
      setOnay(false);
      router.refresh();
    } catch {
      setHata(t.hata);
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm text-slate-300">
        {epostali > 0 ? t.epostali(epostali, toplam) : t.epostaYok}
      </p>
      {sonGonderim && (
        <p className="text-xs text-slate-400">
          {t.sonGonderim(new Date(sonGonderim).toLocaleString("tr-TR"))}
        </p>
      )}

      {tekrarMi && epostali > 0 && (
        <label className="flex items-center gap-2 text-sm text-amber-400">
          <input
            type="checkbox"
            checked={onay}
            onChange={(e) => setOnay(e.target.checked)}
            className="h-4 w-4 accent-gold"
          />
          {t.tekrarOnay}
        </label>
      )}

      {mesaj && <p className="text-sm font-medium text-emerald-400">{mesaj}</p>}
      {hata && (
        <p role="alert" className="text-sm font-medium text-red-400">
          {hata}
        </p>
      )}

      <button
        onClick={gonder}
        disabled={!hazir}
        className="btn-3d rounded-xl bg-gold px-5 py-2.5 font-semibold text-[#1a1206] transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-40"
      >
        {gonderiliyor ? t.gonderiliyor(ilerleme, epostali) : `📬 ${t.gonder}`}
      </button>
    </div>
  );
}

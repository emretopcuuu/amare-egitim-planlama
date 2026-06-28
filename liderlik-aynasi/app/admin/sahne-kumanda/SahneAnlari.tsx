"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import Bekle from "@/components/Bekle";

const t = tr.admin.aynaDirektor;

// Sahne anları: AYNA'nın marka sesiyle /ekran üzerinden salona konuşması.
// Canlı sahne anında (Açılış 21:00, Ayna Anı 23:20) basıldığı için Sahne
// sayfasında yaşar; AYNA'nın global ayarları (aç/kapa, tempo, mod) ayrı.
export default function SahneAnlari() {
  const router = useRouter();
  const [bekliyor, setBekliyor] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  async function istek(govde: object, islem: string): Promise<unknown> {
    setBekliyor(islem);
    setMesaj(null);
    setHata(null);
    try {
      const res = await fetch("/api/admin/ayna-direktoru", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(govde),
      });
      const veri = await res.json().catch(() => null);
      if (!res.ok) {
        setHata(veri?.hata ?? t.hata);
        return null;
      }
      router.refresh();
      return veri;
    } catch {
      setHata(t.hata);
      return null;
    } finally {
      setBekliyor(null);
    }
  }

  async function acilisAnonsu() {
    if (!window.confirm(t.acilisOnay)) return;
    const veri = await istek({ islem: "acilis" }, "acilis");
    if (veri) setMesaj(t.acilisGonderildi);
  }

  async function aynaAni() {
    if (!window.confirm(t.aynaAniOnay)) return;
    const veri = (await istek({ islem: "aynaAni" }, "aynaAni")) as {
      gozlem?: number;
      teslim?: number;
    } | null;
    if (veri) setMesaj(t.aynaAniGonderildi(veri.gozlem ?? 0, veri.teslim ?? 0));
  }

  return (
    <div>
      <p className="text-sm text-slate-400">{t.sahneAciklama}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          onClick={acilisAnonsu}
          disabled={bekliyor !== null}
          className="rounded-lg border border-gold/50 px-4 py-2 text-sm font-semibold text-gold-light transition-colors hover:bg-gold/10 disabled:opacity-50"
        >
          {bekliyor === "acilis" ? <Bekle /> : t.acilisDugme}
        </button>
        <button
          onClick={aynaAni}
          disabled={bekliyor !== null}
          className="rounded-lg border border-royal-light/40 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-midnight-soft disabled:opacity-50"
        >
          {bekliyor === "aynaAni" ? <Bekle /> : t.aynaAniDugme}
        </button>
      </div>

      {mesaj && <p className="mt-3 text-sm font-medium text-emerald-400">{mesaj}</p>}
      {hata && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-400">
          {hata}
        </p>
      )}
    </div>
  );
}

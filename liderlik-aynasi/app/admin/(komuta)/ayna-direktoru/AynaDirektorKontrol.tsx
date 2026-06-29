"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import Bekle from "@/components/Bekle";

const t = tr.admin.aynaDirektor;

type Props = {
  aktif: boolean;
  aboneSayisi: number;
  katilimciSayisi: number;
};

export default function AynaDirektorKontrol({
  aktif,
  aboneSayisi,
  katilimciSayisi,
}: Props) {
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

  async function tikCalistir() {
    const veri = (await istek({ islem: "tik" }, "tik")) as {
      uretilen?: number;
      puanlanan?: number;
      hatirlatilan?: number;
      acilan?: number;
      fisilti?: number;
      ozet?: string;
    } | null;
    if (veri) {
      setMesaj(
        t.tikSonuc(
          `${veri.ozet} — görev:${veri.uretilen ?? 0} puan:${veri.puanlanan ?? 0} hatırlatma:${veri.hatirlatilan ?? 0} program:${veri.acilan ?? 0} fısıltı:${veri.fisilti ?? 0}`
        )
      );
    }
  }

  async function sozGonder() {
    if (!window.confirm(t.sozOnay)) return;
    const veri = (await istek({ islem: "soz" }, "soz")) as {
      gonderilen?: number;
    } | null;
    if (veri?.gonderilen !== undefined) setMesaj(t.sozGonderildi(veri.gonderilen));
  }

  return (
    <div className="space-y-5">
      {/* Uyandır / durdur */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p
            className={`text-lg font-bold ${aktif ? "text-emerald-400" : "text-slate-400"}`}
          >
            {aktif ? `● ${t.durumAktif}` : `○ ${t.durumPasif}`}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {t.aboneSayisi(aboneSayisi, katilimciSayisi)}
          </p>
        </div>
        <button
          onClick={() => istek({ islem: "durum", aktif: !aktif }, "durum")}
          disabled={bekliyor !== null}
          className={`rounded-xl px-6 py-3 font-bold transition-colors disabled:opacity-50 ${
            aktif
              ? "border border-royal-light/40 text-slate-300 hover:bg-midnight-soft"
              : "bg-gold text-[#1a1206] shadow-lg shadow-gold/20 hover:bg-gold-light"
          }`}
        >
          {bekliyor === "durum" ? <Bekle /> : aktif ? t.durdur : `🤖 ${t.uyandir}`}
        </button>
      </div>

      {/* Deneme turu + kapanış */}
      <div className="border-t border-royal/20 pt-4">
        <button
          onClick={tikCalistir}
          disabled={bekliyor !== null}
          className="rounded-lg border border-royal-light/40 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-midnight-soft disabled:opacity-50"
        >
          {bekliyor === "tik" ? <Bekle /> : `▶ ${t.tikCalistir}`}
        </button>
        <p className="mt-2 max-w-prose text-xs text-slate-500">{t.tikAciklama}</p>
        <button
          onClick={sozGonder}
          disabled={bekliyor !== null}
          className="mt-4 rounded-lg border border-gold/50 px-4 py-2 text-sm font-semibold text-gold-light transition-colors hover:bg-gold/10 disabled:opacity-50"
        >
          {bekliyor === "soz" ? <Bekle /> : t.sozGonder}
        </button>
      </div>

      <p className="max-w-prose text-xs text-slate-500">{t.kurulumUyari}</p>

      {mesaj && <p className="text-sm font-medium text-emerald-400">{mesaj}</p>}
      {hata && (
        <p role="alert" className="text-sm font-medium text-red-400">
          {hata}
        </p>
      )}
    </div>
  );
}

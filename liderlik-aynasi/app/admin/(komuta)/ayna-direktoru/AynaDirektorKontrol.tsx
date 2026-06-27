"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import Bekle from "@/components/Bekle";

const t = tr.admin.aynaDirektor;

type Props = {
  aktif: boolean;
  tempo: string;
  mod: string;
  aboneSayisi: number;
  katilimciSayisi: number;
};

export default function AynaDirektorKontrol({
  aktif,
  tempo,
  mod,
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

      {/* Tempo */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-300">{t.tempoEtiket}:</span>
        {(["surpriz", "2", "3"] as const).map((secenek) => (
          <button
            key={secenek}
            onClick={() => istek({ islem: "tempo", tempo: secenek }, "tempo")}
            disabled={bekliyor !== null}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
              tempo === secenek
                ? "bg-royal/50 text-gold-light"
                : "border border-royal-light/30 text-slate-300 hover:bg-midnight-soft"
            }`}
          >
            {t.tempolar[secenek]}
          </button>
        ))}
      </div>

      {/* Sistem modu: kamp ↔ 90 günlük yolculuk */}
      <div className="border-t border-royal/20 pt-4">
        <p className="text-sm font-medium text-slate-300">{t.modBaslik}</p>
        <p className="mt-1 text-xs text-slate-500">{t.modAciklama}</p>
        <div className="mt-2 flex flex-wrap gap-3">
          <button
            onClick={() => istek({ islem: "mod", mod: "kamp" }, "mod")}
            disabled={bekliyor !== null || mod === "kamp"}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
              mod === "kamp"
                ? "bg-royal/50 text-gold-light"
                : "border border-royal-light/30 text-slate-300 hover:bg-midnight-soft"
            }`}
          >
            {t.kampaDon}
          </button>
          <button
            onClick={() => istek({ islem: "mod", mod: "yolculuk" }, "mod")}
            disabled={bekliyor !== null || mod === "yolculuk"}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
              mod === "yolculuk"
                ? "bg-royal/50 text-gold-light"
                : "border border-gold/50 text-gold-light hover:bg-gold/10"
            }`}
          >
            {t.yolculukBaslat}
          </button>
        </div>
      </div>

      {/* Sahne anları: AYNA'nın marka sesi /ekran'dan salona konuşur */}
      <div className="border-t border-royal/20 pt-4">
        <p className="text-sm font-medium text-slate-300">{t.sahneBaslik}</p>
        <p className="mt-1 text-xs text-slate-500">{t.sahneAciklama}</p>
        <div className="mt-2 flex flex-wrap gap-3">
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
      </div>

      {/* Test + final */}
      <div className="flex flex-wrap gap-3 border-t border-royal/20 pt-4">
        <button
          onClick={tikCalistir}
          disabled={bekliyor !== null}
          className="rounded-lg border border-royal-light/40 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-midnight-soft disabled:opacity-50"
        >
          {bekliyor === "tik" ? <Bekle /> : `⚙️ ${t.tikCalistir}`}
        </button>
        <button
          onClick={sozGonder}
          disabled={bekliyor !== null}
          className="rounded-lg border border-gold/50 px-4 py-2 text-sm font-semibold text-gold-light transition-colors hover:bg-gold/10 disabled:opacity-50"
        >
          {bekliyor === "soz" ? <Bekle /> : t.sozGonder}
        </button>
      </div>

      <p className="text-xs text-slate-500">{t.kurulumUyari}</p>

      {mesaj && <p className="text-sm font-medium text-emerald-400">{mesaj}</p>}
      {hata && (
        <p role="alert" className="text-sm font-medium text-red-400">
          {hata}
        </p>
      )}
    </div>
  );
}

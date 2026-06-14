"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.canliAyna;

type Kisi = {
  id: string;
  ad: string;
  selfie: string | null;
  kareler: { aci: string; url: string }[];
  tam: boolean;
  durum: string;
};

const DURUM_METIN: Record<string, string> = {
  yok: t.durumYok,
  bekliyor: t.durumBekliyor,
  uretiliyor: t.durumUretiliyor,
  hazir: t.durumHazir,
  hata: t.durumHata,
};
const DURUM_RENK: Record<string, string> = {
  hazir: "text-emerald-400",
  uretiliyor: "text-gold-light",
  hata: "text-red-400",
};

export default function CanliAynaYonetim({
  kisiler,
  uretimAcik,
}: {
  kisiler: Kisi[];
  uretimAcik: boolean;
}) {
  const router = useRouter();
  const [secili, setSecili] = useState<Set<string>>(new Set());
  const [mesgul, setMesgul] = useState(false);
  const [sonuc, setSonuc] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  function degis(id: string) {
    setSecili((onceki) => {
      const yeni = new Set(onceki);
      if (yeni.has(id)) yeni.delete(id);
      else yeni.add(id);
      return yeni;
    });
  }

  async function uret() {
    if (secili.size === 0 || mesgul) return;
    setMesgul(true);
    setSonuc(null);
    setHata(null);
    try {
      const res = await fetch("/api/admin/karakter-uret", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idler: [...secili] }),
      });
      const veri = (await res.json()) as {
        baslatildi?: number;
        hata?: number;
        girdiYok?: number;
      };
      if (!res.ok) throw new Error();
      setSonuc(t.sonuc(veri.baslatildi ?? 0, veri.hata ?? 0, veri.girdiYok ?? 0));
      setSecili(new Set());
      router.refresh();
    } catch {
      setHata(t.hata);
    } finally {
      setMesgul(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toplu aksiyon çubuğu */}
      <div className="sticky top-16 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-royal/30 bg-midnight-card/80 p-4 backdrop-blur">
        <span className="text-sm text-slate-300">{t.secilenler(secili.size)}</span>
        <button
          onClick={uret}
          disabled={!uretimAcik || secili.size === 0 || mesgul}
          className="btn-kor ml-auto rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-40"
        >
          {mesgul ? t.uretiliyor : t.uret}
        </button>
        {sonuc && <p className="w-full text-sm text-emerald-400">{sonuc}</p>}
        {hata && <p className="w-full text-sm text-red-400">{hata}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {kisiler.map((k) => {
          const secik = secili.has(k.id);
          return (
            <label
              key={k.id}
              className={`flex cursor-pointer gap-3 rounded-2xl border p-3 transition-colors ${
                secik
                  ? "border-gold/60 bg-gold/5"
                  : "border-royal/30 bg-midnight-card/40 hover:border-royal-light/40"
              }`}
            >
              <input
                type="checkbox"
                checked={secik}
                onChange={() => degis(k.id)}
                className="mt-1 h-5 w-5 shrink-0 accent-gold"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-slate-100">{k.ad}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
                      k.tam ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {k.tam ? t.tamRozet : t.eksikRozet}
                  </span>
                </div>
                <div className="mt-2 flex gap-1.5">
                  {k.selfie && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={k.selfie}
                      alt={t.selfie}
                      className="h-14 w-14 rounded-lg object-cover ring-1 ring-royal/40"
                    />
                  )}
                  {k.kareler.map((kare) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={kare.aci}
                      src={kare.url}
                      alt={kare.aci}
                      className="h-14 w-14 rounded-full object-cover ring-2 ring-gold/40"
                    />
                  ))}
                </div>
                <p
                  className={`mt-2 text-xs font-medium ${DURUM_RENK[k.durum] ?? "text-slate-500"}`}
                >
                  {DURUM_METIN[k.durum] ?? k.durum}
                </p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

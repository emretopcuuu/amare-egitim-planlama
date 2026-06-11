"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.program;

type Madde = {
  id: string;
  baslangic: string;
  baslik: string;
  yer: string | null;
  ipucu: string | null;
  acilmaDk: number;
  aciklandi: boolean;
};

function saatYaz(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function ProgramYonetimi({ maddeler }: { maddeler: Madde[] }) {
  const router = useRouter();
  const [baslangic, setBaslangic] = useState("");
  const [baslik, setBaslik] = useState("");
  const [yer, setYer] = useState("");
  const [ipucu, setIpucu] = useState("");
  const [acilmaDk, setAcilmaDk] = useState(60);
  const [bekliyor, setBekliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function ekle(e: React.FormEvent) {
    e.preventDefault();
    if (bekliyor || !baslangic || !baslik.trim()) return;
    setBekliyor(true);
    setHata(null);
    try {
      const res = await fetch("/api/admin/program", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          // datetime-local yerel saattir; ISO'ya çevirip göndeririz
          baslangic: new Date(baslangic).toISOString(),
          baslik,
          yer,
          ipucu,
          acilmaDk,
        }),
      });
      if (!res.ok) {
        const veri = await res.json().catch(() => null);
        setHata(veri?.hata ?? t.hata);
        return;
      }
      setBaslangic("");
      setBaslik("");
      setYer("");
      setIpucu("");
      router.refresh();
    } catch {
      setHata(t.hata);
    } finally {
      setBekliyor(false);
    }
  }

  async function sil(id: string) {
    setHata(null);
    const res = await fetch(`/api/admin/program?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      setHata(t.hata);
      return;
    }
    router.refresh();
  }

  const girisSinif =
    "h-11 w-full rounded-xl border border-royal-light/30 bg-midnight-soft px-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-gold";

  return (
    <div className="space-y-6">
      <form
        onSubmit={ekle}
        className="rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-300">
              {t.zaman}
            </span>
            <input
              type="datetime-local"
              value={baslangic}
              onChange={(e) => setBaslangic(e.target.value)}
              className={girisSinif}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-300">
              {t.etkinlik}
            </span>
            <input
              type="text"
              value={baslik}
              onChange={(e) => setBaslik(e.target.value)}
              maxLength={120}
              className={girisSinif}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-300">
              {t.yer}
            </span>
            <input
              type="text"
              value={yer}
              onChange={(e) => setYer(e.target.value)}
              maxLength={120}
              className={girisSinif}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-300">
              {t.acilmaDk}
            </span>
            <input
              type="number"
              min={0}
              max={720}
              value={acilmaDk}
              onChange={(e) => setAcilmaDk(Number(e.target.value))}
              className={girisSinif}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-slate-300">
              {t.ipucu}
            </span>
            <input
              type="text"
              value={ipucu}
              onChange={(e) => setIpucu(e.target.value)}
              maxLength={200}
              placeholder="Örn: Bu gece yıldızların altında bir şey değişecek…"
              className={girisSinif}
            />
          </label>
        </div>
        {hata && (
          <p role="alert" className="mt-3 text-sm font-medium text-red-400">
            {hata}
          </p>
        )}
        <button
          type="submit"
          disabled={bekliyor || !baslangic || !baslik.trim()}
          className="mt-4 rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-midnight transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-40"
        >
          {bekliyor ? t.ekleniyor : t.ekle}
        </button>
      </form>

      <section className="rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        {maddeler.length === 0 ? (
          <p className="text-sm text-slate-400">{t.bos}</p>
        ) : (
          <ul className="divide-y divide-royal/20">
            {maddeler.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-100">
                    <span className="mr-2 font-mono text-royal-light">
                      {saatYaz(m.baslangic)}
                    </span>
                    {m.baslik}
                    {m.yer && <span className="text-slate-400"> · 📍 {m.yer}</span>}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {m.ipucu && <>“{m.ipucu}” · </>}
                    {m.acilmaDk} dk önce
                    {m.aciklandi && (
                      <span className="ml-1 text-emerald-400">· {t.aciklandi} ✓</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => sil(m.id)}
                  className="shrink-0 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                >
                  {t.sil}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

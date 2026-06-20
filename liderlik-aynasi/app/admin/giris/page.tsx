"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";

export default function AdminGirisPage() {
  const router = useRouter();
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (yukleniyor || !sifre) return;
    setYukleniyor(true);
    setHata(null);
    try {
      const res = await fetch("/api/admin/giris", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sifre }),
      });
      const veri = await res.json().catch(() => null);
      if (!res.ok) {
        setHata(veri?.hata ?? tr.giris.hataSunucu);
        return;
      }
      router.replace("/admin");
    } catch {
      setHata(tr.giris.hataSunucu);
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm kart-3d rounded-2xl bg-midnight-card/60 p-8 shadow-2xl ring-1 ring-royal/30 backdrop-blur">
        <h1 className="text-center text-2xl font-bold tracking-tight text-gold">
          {tr.adminGiris.baslik}
        </h1>

        <form className="mt-8 space-y-6" onSubmit={submit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">
              {tr.adminGiris.sifreEtiket}
            </span>
            <input
              type="password"
              value={sifre}
              onChange={(e) => {
                setSifre(e.target.value);
                setHata(null);
              }}
              autoFocus
              className="h-12 w-full rounded-xl border-2 border-royal-light/40 bg-midnight-card px-4 text-slate-100 outline-none transition-colors focus:border-gold"
            />
          </label>

          {hata && (
            <p role="alert" className="text-center text-sm font-medium text-red-400">
              {hata}
            </p>
          )}

          <button
            type="submit"
            disabled={!sifre || yukleniyor}
            className="h-12 w-full btn-3d rounded-xl bg-gold font-semibold text-[#1a1206] transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-40"
          >
            {yukleniyor ? tr.giris.girisYapiliyor : tr.adminGiris.girisYap}
          </button>
        </form>

        <p className="mt-6 text-center">
          <Link
            href="/giris"
            className="text-xs text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
          >
            {tr.adminGiris.katilimciGirisi}
          </Link>
        </p>
      </div>
    </main>
  );
}

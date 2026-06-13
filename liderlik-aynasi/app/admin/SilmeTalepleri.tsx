"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.kvkk;

type Talep = { id: string; ad: string; takim: string | null; tarih: string };

export default function SilmeTalepleri({ talepler }: { talepler: Talep[] }) {
  const router = useRouter();
  const [siliniyor, setSiliniyor] = useState<string | null>(null);
  const [onay, setOnay] = useState<string | null>(null);
  const [hata, setHata] = useState(false);

  if (talepler.length === 0) {
    return <p className="mt-3 text-sm text-slate-400">{t.adminYok}</p>;
  }

  async function sil(id: string) {
    setSiliniyor(id);
    setHata(false);
    try {
      const res = await fetch("/api/admin/veri-sil", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        setHata(true);
        return;
      }
      router.refresh();
    } catch {
      setHata(true);
    } finally {
      setSiliniyor(null);
    }
  }

  return (
    <div className="mt-3">
      {hata && <p className="mb-2 text-sm font-medium text-red-400">{t.hata}</p>}
      <ul className="space-y-2">
        {talepler.map((kisi) => (
          <li
            key={kisi.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-red-400/20 bg-red-950/10 px-4 py-2.5"
          >
            <span className="min-w-0">
              <span className="text-sm font-medium text-slate-100">{kisi.ad}</span>
              {kisi.takim && (
                <span className="ml-2 text-xs text-slate-400">{kisi.takim}</span>
              )}
              <span className="ml-2 text-xs text-slate-500">{kisi.tarih}</span>
            </span>
            <button
              onClick={() => {
                if (onay !== kisi.id) {
                  setOnay(kisi.id);
                  setTimeout(() => setOnay((o) => (o === kisi.id ? null : o)), 4000);
                  return;
                }
                setOnay(null);
                void sil(kisi.id);
              }}
              disabled={siliniyor !== null}
              className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
            >
              {siliniyor === kisi.id
                ? t.adminSiliniyor
                : onay === kisi.id
                  ? "Emin misin?"
                  : t.adminSil}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

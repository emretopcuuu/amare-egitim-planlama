"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { tost } from "@/lib/tost";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.eslestirme;

type Satir = {
  id: string;
  a: { id: string; full_name: string };
  b: { id: string; full_name: string };
};

export default function DislaymaListesi({
  kisiler,
}: {
  kisiler: { id: string; ad: string }[];
}) {
  const router = useRouter();
  const [satirlar, setSatirlar] = useState<Satir[]>([]);
  const [yuklendi, setYuklendi] = useState(false);
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  const [mesgul, setMesgul] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/dislama")
      .then((r) => r.json())
      .then((v) => {
        if (v?.satirlar) setSatirlar(v.satirlar as Satir[]);
      })
      .finally(() => setYuklendi(true));
  }, []);

  async function ekle() {
    if (!aId || !bId || aId === bId || mesgul) return;
    setMesgul(true);
    try {
      const res = await fetch("/api/admin/dislama", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ aId, bId }),
      });
      const v = await res.json().catch(() => null);
      if (!res.ok) {
        tost(v?.hata ?? t.dislamaHata, "hata");
        return;
      }
      tost(t.dislamaEklendi, "basari");
      setAId("");
      setBId("");
      // Listeyi yenile
      const r2 = await fetch("/api/admin/dislama");
      const v2 = await r2.json().catch(() => null);
      if (v2?.satirlar) setSatirlar(v2.satirlar as Satir[]);
      router.refresh();
    } catch {
      tost(t.dislamaHata, "hata");
    } finally {
      setMesgul(false);
    }
  }

  async function kaldir(id: string) {
    if (mesgul) return;
    setMesgul(true);
    try {
      const res = await fetch("/api/admin/dislama", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        tost(t.dislamaHata, "hata");
        return;
      }
      setSatirlar((prev) => prev.filter((s) => s.id !== id));
      tost(t.dislamaKaldirildi, "basari");
      router.refresh();
    } catch {
      tost(t.dislamaHata, "hata");
    } finally {
      setMesgul(false);
    }
  }

  const secSinif =
    "h-9 flex-1 min-w-0 rounded-lg border border-royal-light/30 bg-midnight-soft px-2 text-sm text-slate-100 outline-none focus:border-gold";

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">{t.dislamaAciklama}</p>

      {/* Yeni çift ekle */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-1 min-w-0 flex-col gap-1">
          <span className="text-xs text-slate-400">{t.kisiBir}</span>
          <select value={aId} onChange={(e) => setAId(e.target.value)} className={secSinif}>
            <option value="">— seç —</option>
            {kisiler
              .filter((k) => k.id !== bId)
              .map((k) => (
                <option key={k.id} value={k.id}>
                  {k.ad}
                </option>
              ))}
          </select>
        </div>
        <span className="pb-2 text-slate-500">↔</span>
        <div className="flex flex-1 min-w-0 flex-col gap-1">
          <span className="text-xs text-slate-400">{t.kisiIki}</span>
          <select value={bId} onChange={(e) => setBId(e.target.value)} className={secSinif}>
            <option value="">— seç —</option>
            {kisiler
              .filter((k) => k.id !== aId)
              .map((k) => (
                <option key={k.id} value={k.id}>
                  {k.ad}
                </option>
              ))}
          </select>
        </div>
        <button
          onClick={() => void ekle()}
          disabled={!aId || !bId || aId === bId || mesgul}
          className="h-9 rounded-lg bg-royal/70 px-4 text-sm font-semibold text-white transition-colors hover:bg-royal disabled:opacity-40"
        >
          {t.dislamaEkle}
        </button>
      </div>

      {/* Mevcut liste */}
      {!yuklendi ? (
        <p className="text-xs text-slate-500">Yükleniyor…</p>
      ) : satirlar.length === 0 ? (
        <p className="text-sm text-slate-500">{t.dislamaYok}</p>
      ) : (
        <ul className="space-y-1.5">
          {satirlar.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-red-500/15 bg-red-500/5 px-3 py-2"
            >
              <span className="text-sm text-slate-200">
                <span className="font-medium">{s.a.full_name}</span>
                <span className="mx-2 text-slate-500">↔</span>
                <span className="font-medium">{s.b.full_name}</span>
              </span>
              <button
                onClick={() => void kaldir(s.id)}
                disabled={mesgul}
                className="shrink-0 rounded px-2 py-0.5 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-40"
              >
                {t.dislamaKaldir}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

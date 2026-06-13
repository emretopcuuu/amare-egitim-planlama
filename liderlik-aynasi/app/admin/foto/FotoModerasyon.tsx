"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.fotoModerasyon;

type Foto = { id: string; url: string | null; caption: string | null; gonderen: string };

export default function FotoModerasyon({ fotolar }: { fotolar: Foto[] }) {
  const router = useRouter();
  const [mesgul, setMesgul] = useState<string | null>(null);
  const [hata, setHata] = useState(false);

  if (fotolar.length === 0) {
    return <p className="text-sm text-slate-400">{t.yok}</p>;
  }

  async function eylem(id: string, e: "onayla" | "gizle") {
    setMesgul(`${id}:${e}`);
    setHata(false);
    try {
      const res = await fetch("/api/admin/foto", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, eylem: e }),
      });
      if (!res.ok) {
        setHata(true);
        return;
      }
      router.refresh();
    } catch {
      setHata(true);
    } finally {
      setMesgul(null);
    }
  }

  return (
    <div>
      {hata && <p className="mb-3 text-sm font-medium text-red-400">{t.hata}</p>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {fotolar.map((f) => (
          <div
            key={f.id}
            className="kart-3d overflow-hidden rounded-2xl bg-midnight-card/60 ring-1 ring-royal/30"
          >
            {f.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.url} alt="" className="aspect-square w-full object-cover" />
            )}
            <div className="p-3">
              <p className="truncate text-xs text-slate-400">{f.gonderen}</p>
              {f.caption && (
                <p className="mt-1 line-clamp-2 text-sm text-slate-100">{f.caption}</p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => eylem(f.id, "onayla")}
                  disabled={mesgul !== null}
                  className="flex-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                >
                  {mesgul === `${f.id}:onayla` ? t.calisiyor : t.onayla}
                </button>
                <button
                  onClick={() => eylem(f.id, "gizle")}
                  disabled={mesgul !== null}
                  className="flex-1 rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-semibold text-red-300 transition-colors hover:bg-red-400/10 disabled:opacity-50"
                >
                  {mesgul === `${f.id}:gizle` ? t.calisiyor : t.gizle}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

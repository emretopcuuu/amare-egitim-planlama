"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Bekleyen = { id: string; ad: string; tarih: string | null };

export default function SesKlonPanel({
  bekleyen,
  klonlandi,
  apiAcik,
}: {
  bekleyen: Bekleyen[];
  klonlandi: number;
  apiAcik: boolean;
}) {
  const router = useRouter();
  const [yukleniyor, setYukleniyor] = useState(false);
  const [tekYukleniyor, setTekYukleniyor] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<string | null>(null);

  if (!bekleyen.length && klonlandi === 0) return null;

  async function klonlaHepsi() {
    setYukleniyor(true);
    setSonuc(null);
    try {
      const res = await fetch("/api/admin/ses-klonla", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const veri = await res.json().catch(() => null);
      if (!res.ok) { setSonuc(`Hata: ${veri?.hata ?? "bilinmiyor"}`); return; }
      const hataMesaj = veri.hatalar?.length ? ` | Hata: ${veri.hatalar.join(", ")}` : "";
      setSonuc(`${veri.tamam} klonlandı, ${veri.atlanan} atlandı${hataMesaj}`);
      router.refresh();
    } catch { setSonuc("Ağ hatası"); }
    finally { setYukleniyor(false); }
  }

  async function klonlaTek(id: string) {
    setTekYukleniyor(id);
    setSonuc(null);
    try {
      const res = await fetch("/api/admin/ses-klonla", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ participantId: id }) });
      const veri = await res.json().catch(() => null);
      if (!res.ok) { setSonuc(`Hata: ${veri?.hata ?? "bilinmiyor"}`); return; }
      const hataMesaj = veri.hatalar?.length ? ` — ${veri.hatalar[0]}` : "";
      setSonuc(veri.tamam > 0 ? `Klonlandı ✓${hataMesaj}` : `Başarısız${hataMesaj}`);
      router.refresh();
    } catch { setSonuc("Ağ hatası"); }
    finally { setTekYukleniyor(null); }
  }

  return (
    <div className="rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-semibold text-slate-100">Ses Klonlama</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Klonlandı: <span className="text-emerald-300 font-medium">{klonlandi}</span>
            {bekleyen.length > 0 && (
              <> · Bekliyor: <span className="text-amber-300 font-medium">{bekleyen.length}</span></>
            )}
            {!apiAcik && (
              <> · <span className="text-rose-400">ELEVENLABS_API_KEY eksik</span></>
            )}
          </p>
        </div>
        {bekleyen.length > 0 && apiAcik && (
          <button
            type="button"
            onClick={klonlaHepsi}
            disabled={yukleniyor}
            className="shrink-0 rounded-xl bg-gold/90 px-4 py-2 text-sm font-semibold text-midnight transition hover:bg-gold disabled:opacity-50"
          >
            {yukleniyor ? "Klonlanıyor…" : `Hepsini Klonla (${bekleyen.length})`}
          </button>
        )}
      </div>

      {sonuc && (
        <p className="rounded-xl bg-white/5 px-4 py-2 text-sm text-slate-200">
          {sonuc}
        </p>
      )}

      {bekleyen.length > 0 && (
        <ul className="space-y-2">
          {bekleyen.map((b) => (
            <li key={b.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/10">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-200">{b.ad}</p>
                {b.tarih && (
                  <p className="text-xs text-slate-500">
                    {new Date(b.tarih).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                )}
              </div>
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-300">
                Bekliyor
              </span>
              {apiAcik && (
                <button
                  type="button"
                  disabled={tekYukleniyor === b.id || yukleniyor}
                  onClick={() => klonlaTek(b.id)}
                  className="shrink-0 rounded-lg bg-royal/80 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-royal disabled:opacity-40"
                >
                  {tekYukleniyor === b.id ? "…" : "Klonla"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

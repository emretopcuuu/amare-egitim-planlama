"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { tost } from "@/lib/tost";

const t = tr.admin.eslestirme;

export type Kisi = { id: string; ad: string; takim: string | null };
export type Atama = {
  observerId: string;
  observerAd: string;
  observerTakim: string | null;
  targetId: string;
  targetAd: string;
  targetTakim: string | null;
};

type Satir = {
  id: string;
  ad: string;
  takim: string | null;
  hedefler: { id: string; ad: string; takim: string | null; ici: boolean }[];
};

// Atamaları gözlemciye göre grupla; her hedefe grup-içi/dışı işareti koy.
function gruplaSatir(atamalar: Atama[]): Satir[] {
  const harita = new Map<string, Satir>();
  for (const a of atamalar) {
    const s =
      harita.get(a.observerId) ??
      ({ id: a.observerId, ad: a.observerAd, takim: a.observerTakim, hedefler: [] } as Satir);
    s.hedefler.push({
      id: a.targetId,
      ad: a.targetAd,
      takim: a.targetTakim,
      ici: !!a.observerTakim && a.observerTakim === a.targetTakim,
    });
    harita.set(a.observerId, s);
  }
  return [...harita.values()].sort((x, y) => x.ad.localeCompare(y.ad, "tr-TR"));
}

// #Eşleştirme elle düzenleme: admin beğenmediği bir gözlem hedefini tek tıkla
// başka uygun kişiyle takas eder (tüm eşleştirmeyi yeniden çalıştırmadan).
export default function AtamaDuzenle({
  kisiler,
  atamalar,
}: {
  kisiler: Kisi[];
  atamalar: Atama[];
}) {
  const router = useRouter();
  const [satirlar, setSatirlar] = useState<Satir[]>(() => gruplaSatir(atamalar));
  // Düzenleme açık olan hedef: "observerId|targetId"
  const [acik, setAcik] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);

  async function degistir(observerId: string, eskiTargetId: string, yeniTargetId: string) {
    if (mesgul) return;
    setMesgul(true);
    try {
      const res = await fetch("/api/admin/eslestirme-duzenle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ observerId, eskiTargetId, yeniTargetId }),
      });
      const v = (await res.json().catch(() => null)) as { hata?: string } | null;
      if (!res.ok) {
        tost(v?.hata ?? t.degisHata, "hata");
        return;
      }
      // Yerel durumu güncelle (sayfayı tazelemeden)
      const yeni = kisiler.find((k) => k.id === yeniTargetId)!;
      setSatirlar((prev) =>
        prev.map((s) =>
          s.id !== observerId
            ? s
            : {
                ...s,
                hedefler: s.hedefler.map((h) =>
                  h.id !== eskiTargetId
                    ? h
                    : { id: yeni.id, ad: yeni.ad, takim: yeni.takim, ici: s.takim === yeni.takim }
                ),
              }
        )
      );
      setAcik(null);
      tost(t.degisti, "basari");
      router.refresh();
    } catch {
      tost(t.degisHata, "hata");
    } finally {
      setMesgul(false);
    }
  }

  if (satirlar.length === 0) {
    return <p className="mt-3 text-sm text-slate-400">{t.atamaYok}</p>;
  }

  return (
    <div className="mt-3">
      <p className="mb-3 text-xs text-slate-400">{t.duzenleAcikla}</p>
      <div className="space-y-3">
        {satirlar.map((s) => (
          <div
            key={s.id}
            className="rounded-xl border border-royal/20 bg-midnight-soft/40 p-3"
          >
            <p className="text-sm font-semibold text-slate-100">
              {s.ad}
              {s.takim && <span className="ml-2 text-xs text-slate-400">{s.takim}</span>}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {s.hedefler.map((h) => {
                const anahtar = `${s.id}|${h.id}`;
                const duzenleniyor = acik === anahtar;
                // Uygun yeni hedefler: kendisi değil + bu gözlemcinin mevcut hedefleri değil
                const mevcutIdler = new Set(s.hedefler.map((x) => x.id));
                const secenekler = kisiler.filter(
                  (k) => k.id !== s.id && (!mevcutIdler.has(k.id) || k.id === h.id)
                );
                return (
                  <div key={h.id} className="relative">
                    {duzenleniyor ? (
                      <div className="flex items-center gap-1.5 rounded-lg border border-gold/40 bg-midnight-card p-1.5">
                        <select
                          autoFocus
                          defaultValue=""
                          disabled={mesgul}
                          onChange={(e) =>
                            e.target.value && degistir(s.id, h.id, e.target.value)
                          }
                          className="h-8 rounded-md border border-royal-light/30 bg-midnight-soft px-2 text-xs text-slate-100 outline-none focus:border-gold"
                        >
                          <option value="">{t.yeniHedefSec}</option>
                          {secenekler
                            .filter((k) => k.id !== h.id)
                            .sort((a, b) => a.ad.localeCompare(b.ad, "tr-TR"))
                            .map((k) => (
                              <option key={k.id} value={k.id}>
                                {k.ad}
                                {k.takim ? ` · ${k.takim}` : ""}
                              </option>
                            ))}
                        </select>
                        <button
                          onClick={() => setAcik(null)}
                          className="px-1 text-xs text-slate-400 hover:text-slate-200"
                        >
                          {t.degisVazgec}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAcik(anahtar)}
                        title={t.hedefDegistir(h.ad)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors hover:border-gold/50 ${
                          h.ici
                            ? "border-amber-400/25 bg-amber-400/5 text-slate-200"
                            : "border-emerald-400/25 bg-emerald-400/5 text-slate-200"
                        }`}
                      >
                        <span aria-hidden>{h.ici ? "🤝" : "🌍"}</span>
                        <span>{h.ad}</span>
                        {h.takim && <span className="text-slate-500">· {h.takim}</span>}
                        <span className="ml-0.5 text-slate-500" aria-hidden>
                          ✎
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

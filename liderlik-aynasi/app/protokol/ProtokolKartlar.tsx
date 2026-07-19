"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { titret, cal } from "@/lib/his";
import type { ProtokolKart } from "@/lib/protokolMotor";

// 90 GÜN PROTOKOLÜ — pratik kartları. Her kart: bugün yapıldı işaretle +
// "bana göre değil" ile kapat (gönüllülük). İyimser UI, sunucu doğrular.
export default function ProtokolKartlar({ kartlar }: { kartlar: ProtokolKart[] }) {
  const router = useRouter();
  const [durum, setDurum] = useState<Record<string, { yapildi: boolean; kapali: boolean }>>(
    Object.fromEntries(kartlar.map((k) => [k.pratik.kod, { yapildi: k.bugunYapildi, kapali: false }]))
  );
  const [mesgul, setMesgul] = useState<string | null>(null);

  async function gonder(kod: string, aksiyon: "yapildi" | "kapat") {
    setMesgul(kod + aksiyon);
    try {
      const r = await fetch("/api/protokol", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ aksiyon, kod }),
      });
      if (r.ok) {
        titret([12, 30, 12]);
        if (aksiyon === "yapildi") cal("kazanim");
        setDurum((d) => ({
          ...d,
          [kod]: { yapildi: aksiyon === "yapildi" ? true : d[kod]?.yapildi ?? false, kapali: aksiyon === "kapat" },
        }));
        if (aksiyon === "kapat") router.refresh();
      }
    } finally {
      setMesgul(null);
    }
  }

  return (
    <div className="space-y-3">
      {kartlar.map((k) => {
        const d = durum[k.pratik.kod];
        if (d?.kapali) return null;
        return (
          <section
            key={k.pratik.kod}
            className={`rounded-2xl border p-4 ${
              k.cekirdek ? "border-gold/30 bg-gold/[0.05]" : "border-royal/25 bg-midnight-card/40"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-semibold text-slate-100">
                  {k.pratik.ikon} {k.pratik.ad}
                </p>
                <p className="mt-0.5 text-sm leading-snug text-slate-300">{k.pratik.ozet}</p>
              </div>
              {k.toplam > 0 && (
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                  {k.toplam} gün
                </span>
              )}
            </div>
            <p className="mt-2 rounded-lg bg-black/20 px-3 py-2 text-xs leading-relaxed text-slate-400">
              <span className="text-gold-light/80">Neden sende: </span>
              {k.pratik.nedenSende}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => gonder(k.pratik.kod, "yapildi")}
                disabled={d?.yapildi || mesgul === k.pratik.kod + "yapildi"}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  d?.yapildi
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-gold px-4 text-[#1a1206] hover:bg-gold-light"
                }`}
              >
                {d?.yapildi ? "✓ Bugün yapıldı" : "Bugün yaptım"}
              </button>
              <button
                onClick={() => gonder(k.pratik.kod, "kapat")}
                disabled={mesgul === k.pratik.kod + "kapat"}
                className="rounded-xl border border-royal/30 px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
              >
                Bana göre değil
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}

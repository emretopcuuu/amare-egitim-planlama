"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Teslim = { id: string; ad: string; urun: string; tutar: number; created_at: string };

async function post(body: unknown) {
  const r = await fetch("/api/admin/market", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.ok;
}

export default function MarketAdmin({ acik, teslimler }: { acik: boolean; teslimler: Teslim[] }) {
  const router = useRouter();
  const [acikDurum, setAcikDurum] = useState(acik);
  const [mesgul, setMesgul] = useState(false);

  async function bayrak(yeni: boolean) {
    setMesgul(true);
    if (await post({ eylem: "bayrak", acik: yeni })) setAcikDurum(yeni);
    setMesgul(false);
    router.refresh();
  }

  async function teslim(id: string) {
    setMesgul(true);
    if (await post({ eylem: "teslim", islemId: id })) router.refresh();
    setMesgul(false);
  }

  return (
    <div className="space-y-6">
      {/* Bayrak */}
      <section className="flex items-center justify-between rounded-2xl border border-royal/30 bg-midnight-card/40 p-5">
        <div>
          <p className="font-semibold text-slate-100">Market {acikDurum ? "AÇIK" : "kapalı"}</p>
          <p className="text-xs text-slate-500">
            Kapalıyken katılımcılar "yakında" görür. Kamp günü aç (senaryo satırı da açabilir).
          </p>
        </div>
        <button
          onClick={() => bayrak(!acikDurum)}
          disabled={mesgul}
          className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50 ${
            acikDurum ? "border border-royal/40 text-slate-300" : "btn-kor"
          }`}
        >
          {acikDurum ? "Kapat" : "Aç"}
        </button>
      </section>

      {/* Prestij teslim listesi */}
      <section>
        <h2 className="mb-2 font-display text-lg font-bold text-gold-light">🏛️ Teslim edilecekler (prestij)</h2>
        {teslimler.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-midnight-card/40 p-4 text-sm text-slate-500">
            Bekleyen prestij teslimi yok.
          </p>
        ) : (
          <ul className="space-y-2">
            {teslimler.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-gold/25 bg-gold/[0.05] p-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-100">{t.ad}</p>
                  <p className="text-xs text-slate-400">
                    {t.urun} · {t.tutar}⚡ ·{" "}
                    {new Date(t.created_at).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}
                  </p>
                </div>
                <button
                  onClick={() => teslim(t.id)}
                  disabled={mesgul}
                  className="btn-kor shrink-0 rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-50"
                >
                  ✓ Teslim ettim
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

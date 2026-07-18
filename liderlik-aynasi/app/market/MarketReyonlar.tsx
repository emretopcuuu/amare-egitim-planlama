"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sesCal } from "@/lib/sesEfekti";
import { REYON_BASLIK, type MarketUrun, type Reyon } from "@/lib/marketKatalog";

// G1 — market reyonları + satın alma. Cüzdanı yerelde iyimser günceller, sonra
// router.refresh ile sunucudan doğrular. Seçenekli üründe (elmas rengi) varyant sorar.
export default function MarketReyonlar({
  cuzdan: cuzdanBaslangic,
  urunler,
  reyonlar,
  kisiler = [],
}: {
  cuzdan: number;
  urunler: MarketUrun[];
  reyonlar: Reyon[];
  kisiler?: { id: string; ad: string }[];
}) {
  const router = useRouter();
  const [cuzdan, setCuzdan] = useState(cuzdanBaslangic);
  const [mesgul, setMesgul] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [varyantSecim, setVaryantSecim] = useState<MarketUrun | null>(null);
  const [hediyeSecim, setHediyeSecim] = useState<MarketUrun | null>(null); // C3 alıcı seçimi

  async function al(urun: MarketUrun, varyant?: string, aliciId?: string) {
    if (urun.varyantlar && urun.varyantlar.length > 0 && !varyant) {
      setVaryantSecim(urun);
      return;
    }
    // C3 — hediye ürünü: önce alıcı seç.
    if (urun.hediye && !aliciId) {
      setHediyeSecim(urun);
      return;
    }
    setMesgul(urun.kod);
    setHata(null);
    try {
      const r = await fetch("/api/market", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kod: urun.kod, varyant, aliciId }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; cuzdan?: number; hata?: string };
      if (r.ok && j.ok) {
        sesCal("kart-ac");
        if (typeof j.cuzdan === "number") setCuzdan(j.cuzdan);
        setVaryantSecim(null);
        setHediyeSecim(null);
        router.refresh();
      } else {
        setHata(j.hata ?? "Satın alınamadı.");
      }
    } catch {
      setHata("Ağ hatası.");
    } finally {
      setMesgul(null);
    }
  }

  return (
    <div className="space-y-5">
      {hata && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200">{hata}</div>
      )}

      {reyonlar.map((reyon) => {
        const grup = urunler.filter((u) => u.reyon === reyon);
        if (grup.length === 0) return null;
        const meta = REYON_BASLIK[reyon];
        return (
          <section key={reyon}>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              {meta.ikon} {meta.ad}
            </p>
            <div className="space-y-2">
              {grup.map((urun) => {
                const alinabilir = cuzdan >= urun.fiyat;
                return (
                  <div
                    key={urun.kod}
                    className={`rounded-2xl border p-3.5 ${
                      urun.fiziksel ? "border-gold/30 bg-gold/[0.05]" : "border-royal/25 bg-midnight-card/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100">
                          {urun.ad}
                          {urun.fiziksel && <span className="ml-1.5 text-[0.6rem] font-bold uppercase text-gold-light">prestij</span>}
                        </p>
                        <p className="mt-0.5 text-xs leading-snug text-slate-400">{urun.aciklama}</p>
                      </div>
                      <button
                        onClick={() => al(urun)}
                        disabled={!alinabilir || mesgul === urun.kod}
                        className={`shrink-0 rounded-xl px-3 py-2 text-sm font-bold transition-colors disabled:opacity-40 ${
                          alinabilir ? "btn-kor" : "border border-royal/30 text-slate-500"
                        }`}
                      >
                        {mesgul === urun.kod ? "…" : `${urun.fiyat}⚡`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* C3 — Hediye alıcısı seçim çekmecesi */}
      {hediyeSecim && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4" onClick={() => setHediyeSecim(null)}>
          <div className="w-full max-w-md rounded-3xl border border-royal/40 bg-midnight-card p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-gold-light">{hediyeSecim.ad} — kime?</p>
            <p className="mt-1 text-xs text-slate-400">{hediyeSecim.aciklama}</p>
            <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto">
              {kisiler.map((k) => (
                <button
                  key={k.id}
                  onClick={() => al(hediyeSecim, undefined, k.id)}
                  disabled={mesgul === hediyeSecim.kod}
                  className="block w-full rounded-xl border border-royal/25 bg-midnight-card/40 px-3 py-2 text-left text-sm text-slate-100 hover:border-gold disabled:opacity-50"
                >
                  {k.ad}
                </button>
              ))}
              {kisiler.length === 0 && (
                <p className="text-center text-xs text-slate-500">Gönderilecek kişi bulunamadı.</p>
              )}
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">{hediyeSecim.fiyat}⚡ · cüzdan {cuzdan}</p>
          </div>
        </div>
      )}

      {/* Varyant (elmas rengi) seçim çekmecesi */}
      {varyantSecim?.varyantlar && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4" onClick={() => setVaryantSecim(null)}>
          <div className="w-full max-w-md rounded-3xl border border-royal/40 bg-midnight-card p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-gold-light">{varyantSecim.ad} — bir renk seç</p>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {varyantSecim.varyantlar.map((v) => (
                <button
                  key={v.kod}
                  onClick={() => al(varyantSecim, v.kod)}
                  disabled={mesgul === varyantSecim.kod}
                  className="flex flex-col items-center gap-1 rounded-xl border border-royal/30 p-2 hover:border-gold disabled:opacity-50"
                >
                  <span
                    className="h-8 w-8 rounded-full"
                    style={{ background: v.renk ? `rgb(${v.renk})` : "#888", boxShadow: v.renk ? `0 0 12px rgba(${v.renk},0.7)` : undefined }}
                  />
                  <span className="text-[0.6rem] text-slate-300">{v.ad}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">{varyantSecim.fiyat}⚡ · cüzdan {cuzdan}</p>
          </div>
        </div>
      )}
    </div>
  );
}

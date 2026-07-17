import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { marketAcikMi, cuzdanBakiye, marketGecmisi } from "@/lib/market";
import { SATISTAKI_URUNLER, REYON_BASLIK, type Reyon } from "@/lib/marketKatalog";
import MarketReyonlar from "./MarketReyonlar";

export const metadata = { title: "Market — Liderlik Aynası" };
export const dynamic = "force-dynamic";

// G1 — Kıvılcım Marketi. Cüzdan bakiyesi + 5 reyon + geçmiş. Market kapalıyken
// (varsayılan) nazik "yakında" ekranı. Harcama kazancı/unvanı düşürmez.
export default async function MarketPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const acik = await marketAcikMi(db);

  if (!acik) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
        <p className="text-5xl">🏪</p>
        <h1 className="prizma-serif ay-metin mt-4 text-2xl font-semibold">Market yakında</h1>
        <p className="mt-2 max-w-sm text-slate-400">
          Kıvılcımlarını harcayabileceğin market kamp başlayınca açılır. Şimdilik biriktirmeye devam.
        </p>
        <Link href="/" className="mt-6 text-sm text-royal-light underline-offset-4 hover:underline">
          Ana sayfaya dön
        </Link>
      </main>
    );
  }

  const [bakiye, gecmis] = await Promise.all([cuzdanBakiye(db, session.sub), marketGecmisi(db, session.sub)]);
  const reyonlar = Object.keys(REYON_BASLIK) as Reyon[];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 p-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display altin-metin text-2xl font-bold">🏪 Market</h1>
          <p className="text-xs text-slate-500">Harcamak kazancını/unvanını düşürmez.</p>
        </div>
        <Link href="/" className="text-sm text-slate-400 hover:text-gold-light">
          ✕
        </Link>
      </header>

      {/* Çift cüzdan görünümü */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-gold/30 bg-gold/[0.06] p-4 text-center">
          <div className="font-display text-3xl font-bold text-gold-light">{bakiye.cuzdan}</div>
          <div className="text-xs text-slate-400">harcanabilir cüzdan</div>
        </div>
        <div className="rounded-2xl border border-royal/30 bg-midnight-card/40 p-4 text-center">
          <div className="font-display text-3xl font-bold text-slate-200">{bakiye.toplam}</div>
          <div className="text-xs text-slate-400">toplam kazanç (unvan)</div>
        </div>
      </div>

      <MarketReyonlar
        cuzdan={bakiye.cuzdan}
        urunler={SATISTAKI_URUNLER}
        reyonlar={reyonlar}
      />

      {gecmis.length > 0 && (
        <section className="rounded-2xl border border-royal/20 bg-midnight-card/30 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Aldıkların</p>
          <ul className="mt-2 space-y-1.5">
            {gecmis.map((g, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">
                  {g.ad}
                  {g.fiziksel && <span className="ml-1 text-xs text-gold-light">· teslim bekliyor</span>}
                </span>
                <span className="text-slate-500">−{g.tutar}⚡</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

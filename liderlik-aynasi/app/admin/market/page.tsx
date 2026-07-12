import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { teslimBekleyenler, marketAcikMi } from "@/lib/market";
import MarketAdmin from "./MarketAdmin";

export const metadata = { title: "Market — Yönetim" };
export const dynamic = "force-dynamic";

// G1 — market yönetimi: bayrağı aç/kapat + prestij (fiziksel) teslim listesi.
export default async function AdminMarketPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [acik, teslimler] = await Promise.all([marketAcikMi(db), teslimBekleyenler(db)]);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">🏪 Market Yönetimi</h1>
        <p className="mt-1 text-sm text-slate-400">
          Market bayrağı ve prestij (fiziksel) ürün teslim listesi. Harcama kimsenin unvanını/takım
          skorunu düşürmez — cüzdan ayrı, kazanç ayrı.
        </p>
      </div>
      <MarketAdmin acik={acik} teslimler={teslimler} />
    </main>
  );
}

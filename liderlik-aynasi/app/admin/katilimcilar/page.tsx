import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import KatilimciAraclari from "./KatilimciAraclari";

export const metadata = { title: "Katılımcılar — Liderlik Aynası" };

export default async function KatilimcilarPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const { data: kisiler, error } = await supabaseAdmin()
    .from("participants")
    .select("id, full_name, team, city, phone, login_code")
    .eq("role", "participant")
    .order("full_name");
  if (error) throw error;

  const t = tr.admin.katilimcilar;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gold">{t.baslik}</h1>

      <KatilimciAraclari />

      <section className="rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 className="text-lg font-semibold text-gold-light">
          {t.toplam(kisiler.length)}
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-royal/30 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-3">{t.tablo.ad}</th>
                <th className="py-2 pr-3">{t.tablo.takim}</th>
                <th className="py-2 pr-3">{t.tablo.sehir}</th>
                <th className="py-2 pr-3">{t.tablo.telefon}</th>
                <th className="py-2">{t.tablo.kod}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-royal/20">
              {kisiler.map((k) => (
                <tr key={k.id}>
                  <td className="py-2 pr-3 font-medium text-slate-100">
                    {k.full_name}
                  </td>
                  <td className="py-2 pr-3 text-slate-400">{k.team ?? "—"}</td>
                  <td className="py-2 pr-3 text-slate-400">{k.city ?? "—"}</td>
                  <td className="py-2 pr-3 text-slate-400">{k.phone ?? "—"}</td>
                  <td className="py-2 font-mono font-semibold text-gold-light">
                    {k.login_code}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

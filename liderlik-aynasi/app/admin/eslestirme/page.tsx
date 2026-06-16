import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import EslestirmeFormu from "./EslestirmeFormu";
import Ipucu from "../Ipucu";

export const metadata = { title: "Eşleştirme — Liderlik Aynası" };

export default async function EslestirmePage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const { data: atamalar, error } = await supabaseAdmin()
    .from("assignments")
    .select(
      "id, type, observer:participants!assignments_observer_id_fkey(id, full_name, team), target:participants!assignments_target_id_fkey(full_name, team)"
    )
    .order("type");
  if (error) throw error;

  const t = tr.admin.eslestirme;

  // Gözlemciye göre grupla; hedefleri grup-içi (aynı takım) / grup-dışı olarak ayır.
  const gruplar = new Map<
    string,
    { ad: string; ici: string[]; disi: string[] }
  >();
  for (const a of atamalar) {
    const grup = gruplar.get(a.observer.id) ?? {
      ad: a.observer.full_name,
      ici: [],
      disi: [],
    };
    const hedefAd = a.target.team
      ? `${a.target.full_name} (${a.target.team})`
      : a.target.full_name;
    const ayniTakim =
      !!a.observer.team && !!a.target.team && a.observer.team === a.target.team;
    (ayniTakim ? grup.ici : grup.disi).push(hedefAd);
    gruplar.set(a.observer.id, grup);
  }
  const satirlar = [...gruplar.values()].sort((a, b) =>
    a.ad.localeCompare(b.ad, "tr-TR")
  );

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-gold">{t.baslik}</h1>
        <Ipucu {...tr.admin.yardim.eslestirme} />
      </div>

      <EslestirmeFormu />

      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 className="text-lg font-semibold text-gold-light">{t.mevcutBaslik}</h2>
        {satirlar.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">{t.atamaYok}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="cizgili w-full text-left text-sm">
              <thead>
                <tr className="border-b border-royal/30 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3">{tr.admin.ilerleme.kisi}</th>
                  <th className="py-2 pr-3">🤝 {t.grupIci}</th>
                  <th className="py-2">🌍 {t.grupDisi}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-royal/20">
                {satirlar.map((s) => (
                  <tr key={s.ad} className="align-top">
                    <td className="py-2 pr-3 font-medium text-slate-100">{s.ad}</td>
                    <td className="py-2 pr-3 text-slate-300">
                      {s.ici.join(", ") || "—"}
                    </td>
                    <td className="py-2 text-slate-300">
                      {s.disi.join(", ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

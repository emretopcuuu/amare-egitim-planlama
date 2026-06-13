import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import SozAcKapat from "./SozAcKapat";

export const metadata = { title: "Kapanış Sözleri — Liderlik Aynası" };

export default async function SozlerPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [{ data: ayar }, { data: sozler }] = await Promise.all([
    db.from("settings").select("value").eq("key", "kapanis_soz_acik").maybeSingle(),
    db
      .from("pledges")
      .select(
        "temmuz_kayit, agustos_gorusme, kayit_yapilan, gorusme_yapilan, kisi:participants!pledges_participant_id_fkey(full_name, team)"
      )
      .order("agustos_gorusme", { ascending: false }),
  ]);

  const acik = ayar?.value === "true";
  const liste = sozler ?? [];
  const toplamTemmuz = liste.reduce((t, s) => t + s.temmuz_kayit, 0);
  const toplamAgustos = liste.reduce((t, s) => t + s.agustos_gorusme, 0);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">🤝 Kapanış Sözleri</h1>
        <p className="mt-1 text-sm text-slate-400">
          Kamp kapanışında alınan kişisel kayıt + Ağustos görüşme sözleri ve ilerleme.
        </p>
      </div>

      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-gold/40 backdrop-blur">
        <p className="mb-3 text-sm text-slate-300">
          {acik
            ? "Söz ekranı katılımcılara AÇIK."
            : "Söz ekranı kapalı. Kapanışta aç."}
        </p>
        <SozAcKapat acik={acik} />
      </section>

      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-midnight-soft p-3">
            <p className="text-2xl font-bold text-gold">{liste.length}</p>
            <p className="mt-1 text-xs text-slate-400">söz verildi</p>
          </div>
          <div className="rounded-xl bg-midnight-soft p-3">
            <p className="text-2xl font-bold text-gold">{toplamTemmuz}</p>
            <p className="mt-1 text-xs text-slate-400">Temmuz kayıt (toplam)</p>
          </div>
          <div className="rounded-xl bg-midnight-soft p-3">
            <p className="text-2xl font-bold text-gold">{toplamAgustos}</p>
            <p className="mt-1 text-xs text-slate-400">Ağustos görüşme (toplam)</p>
          </div>
        </div>

        {liste.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">Henüz söz verilmedi.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="cizgili w-full text-left text-sm">
              <thead>
                <tr className="border-b border-royal/30 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3">Kişi</th>
                  <th className="py-2 pr-3">Takım</th>
                  <th className="py-2 pr-3 text-center">Tem. kayıt</th>
                  <th className="py-2 pr-3 text-center">Tem. ilerleme</th>
                  <th className="py-2 pr-3 text-center">Ağu. görüşme</th>
                  <th className="py-2 text-center">Ağu. ilerleme</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-royal/20">
                {liste.map((s, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-3 font-medium text-slate-100">
                      {s.kisi?.full_name ?? "—"}
                    </td>
                    <td className="py-2 pr-3 text-slate-400">{s.kisi?.team ?? "—"}</td>
                    <td className="py-2 pr-3 text-center text-gold">{s.temmuz_kayit}</td>
                    <td className="py-2 pr-3 text-center text-slate-300">
                      {s.kayit_yapilan}
                    </td>
                    <td className="py-2 pr-3 text-center text-gold">{s.agustos_gorusme}</td>
                    <td className="py-2 text-center text-slate-300">{s.gorusme_yapilan}</td>
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

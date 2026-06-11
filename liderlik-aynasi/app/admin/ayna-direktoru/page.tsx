import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import AynaDirektorKontrol from "./AynaDirektorKontrol";

export const metadata = { title: "AYNA Kontrol Odası — Liderlik Aynası" };

const t = tr.admin.aynaDirektor;

export default async function AynaDirektorPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [
    { data: ayarlar },
    { count: aboneSayisi },
    { count: katilimciSayisi },
    { data: sonGorevler, error },
  ] = await Promise.all([
    db.from("settings").select("key, value").in("key", ["ayna_aktif", "ayna_tempo"]),
    db.from("push_subscriptions").select("id", { count: "exact", head: true }),
    db
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("role", "participant"),
    db
      .from("missions")
      .select(
        "id, kind, title, status, ai_score, spark_points, issued_at, katilimci:participants!missions_participant_id_fkey(full_name)"
      )
      .order("issued_at", { ascending: false })
      .limit(20),
  ]);
  if (error) throw error;

  const ayar = new Map((ayarlar ?? []).map((a) => [a.key, a.value]));

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">{t.baslik}</h1>
        <p className="mt-1 text-sm text-slate-400">{t.aciklama}</p>
      </div>

      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-gold/40 backdrop-blur">
        <AynaDirektorKontrol
          aktif={ayar.get("ayna_aktif") === "true"}
          tempo={ayar.get("ayna_tempo") ?? "surpriz"}
          aboneSayisi={aboneSayisi ?? 0}
          katilimciSayisi={katilimciSayisi ?? 0}
        />
      </section>

      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 className="text-lg font-semibold text-gold-light">{t.akisBaslik}</h2>
        {(sonGorevler ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">{t.akisYok}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-royal/30 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3">{tr.admin.ilerleme.kisi}</th>
                  <th className="py-2 pr-3">Görev</th>
                  <th className="py-2 pr-3">Tür</th>
                  <th className="py-2 pr-3">Durum</th>
                  <th className="py-2 text-right">Puan / ⚡</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-royal/20">
                {(sonGorevler ?? []).map((g) => (
                  <tr key={g.id}>
                    <td className="py-2 pr-3 font-medium text-slate-100">
                      {g.katilimci.full_name}
                    </td>
                    <td className="max-w-56 truncate py-2 pr-3 text-slate-300">
                      {g.title}
                    </td>
                    <td className="py-2 pr-3 text-slate-400">
                      {tr.gorevler.turler[g.kind as keyof typeof tr.gorevler.turler] ??
                        g.kind}
                    </td>
                    <td className="py-2 pr-3 text-slate-400">
                      {tr.gorevler.durumlar[
                        g.status as keyof typeof tr.gorevler.durumlar
                      ] ?? g.status}
                    </td>
                    <td className="py-2 text-right font-mono text-gold-light">
                      {g.status === "scored"
                        ? `${g.ai_score ?? "—"} / +${g.spark_points}`
                        : "—"}
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

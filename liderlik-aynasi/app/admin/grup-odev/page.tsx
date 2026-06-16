import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { grupOzeti } from "@/lib/grupOdev";
import { tr } from "@/lib/i18n/tr";
import GrupOdevUret from "./GrupOdevUret";

export const metadata = { title: "Grup Ödevleri — Liderlik Aynası" };

const t = tr.admin.grupOdev;

export default async function GrupOdevPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [{ data: kisiler }, { data: odevler }] = await Promise.all([
    db.from("participants").select("team").eq("role", "participant"),
    db.from("grup_odev").select("takim, tip, baslik, govde, hedef").eq("aktif", true),
  ]);

  const takimlar = [...new Set((kisiler ?? []).map((k) => k.team).filter((x): x is string => !!x))].sort(
    (a, b) => (parseInt(a.replace(/\D/g, ""), 10) || 0) - (parseInt(b.replace(/\D/g, ""), 10) || 0)
  );
  const ozetler = await Promise.all(takimlar.map((tk) => grupOzeti(db, tk)));

  const odevHarita = new Map<string, { tip: string; baslik: string; govde: string; hedef: string | null }[]>();
  for (const o of odevler ?? []) {
    const liste = odevHarita.get(o.takim) ?? [];
    liste.push(o);
    odevHarita.set(o.takim, liste);
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">{t.baslik}</h1>
        <p className="mt-1 text-sm text-slate-400">{t.aciklama}</p>
      </div>

      {takimlar.length === 0 ? (
        <p className="text-sm text-slate-400">{tr.admin.eslestirme.atamaYok}</p>
      ) : (
        <div className="space-y-4">
          {ozetler.map((o) => {
            const odevList = odevHarita.get(o.takim) ?? [];
            return (
              <section
                key={o.takim}
                className="kart-3d rounded-2xl bg-midnight-card/60 p-5 shadow-xl ring-1 ring-royal/30 backdrop-blur"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-gold-light">{o.takim}</h2>
                  <span className="text-xs text-slate-400">{t.uyeEtiket(o.profilliUye, o.uyeSayisi)}</span>
                </div>

                {o.profilliUye === 0 ? (
                  <p className="mt-3 text-sm text-amber-400/90">{t.profilYok}</p>
                ) : (
                  <>
                    <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl bg-white/[0.03] px-3 py-2">
                        <dt className="text-xs text-slate-500">{t.zayifEtiket}</dt>
                        <dd className="mt-0.5 text-sm font-medium text-slate-100">{o.baskinZayifAlan ?? t.yok}</dd>
                      </div>
                      <div className="rounded-xl bg-white/[0.03] px-3 py-2">
                        <dt className="text-xs text-slate-500">{t.acikEtiket}</dt>
                        <dd className="mt-0.5 text-sm font-medium text-slate-100">
                          {o.baskinAciklar.length ? o.baskinAciklar.map((a) => `${a.baslik} (${a.sayi})`).join(", ") : t.yok}
                        </dd>
                      </div>
                      <div className="rounded-xl bg-white/[0.03] px-3 py-2">
                        <dt className="text-xs text-slate-500">Ritim</dt>
                        <dd className="mt-0.5 text-sm font-medium text-slate-100">
                          {o.ritim.duzenli} düzenli · {o.ritim.patlayan} patlayan
                        </dd>
                      </div>
                    </dl>

                    {odevList.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.mevcut}</p>
                        {odevList.map((od) => (
                          <div key={od.tip} className="rounded-xl border border-gold/20 bg-gold/[0.04] p-3">
                            <p className="text-xs font-medium text-gold-light/80">
                              {od.tip === "grup_ici" ? "🤝 Grup-içi" : "🔗 Grup-birlikte"}
                              {od.hedef ? ` · ${od.hedef}` : ""}
                            </p>
                            <p className="mt-1 font-semibold text-slate-100">{od.baslik}</p>
                            <p className="mt-1 text-sm leading-relaxed text-slate-300">{od.govde}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <GrupOdevUret takim={o.takim} />
                  </>
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

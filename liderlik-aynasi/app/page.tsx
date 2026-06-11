import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { acikDalga } from "@/lib/degerlendirme";
import { raporlarGorunurMu } from "@/lib/rapor";
import { tr } from "@/lib/i18n/tr";
import CikisButonu from "@/components/CikisButonu";
import AynaKurulum from "@/components/AynaKurulum";

export default async function AnaSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");

  const db = supabaseAdmin();
  const [dalga, raporlarAcik, { count: aktifGorev }] = await Promise.all([
    acikDalga(db),
    raporlarGorunurMu(db),
    db
      .from("missions")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", session.sub)
      .eq("status", "pending"),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-5 p-6">
      <div className="relative overflow-hidden rounded-2xl bg-midnight-card/60 p-8 shadow-2xl ring-1 ring-royal/30 backdrop-blur">
        <span className="altin-tel" />
        <p className="text-sm font-medium uppercase tracking-widest text-royal-light">
          {tr.app.name}
        </p>
        <h1 className="font-display mt-2 text-3xl font-bold text-gold">
          {tr.anaSayfa.hosGeldin(session.ad)}
        </h1>
        <p className="mt-4 text-slate-300">{tr.anaSayfa.aciklama}</p>

        <p className="mt-6 text-sm">
          {dalga ? (
            <span className="rounded-full bg-emerald-400/15 px-3 py-1 font-medium text-emerald-400">
              ● {tr.anaSayfa.dalgaAcik(dalga.name)}
            </span>
          ) : (
            <span className="rounded-full bg-slate-500/15 px-3 py-1 font-medium text-slate-400">
              ○ {tr.anaSayfa.dalgaKapali}
            </span>
          )}
        </p>

        {raporlarAcik && (
          <Link
            href="/ayna"
            className="mt-6 flex h-14 w-full items-center justify-center rounded-xl bg-gradient-to-r from-gold to-gold-light font-bold text-midnight shadow-lg shadow-gold/25 transition-transform hover:scale-[1.02]"
          >
            {tr.anaSayfa.aynaniGor}
          </Link>
        )}

        <Link
          href="/gorevler"
          className={`${raporlarAcik ? "mt-3" : "mt-6"} flex h-12 w-full items-center justify-between rounded-xl px-4 font-semibold transition-colors ${
            (aktifGorev ?? 0) > 0
              ? "bg-gold text-midnight hover:bg-gold-light"
              : "border border-royal-light/40 text-slate-200 hover:bg-midnight-soft"
          }`}
        >
          <span>{tr.anaSayfa.gorevler}</span>
          {(aktifGorev ?? 0) > 0 && (
            <span className="rounded-full bg-midnight px-2.5 py-0.5 text-xs font-bold text-gold">
              {tr.anaSayfa.aktifGorev(aktifGorev ?? 0)}
            </span>
          )}
        </Link>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link
            href="/degerlendir"
            className="flex h-12 items-center justify-center rounded-xl border border-royal-light/40 text-sm font-semibold text-slate-200 transition-colors hover:bg-midnight-soft"
          >
            {tr.anaSayfa.degerlendirmeyeBasla}
          </Link>
          <Link
            href="/program"
            className="flex h-12 items-center justify-center rounded-xl border border-royal-light/40 text-sm font-semibold text-slate-200 transition-colors hover:bg-midnight-soft"
          >
            {tr.anaSayfa.program}
          </Link>
        </div>
      </div>

      <AynaKurulum />

      <CikisButonu />
    </main>
  );
}

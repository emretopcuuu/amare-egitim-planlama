import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { acikDalga } from "@/lib/degerlendirme";
import { raporlarGorunurMu } from "@/lib/rapor";
import { tr } from "@/lib/i18n/tr";
import CikisButonu from "@/components/CikisButonu";

export default async function AnaSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");

  const db = supabaseAdmin();
  const [dalga, raporlarAcik] = await Promise.all([
    acikDalga(db),
    raporlarGorunurMu(db),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 p-6">
      <div className="rounded-2xl bg-midnight-card/60 p-8 shadow-2xl ring-1 ring-royal/30 backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-widest text-royal-light">
          {tr.app.name}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gold">
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
          href="/degerlendir"
          className={`flex h-12 w-full items-center justify-center rounded-xl font-semibold transition-colors ${
            raporlarAcik
              ? "mt-3 border border-royal-light/40 text-slate-300 hover:bg-midnight-soft"
              : "mt-6 bg-gold text-midnight hover:bg-gold-light"
          }`}
        >
          {tr.anaSayfa.degerlendirmeyeBasla}
        </Link>
      </div>

      <CikisButonu />
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { acikDalga } from "@/lib/degerlendirme";
import { raporlarGorunurMu } from "@/lib/rapor";
import { tr } from "@/lib/i18n/tr";
import CikisButonu from "@/components/CikisButonu";
import AynaKurulum from "@/components/AynaKurulum";
import AynaRituel from "@/components/AynaRituel";
import EgilenKart from "@/components/EgilenKart";

export default async function AnaSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");

  const db = supabaseAdmin();
  const [dalga, raporlarAcik, { count: aktifGorev }, { data: sesProfili }] =
    await Promise.all([
      acikDalga(db),
      raporlarGorunurMu(db),
      db
        .from("missions")
        .select("id", { count: "exact", head: true })
        .eq("participant_id", session.sub)
        .eq("status", "pending"),
      db
        .from("voice_profiles")
        .select("status")
        .eq("participant_id", session.sub)
        .maybeSingle(),
    ]);

  return (
    <main className="flex min-h-screen flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-5 p-6">
        <EgilenKart className="rounded-3xl">
          <div className="kart-cam relative overflow-hidden rounded-3xl p-8">
            <p className="prizma-serif text-xs uppercase tracking-[0.45em] text-slate-400">
              {tr.app.name}
            </p>
            <h1 className="prizma-serif ay-metin mt-2 text-3xl font-semibold">
              {tr.anaSayfa.hosGeldin(session.ad)}
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              {tr.anaSayfa.aciklama}
            </p>

            <p className="mt-6 text-sm">
              {dalga ? (
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 font-medium text-emerald-300">
                  ● {tr.anaSayfa.dalgaAcik(dalga.name)}
                </span>
              ) : (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-medium text-slate-400">
                  ○ {tr.anaSayfa.dalgaKapali}
                </span>
              )}
            </p>

            {raporlarAcik && (
              <Link
                href="/ayna"
                className="parilti btn-kor mt-6 flex h-14 w-full items-center justify-center rounded-xl font-bold transition-transform hover:scale-[1.01]"
              >
                {tr.anaSayfa.aynaniGor}
              </Link>
            )}

            <Link
              href="/gorevler"
              className={`${raporlarAcik ? "mt-3" : "mt-6"} flex h-12 w-full items-center justify-between rounded-xl px-4 font-semibold transition-colors ${
                (aktifGorev ?? 0) > 0
                  ? "btn-kor"
                  : "border border-white/15 text-slate-200 hover:bg-white/[0.06]"
              }`}
            >
              <span>{tr.anaSayfa.gorevler}</span>
              {(aktifGorev ?? 0) > 0 && (
                <span className="rounded-full bg-grafit px-2.5 py-0.5 text-xs font-bold text-sky-200">
                  {tr.anaSayfa.aktifGorev(aktifGorev ?? 0)}
                </span>
              )}
            </Link>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <Link
                href="/degerlendir"
                className="flex h-12 items-center justify-center rounded-xl border border-white/15 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/[0.06]"
              >
                {tr.anaSayfa.degerlendirmeyeBasla}
              </Link>
              <Link
                href="/program"
                className="flex h-12 items-center justify-center rounded-xl border border-white/15 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/[0.06]"
              >
                {tr.anaSayfa.program}
              </Link>
            </div>
          </div>
        </EgilenKart>

        {/* YANSIMAN doğmadıysa önce Ses Ritüeli — ilk dakikanın wow anı */}
        {!sesProfili && <AynaRituel />}

        <AynaKurulum />

        <CikisButonu />
      </div>
    </main>
  );
}

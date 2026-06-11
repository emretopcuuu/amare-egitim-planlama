import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { tr } from "@/lib/i18n/tr";
import CikisButonu from "@/components/CikisButonu";

export default async function AnaSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");

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

        <button
          disabled
          title={tr.anaSayfa.yakindaFaz2}
          className="mt-8 h-12 w-full cursor-not-allowed rounded-xl bg-gold/40 font-semibold text-midnight"
        >
          {tr.anaSayfa.degerlendirmeyeBasla}
        </button>
        <p className="mt-2 text-center text-xs text-slate-400">
          {tr.anaSayfa.yakindaFaz2}
        </p>
      </div>

      <CikisButonu />
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { aktifOzellikler } from "@/lib/degerlendirme";
import { tr } from "@/lib/i18n/tr";
import TahminFormu from "./TahminFormu";

export const metadata = { title: "Tahmin Oyunu — Liderlik Aynası" };

export default async function TahminPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const [ozellikler, { data: mevcut, error }] = await Promise.all([
    aktifOzellikler(db),
    db
      .from("predictions")
      .select("top_trait_id, bottom_trait_id")
      .eq("participant_id", session.sub)
      .maybeSingle(),
  ]);
  if (error) throw error;

  const adBul = (id: number) => ozellikler.find((o) => o.id === id)?.name ?? "—";

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center p-6">
      <div className="kart-3d rounded-2xl bg-midnight-card/60 p-8 shadow-2xl ring-1 ring-gold/30 backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-widest text-royal-light">
          {tr.tahmin.kartBaslik}
        </p>

        {mevcut ? (
          <>
            <h1 className="mt-2 text-2xl font-bold text-gold">
              {tr.tahmin.tamamBaslik}
            </h1>
            <p className="mt-3 text-sm text-slate-300">{tr.tahmin.tamamAciklama}</p>
            <dl className="mt-6 space-y-3">
              <div className="rounded-xl bg-midnight-soft p-4">
                <dt className="text-xs text-slate-400">{tr.tahmin.enYuksekOzet}</dt>
                <dd className="mt-1 font-semibold text-emerald-400">
                  ▲ {adBul(mevcut.top_trait_id)}
                </dd>
              </div>
              <div className="rounded-xl bg-midnight-soft p-4">
                <dt className="text-xs text-slate-400">{tr.tahmin.enDusukOzet}</dt>
                <dd className="mt-1 font-semibold text-amber-400">
                  ▼ {adBul(mevcut.bottom_trait_id)}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-2xl font-bold text-gold">{tr.tahmin.baslik}</h1>
            <p className="mt-3 text-sm text-slate-300">{tr.tahmin.aciklama}</p>
            <TahminFormu
              ozellikler={ozellikler.map((o) => ({ id: o.id, ad: o.name }))}
            />
          </>
        )}

        <p className="mt-8 text-center">
          <Link
            href="/degerlendir"
            className="text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
          >
            ← {tr.puanlama.geriDon}
          </Link>
        </p>
      </div>
    </main>
  );
}

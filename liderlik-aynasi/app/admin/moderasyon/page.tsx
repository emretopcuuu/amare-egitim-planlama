import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import GizleButonu from "./GizleButonu";
import Ipucu from "../Ipucu";
import OtoYenile from "../OtoYenile";

export const metadata = { title: "Moderasyon — Liderlik Aynası" };

export default async function ModerasyonPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  // Yalnızca başkalarına yazılan yorumlar moderasyona girer (öz yorumlar kişiye özel).
  const { data: yorumlar, error } = await supabaseAdmin()
    .from("ratings")
    .select(
      "id, score, comment, wave, is_hidden, created_at, trait:traits(name), rater:participants!ratings_rater_id_fkey(full_name), target:participants!ratings_target_id_fkey(full_name)"
    )
    .eq("is_self", false)
    .not("comment", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;

  const t = tr.admin.moderasyon;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gold">{t.baslik}</h1>
            <Ipucu {...tr.admin.yardim.moderasyon} />
          </div>
          <p className="mt-1 text-sm text-slate-400">{t.aciklama}</p>
        </div>
        <OtoYenile saniye={20} />
      </div>

      {yorumlar.length === 0 ? (
        <p className="text-sm text-slate-400">{t.yorumYok}</p>
      ) : (
        <ul className="space-y-3">
          {yorumlar.map((y) => (
            <li
              key={y.id}
              className={`kart-3d rounded-2xl bg-midnight-card/60 p-5 shadow-xl ring-1 backdrop-blur ${
                y.is_hidden ? "opacity-60 ring-red-500/30" : "ring-royal/30"
              }`}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                <span className="rounded-md bg-royal/30 px-2 py-0.5 text-royal-light">
                  Dalga {y.wave}
                </span>
                <span className="font-medium text-slate-300">{y.trait.name}</span>
                <span className="font-bold text-gold-light">{y.score}/10</span>
                <span>
                  {t.kimden}: {y.rater.full_name} → {t.kime}: {y.target.full_name}
                </span>
                {y.is_hidden && (
                  <span className="rounded-md bg-red-500/20 px-2 py-0.5 font-medium text-red-400">
                    {t.gizliEtiket}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-100">{y.comment}</p>
              <div className="mt-3">
                <GizleButonu puanId={y.id} gizli={y.is_hidden} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

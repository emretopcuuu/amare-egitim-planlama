import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tumKayitlar } from "@/lib/tumKayitlar";
import { tr } from "@/lib/i18n/tr";
import EslestirmeFormu from "./EslestirmeFormu";
import AtamaDuzenle from "./AtamaDuzenle";
import Ipucu from "../Ipucu";

export const metadata = { title: "Eşleştirme — Liderlik Aynası" };

type AtamaSatir = {
  type: string;
  observer: { id: string; full_name: string; team: string | null };
  target: { id: string; full_name: string; team: string | null };
};

export default async function EslestirmePage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  // Sayfa sayfa çek: tek istekte ~1000 satır sınırı atamaları (1600+) kırpıyordu.
  const db = supabaseAdmin();
  const [atamalar, { data: kisilerHam }] = await Promise.all([
    tumKayitlar<AtamaSatir>((bas, son) =>
      db
        .from("assignments")
        .select(
          "id, type, observer:participants!assignments_observer_id_fkey(id, full_name, team), target:participants!assignments_target_id_fkey(id, full_name, team)"
        )
        .order("observer_id")
        .range(bas, son)
    ),
    db
      .from("participants")
      .select("id, full_name, team")
      .eq("role", "participant")
      .order("full_name"),
  ]);

  const t = tr.admin.eslestirme;

  // Elle düzenleme için düz atama + katılımcı listesi.
  const duzAtamalar = atamalar.map((a) => ({
    observerId: a.observer.id,
    observerAd: a.observer.full_name,
    observerTakim: a.observer.team,
    targetId: a.target.id,
    targetAd: a.target.full_name,
    targetTakim: a.target.team,
  }));
  const kisiler = (kisilerHam ?? []).map((k) => ({
    id: k.id,
    ad: k.full_name,
    takim: k.team,
  }));

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-gold">{t.baslik}</h1>
        <Ipucu {...tr.admin.yardim.eslestirme} />
      </div>

      <EslestirmeFormu />

      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 className="text-lg font-semibold text-gold-light">{t.mevcutBaslik}</h2>
        <AtamaDuzenle kisiler={kisiler} atamalar={duzAtamalar} />
      </section>
    </main>
  );
}

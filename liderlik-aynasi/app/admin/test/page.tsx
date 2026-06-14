import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { KAMP_GUNLERI } from "@/lib/kampProgrami";
import { tr } from "@/lib/i18n/tr";
import TestPaneli from "./TestPaneli";
import Ipucu from "../Ipucu";

export const metadata = { title: "Prova / Test — Liderlik Aynası" };

const t = tr.admin.test;

export default async function TestPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const { data: demolar } = await db
    .from("participants")
    .select("id, full_name, login_code")
    .eq("team", "DEMO")
    .eq("role", "participant")
    .order("full_name");

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gold">{t.baslik}</h1>
          <Ipucu {...tr.admin.yardim.test} />
        </div>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">{t.aciklama}</p>
      </div>
      <TestPaneli
        demolar={(demolar ?? []).map((d) => ({
          id: d.id,
          ad: d.full_name,
          kod: d.login_code,
        }))}
        kampGunleri={[...KAMP_GUNLERI]}
      />
    </main>
  );
}

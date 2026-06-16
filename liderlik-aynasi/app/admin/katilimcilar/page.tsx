import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import KatilimciAraclari from "./KatilimciAraclari";
import KatilimciListe from "./KatilimciListe";
import Ipucu from "../Ipucu";

export const metadata = { title: "Katılımcılar — Liderlik Aynası" };

export default async function KatilimcilarPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const { data: kisiler, error } = await supabaseAdmin()
    .from("participants")
    .select("id, full_name, team, city, phone, login_code")
    .eq("role", "participant")
    .order("full_name");
  if (error) throw error;

  const t = tr.admin.katilimcilar;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-gold">{t.baslik}</h1>
        <Ipucu {...tr.admin.yardim.katilimcilar} />
      </div>

      <KatilimciAraclari />

      <KatilimciListe kisiler={kisiler} />
    </main>
  );
}

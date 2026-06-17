import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import KatilimciYonetim from "./KatilimciYonetim";
import Ipucu from "../Ipucu";

export const metadata = { title: "Katılımcılar — Liderlik Aynası" };

export default async function KatilimcilarPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [{ data: kisiler, error }, { data: churnlar }] = await Promise.all([
    db
      .from("participants")
      .select("id, full_name, team, city, phone, login_code")
      .eq("role", "participant")
      .order("full_name"),
    // UX #2: sessizleşen (dürtülmüş) adayları listede kırmızı işaretlemek için.
    db.from("churn_radar").select("participant_id").not("nudged_at", "is", null),
  ]);
  if (error) throw error;
  const kayanIdler = (churnlar ?? []).map((c) => c.participant_id);

  const t = tr.admin.katilimcilar;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-gold">{t.baslik}</h1>
        <Ipucu {...tr.admin.yardim.katilimcilar} />
      </div>

      {/* Liste en üstte ve açık; diğer her şey (ekle, dağıt, adlandır, import,
          tehlikeli) katlanır ve varsayılan kapalı — KatilimciYonetim içinde. */}
      <KatilimciYonetim kisiler={kisiler} kayanIdler={kayanIdler} />
    </main>
  );
}

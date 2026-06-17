import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import SahneKumanda from "./SahneKumanda";
import Ipucu from "../Ipucu";

export const metadata = { title: "Sahne Kumandası — Liderlik Aynası" };

const t = tr.admin.sahne;

export default async function SahneKumandaPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [{ data: aynaAyar }, { data: dalgalar }, { data: vitrinAyar }] = await Promise.all([
    db.from("settings").select("value").eq("key", "ayna_aktif").maybeSingle(),
    db.from("waves").select("id, name, is_open").order("id"),
    db.from("settings").select("value").eq("key", "sahne_slayt").maybeSingle(),
  ]);

  // Sabit slayt indeksi (taze kontrolü ekran tarafında; burada sadece görsel ipucu)
  let vitrin: number | null = null;
  const vh = vitrinAyar?.value;
  if (vh && vh !== "-") {
    const idx = Number(vh.slice(0, vh.indexOf("|")));
    if (Number.isInteger(idx)) vitrin = idx;
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gold">{t.baslik}</h1>
          <Ipucu {...tr.admin.yardim.sahne} />
        </div>
        <p className="mt-1 text-sm text-slate-400">{t.aciklama}</p>
      </div>
      <SahneKumanda
        aynaAktif={aynaAyar?.value === "true"}
        vitrin={vitrin}
        dalgalar={(dalgalar ?? []).map((d) => ({
          id: d.id,
          ad: d.name,
          acik: d.is_open,
        }))}
      />
    </main>
  );
}

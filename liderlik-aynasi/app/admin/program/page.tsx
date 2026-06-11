import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import ProgramYonetimi from "./ProgramYonetimi";

export const metadata = { title: "Program Yönetimi — Liderlik Aynası" };

export default async function AdminProgramPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const { data: maddeler, error } = await supabaseAdmin()
    .from("schedule_items")
    .select("id, starts_at, title, location, teaser, reveal_minutes, revealed")
    .order("starts_at");
  if (error) throw error;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">{tr.admin.program.baslik}</h1>
        <p className="mt-1 text-sm text-slate-400">{tr.admin.program.aciklama}</p>
      </div>
      <ProgramYonetimi
        maddeler={(maddeler ?? []).map((m) => ({
          id: m.id,
          baslangic: m.starts_at,
          baslik: m.title,
          yer: m.location,
          ipucu: m.teaser,
          acilmaDk: m.reveal_minutes,
          aciklandi: m.revealed,
        }))}
      />
    </main>
  );
}

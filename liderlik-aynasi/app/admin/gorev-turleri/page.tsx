import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { GOREV_TURLERI } from "@/lib/davranis";
import { tr } from "@/lib/i18n/tr";
import GorevTuruYonetim from "./GorevTuruYonetim";
import Ipucu from "../Ipucu";

export const metadata = { title: "Görev Türleri — Liderlik Aynası" };

const t = tr.admin.gorevTuru;

export default async function GorevTuruPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const { data } = await db
    .from("settings")
    .select("value")
    .eq("key", "kapali_gorev_turleri")
    .maybeSingle();
  let kapali: string[] = [];
  try {
    if (data?.value) kapali = JSON.parse(data.value);
  } catch {
    kapali = [];
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gold">{t.baslik}</h1>
          <Ipucu {...tr.admin.yardim.gorevTuru} />
        </div>
        <p className="mt-1 text-sm text-slate-400">{t.aciklama}</p>
      </div>
      <GorevTuruYonetim turler={[...GOREV_TURLERI]} kapali={kapali} />
    </main>
  );
}

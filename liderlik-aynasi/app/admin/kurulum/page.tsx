import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import KurulumSihirbazi from "./KurulumSihirbazi";

export const metadata = { title: "Kurulum Sihirbazı — Liderlik Aynası" };

// #8 Tek akışlı kurulum: CSV → kod → QR. Mevcut araçları tek güdümlü akışta
// toplar; admin kamp öncesi hazırlığı tek ekrandan, adım adım tamamlar.
export default async function KurulumPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const { count } = await supabaseAdmin()
    .from("participants")
    .select("id", { count: "exact", head: true })
    .eq("role", "participant");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">{tr.admin.kurulum.baslik}</h1>
        <p className="mt-1 text-sm text-slate-400">{tr.admin.kurulum.aciklama}</p>
      </div>
      <KurulumSihirbazi katilimciSayisi={count ?? 0} />
    </main>
  );
}

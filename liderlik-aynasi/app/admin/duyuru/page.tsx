import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import DuyuruGonder from "./DuyuruGonder";
import DuyuruSablonlari from "../DuyuruSablonlari";

export const metadata = { title: "Duyuru — Liderlik Aynası" };

const t = tr.admin.yayin;

// GELİŞTİRME #3 (2.tur): Yayın/duyuru aracı — admin herkese ya da bir takıma
// anında serbest-metin push gönderir.
export default async function DuyuruPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const { data: kisiler } = await db.from("participants").select("team").eq("role", "participant");
  const takimlar = [...new Set((kisiler ?? []).map((k) => k.team).filter((x): x is string => !!x))].sort(
    (a, b) => (parseInt(a.replace(/\D/g, ""), 10) || 0) - (parseInt(b.replace(/\D/g, ""), 10) || 0)
  );

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">{t.baslik}</h1>
        <p className="mt-1 text-sm text-slate-400">{t.aciklama}</p>
      </div>
      <DuyuruGonder takimlar={takimlar} />

      {/* Hızlı şablonlar — tek duyuru yerinde (öneri #9): panelden taşındı */}
      <DuyuruSablonlari />
    </main>
  );
}

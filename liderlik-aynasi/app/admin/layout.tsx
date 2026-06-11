import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { acikDalga } from "@/lib/degerlendirme";
import AdminNav from "./AdminNav";

// /admin/giris da bu layout'tan geçer: nav yalnızca admin oturumunda görünür.
// Nav'daki durum rozetleri her eylem sonrası router.refresh ile tazelenir.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.rol !== "admin") return <>{children}</>;

  const db = supabaseAdmin();
  const [dalga, { data: aynaAyari }] = await Promise.all([
    acikDalga(db),
    db.from("settings").select("value").eq("key", "ayna_aktif").maybeSingle(),
  ]);

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <AdminNav
        ad={session.ad}
        dalgaAdi={dalga?.name ?? null}
        aynaUyanik={aynaAyari?.value === "true"}
      />
      {children}
    </div>
  );
}

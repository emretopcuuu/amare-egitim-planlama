import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { acikDalga } from "@/lib/degerlendirme";
import AdminNav from "./AdminNav";
import AdminTost from "./AdminTost";
import AdminTuru from "./AdminTuru";
import KlavyeKisayollari from "./KlavyeKisayollari";
import CanliOlayAkisi from "./CanliOlayAkisi";
import AcilDurumKarti from "./AcilDurumKarti";

// /admin/giris da bu layout'tan geçer: nav yalnızca admin oturumunda görünür.
// Nav'daki durum rozetleri her eylem sonrası router.refresh ile tazelenir.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const yetkili = session?.rol === "admin" || session?.rol === "yardimci";
  if (!session || !yetkili) return <>{children}</>;

  const db = supabaseAdmin();
  const tamYetki = session.rol === "admin";
  const [
    dalga,
    { data: aynaAyari },
    { data: provaAyari },
    { data: raporAyari },
    { data: muhurAyari },
    { count: bekleyenFoto },
  ] = await Promise.all([
    acikDalga(db),
    db.from("settings").select("value").eq("key", "ayna_aktif").maybeSingle(),
    db.from("settings").select("value").eq("key", "prova_modu").maybeSingle(),
    db.from("settings").select("value").eq("key", "reports_visible").maybeSingle(),
    db.from("settings").select("value").eq("key", "muhur_acik").maybeSingle(),
    db.from("photos").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  const provaAcik = provaAyari?.value === "true";

  return (
    // #9 Prova modunda admin kromu kırmızı çerçeveyle uyarır: yönetici "bu
    // gerçek mi, test mi?" tereddüdü yaşamasın, yanlışlıkla canlı bildirim atmasın.
    <div
      className={`admin-kok flex min-h-screen flex-1 flex-col ${
        provaAcik ? "ring-2 ring-inset ring-red-600/60" : ""
      }`}
    >
      <AdminNav
        ad={session.ad}
        dalgaAdi={dalga?.name ?? null}
        aynaUyanik={aynaAyari?.value === "true"}
        tamYetki={tamYetki}
        provaAcik={provaAcik}
        raporAcik={raporAyari?.value === "true"}
        muhurAcik={muhurAyari?.value === "true"}
        moderasyonBekleyen={bekleyenFoto ?? 0}
      />
      {children}
      <AdminTost />
      {/* UX #7: panele ilk giren yöneticiye tek seferlik tur */}
      <AdminTuru />
      {/* Yeni UX katmanları: klavye kısayolları, canlı olay akışı, acil kart */}
      <KlavyeKisayollari />
      {tamYetki && <CanliOlayAkisi />}
      <AcilDurumKarti />
    </div>
  );
}

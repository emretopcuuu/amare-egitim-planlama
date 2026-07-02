import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { acikDalga } from "@/lib/degerlendirme";
import { adminOkunmamis } from "@/lib/icMesaj";
import AdminNav from "./AdminNav";
import AdminTost from "./AdminTost";
import AdminTuru from "./AdminTuru";
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
    { data: dalgaAcilis },
    bekleyenMesaj,
  ] = await Promise.all([
    acikDalga(db),
    db.from("settings").select("value").eq("key", "ayna_aktif").maybeSingle(),
    db.from("settings").select("value").eq("key", "prova_modu").maybeSingle(),
    db.from("settings").select("value").eq("key", "reports_visible").maybeSingle(),
    db.from("settings").select("value").eq("key", "muhur_acik").maybeSingle(),
    db.from("photos").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("waves").select("opened_at").eq("is_open", true).order("id", { ascending: false }).limit(1).maybeSingle(),
    adminOkunmamis(db),
  ]);
  const provaAcik = provaAyari?.value === "true";

  // Dalga süresi — saniye hassasiyetinde gerek yok, OtoYenile zaten tazeliyor.
  let dalgaSure: string | null = null;
  if (dalgaAcilis?.opened_at) {
    const dakika = Math.floor((Date.now() - new Date(dalgaAcilis.opened_at).getTime()) / 60_000);
    if (dakika < 60) dalgaSure = `${dakika}dk`;
    else dalgaSure = `${Math.floor(dakika / 60)}sa ${dakika % 60 > 0 ? `${dakika % 60}dk` : ""}`.trim();
  }

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
        dalgaSure={dalgaSure}
        aynaUyanik={aynaAyari?.value === "true"}
        tamYetki={tamYetki}
        provaAcik={provaAcik}
        raporAcik={raporAyari?.value === "true"}
        muhurAcik={muhurAyari?.value === "true"}
        moderasyonBekleyen={bekleyenFoto ?? 0}
        mesajBekleyen={bekleyenMesaj}
      />
      {children}
      <AdminTost />
      {/* UX #7: panele ilk giren yöneticiye tek seferlik tur */}
      <AdminTuru />
      {tamYetki && <CanliOlayAkisi />}
      <AcilDurumKarti />
    </div>
  );
}

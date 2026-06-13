import { headers } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import KioskEkrani from "./KioskEkrani";

export const metadata = { title: "Kayıt Masası — Liderlik Aynası" };

export default async function KioskPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [{ count: toplam }, { count: katildi }, istek] = await Promise.all([
    db
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("role", "participant"),
    db.from("voice_profiles").select("participant_id", { count: "exact", head: true }),
    headers(),
  ]);

  const host = istek.get("host") ?? "localhost:3000";
  const proto = istek.get("x-forwarded-proto") ?? "https";
  const qrSvg = await QRCode.toString(`${proto}://${host}/giris`, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
  });

  return (
    <KioskEkrani
      toplam={toplam ?? 0}
      katildi={katildi ?? 0}
      qrSvg={qrSvg}
    />
  );
}

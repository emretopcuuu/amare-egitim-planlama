import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import DegerlerAkis from "./DegerlerAkis";

export const metadata = { title: "Değerlerini Keşfet — Liderlik Aynası" };
export const dynamic = "force-dynamic";

// DEĞERLER ÇALIŞMASI — onboarding'de Pusula'dan (nedenler) hemen önce.
// Tamamlandıysa ana akışa dön (akis.ts bir sonraki adıma taşır).
export default async function DegerlerSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const { data } = await supabaseAdmin()
    .from("degerler_calismasi")
    .select("tamamlandi_at")
    .eq("participant_id", session.sub)
    .maybeSingle();
  if (data?.tamamlandi_at) redirect("/");

  return <DegerlerAkis />;
}

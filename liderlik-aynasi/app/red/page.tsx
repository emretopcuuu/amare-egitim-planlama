import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import ReddiKutla from "./ReddiKutla";

// FAZ 3 — Reddi Kutla. Go-for-No: ret bir kayıp değil, Tecrübe Puanı.
export default async function RedSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/");

  const db = supabaseAdmin();
  // eslint-disable-next-line react-hooks/purity
  const haftaBasi = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [{ count: toplam }, { count: hafta }] = await Promise.all([
    db.from("redler").select("id", { count: "exact", head: true }).eq("participant_id", session.sub),
    db
      .from("redler")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", session.sub)
      .gte("created_at", haftaBasi),
  ]);

  return <ReddiKutla toplam={toplam ?? 0} hafta={hafta ?? 0} />;
}

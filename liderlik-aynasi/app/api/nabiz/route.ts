import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";

// #5 Topluluk nabzı: anlık kolektif aktivite sayıları (gizlilik yok, sadece rakam).
export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ gorevde: 0, red: 0, takdir: 0 }, { status: 401 });
  }
  const db = supabaseAdmin();
  const istBugun = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
  }).format(new Date());
  const bugunBas = new Date(`${istBugun}T00:00:00+03:00`).toISOString();

  const [{ count: gorevde }, { count: red }, { count: takdir }] = await Promise.all([
    db.from("missions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("redler").select("id", { count: "exact", head: true }).gte("created_at", bugunBas),
    db.from("kudos").select("id", { count: "exact", head: true }).gte("created_at", bugunBas),
  ]);

  return Response.json({
    gorevde: gorevde ?? 0,
    red: red ?? 0,
    takdir: takdir ?? 0,
  });
}

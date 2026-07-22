import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { duvarToggle } from "@/lib/sozDuvari";

// [B#14] Söz duvarı opt-in aç/kapa (kişinin KENDİ sözü).
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "yetkisiz" }, { status: 401 });
  }
  let g: { duvarda?: unknown };
  try {
    g = await req.json();
  } catch {
    return Response.json({ hata: "geçersiz" }, { status: 400 });
  }
  if (typeof g.duvarda !== "boolean") {
    return Response.json({ hata: "geçersiz" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const ok = await duvarToggle(db, session.sub, g.duvarda);
  return Response.json({ ok });
}

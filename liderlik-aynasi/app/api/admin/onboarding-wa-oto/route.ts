import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { yazAuditLog } from "@/lib/auditLog";

// Otomatik onboarding WhatsApp dürtmesini AÇ/KAPA (settings.onboarding_wa_oto).
// Varsayılan KAPALI; admin buradan açınca cron (kamp öncesi) devreye girer.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "admin") {
    return Response.json({ hata: "Yetkisiz" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { acik?: boolean } | null;
  const acik = body?.acik === true;
  const db = supabaseAdmin();
  await db
    .from("settings")
    .upsert(
      { key: "onboarding_wa_oto", value: acik ? "true" : "false", updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  await yazAuditLog(db, session.sub, "onboarding_wa_oto", { acik });
  return Response.json({ ok: true, acik });
}

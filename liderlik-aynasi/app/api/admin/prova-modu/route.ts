import { NextRequest, NextResponse } from "next/server";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { yazAuditLog } from "@/lib/auditLog";

export async function POST(req: NextRequest) {
  const session = await adminOturumu();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const acik: boolean = !!body?.acik;

  const db = supabaseAdmin();
  const { error } = await db.from("settings").upsert(
    { key: "prova_modu", value: acik ? "true" : "false", updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  if (error) return NextResponse.json({ hata: error.message }, { status: 500 });

  await yazAuditLog(db, session.sub, acik ? "prova_acildi" : "prova_kapatildi", {}, req);

  return NextResponse.json({ tamam: true });
}

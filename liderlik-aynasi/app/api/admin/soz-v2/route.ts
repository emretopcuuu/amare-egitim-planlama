import { NextRequest, NextResponse } from "next/server";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { yazAuditLog } from "@/lib/auditLog";

// SÖZ v2 (kapanış) admin: pencereyi aç/kapa + tamamlanma (sesli söz veren sayısı).
export async function GET() {
  const session = await adminOturumu();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const db = supabaseAdmin();
  const [{ data: ayar }, { count: toplam }, { count: tamam }] = await Promise.all([
    db.from("settings").select("value").eq("key", "soz_v2_acik").maybeSingle(),
    db.from("participants").select("id", { count: "exact", head: true }).eq("role", "participant"),
    db.from("soz").select("participant_id", { count: "exact", head: true }).eq("durum", "sesli"),
  ]);

  return NextResponse.json({
    acik: ayar?.value === "true",
    toplam: toplam ?? 0,
    tamam: tamam ?? 0,
  });
}

export async function POST(req: NextRequest) {
  const session = await adminOturumu();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (typeof body?.acik !== "boolean") {
    return NextResponse.json({ hata: "Geçersiz" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { error } = await db.from("settings").upsert(
    { key: "soz_v2_acik", value: body.acik ? "true" : "false", updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  if (error) return NextResponse.json({ hata: error.message }, { status: 500 });
  await yazAuditLog(db, session.sub, body.acik ? "soz_v2_acildi" : "soz_v2_kapatildi", {}, req);
  return NextResponse.json({ tamam: true });
}

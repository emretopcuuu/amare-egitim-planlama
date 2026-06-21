import { NextRequest, NextResponse } from "next/server";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { yazAuditLog } from "@/lib/auditLog";

// HEDEF (Faz A, Gün 2) admin: pencereyi aç/kapa + tamamlanma. Nedenler keşfinden
// sonra, kampa girmiş aday nedeninden somut bir kariyer hedefi belirler. Bu ayar
// (hedef_acik) açılmazsa aday bu aşamaya girmez.
export async function GET() {
  const session = await adminOturumu();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const db = supabaseAdmin();
  const [{ data: ayar }, { count: toplam }, { count: tamam }] = await Promise.all([
    db.from("settings").select("value").eq("key", "hedef_acik").maybeSingle(),
    db.from("participants").select("id", { count: "exact", head: true }).eq("role", "participant"),
    db
      .from("hedef")
      .select("participant_id", { count: "exact", head: true })
      .not("tamamlandi_at", "is", null),
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
    {
      key: "hedef_acik",
      value: body.acik ? "true" : "false",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
  if (error) return NextResponse.json({ hata: error.message }, { status: 500 });
  await yazAuditLog(db, session.sub, body.acik ? "hedef_acildi" : "hedef_kapatildi", {}, req);
  return NextResponse.json({ tamam: true });
}

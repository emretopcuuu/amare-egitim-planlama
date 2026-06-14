import { NextRequest, NextResponse } from "next/server";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { yazAuditLog } from "@/lib/auditLog";

// GET: planlanmış eylemler listesi
export async function GET() {
  const session = await adminOturumu();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("scheduled_events")
    .select("id, event_type, wave_id, fire_at, fired, fired_at, cancelled, created_at")
    .eq("cancelled", false)
    .order("fire_at");

  if (error) return NextResponse.json({ hata: error.message }, { status: 500 });
  return NextResponse.json({ olaylar: data });
}

// POST: yeni zamanlama ekle
export async function POST(req: NextRequest) {
  const session = await adminOturumu();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { event_type, wave_id, fire_at } = body ?? {};
  if (!event_type || !fire_at)
    return NextResponse.json({ hata: "event_type ve fire_at zorunlu" }, { status: 400 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("scheduled_events")
    .insert({ event_type, wave_id: wave_id ?? null, fire_at })
    .select("id")
    .single();

  if (error) return NextResponse.json({ hata: error.message }, { status: 500 });

  await yazAuditLog(db, session.sub, "zamanlama_eklendi", { event_type, fire_at }, req);

  return NextResponse.json({ id: data.id });
}

// DELETE: zamanlama iptal
export async function DELETE(req: NextRequest) {
  const session = await adminOturumu();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ hata: "id gerekli" }, { status: 400 });

  const db = supabaseAdmin();
  const { error } = await db
    .from("scheduled_events")
    .update({ cancelled: true })
    .eq("id", Number(id))
    .eq("fired", false);

  if (error) return NextResponse.json({ hata: error.message }, { status: 500 });

  await yazAuditLog(db, session.sub, "zamanlama_iptal", { id }, req);

  return NextResponse.json({ tamam: true });
}

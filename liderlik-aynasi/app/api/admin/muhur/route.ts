import { NextRequest, NextResponse } from "next/server";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { yazAuditLog } from "@/lib/auditLog";

// A2 — Mühür Açılışı penceresini aç/kapa + "kaç kişi söz mühürledi" panosu.
// Mühürlü söz = onboarding Ses Ritüeli'nde kaydı saklanan (sample_path olan)
// katılımcı. Mührü olmayan (sessiz ayna seçen) kişiler reveal'i atlar.
export async function GET() {
  const session = await adminOturumu();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const db = supabaseAdmin();
  const [parts, muhurlu, ayar] = await Promise.all([
    db.from("participants").select("id", { count: "exact", head: true }).eq("role", "participant"),
    db
      .from("voice_profiles")
      .select("participant_id", { count: "exact", head: true })
      .not("sample_path", "is", null),
    db.from("settings").select("value").eq("key", "muhur_acik").maybeSingle(),
  ]);

  return NextResponse.json({
    acik: ayar.data?.value === "true",
    toplam: parts.count ?? 0,
    muhurlu: muhurlu.count ?? 0,
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
    { key: "muhur_acik", value: body.acik ? "true" : "false", updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  if (error) return NextResponse.json({ hata: error.message }, { status: 500 });
  await yazAuditLog(db, session.sub, body.acik ? "muhur_acildi" : "muhur_kapatildi", {}, req);
  return NextResponse.json({ tamam: true });
}

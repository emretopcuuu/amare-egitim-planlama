import { NextRequest, NextResponse } from "next/server";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { yazAuditLog } from "@/lib/auditLog";

// Tek atama düzenleme: admin beğenmediği bir gözlem hedefini elle değiştirir
// (tüm eşleştirmeyi yeniden çalıştırmadan). Bir gözlemcinin hedeflerinden
// birini başka uygun bir kişiyle takas eder. Tip "shadow" (gizli) korunur.
export async function POST(req: NextRequest) {
  const session = await adminOturumu();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const observerId = typeof body?.observerId === "string" ? body.observerId : null;
  const eskiTargetId = typeof body?.eskiTargetId === "string" ? body.eskiTargetId : null;
  const yeniTargetId = typeof body?.yeniTargetId === "string" ? body.yeniTargetId : null;
  if (!observerId || !eskiTargetId || !yeniTargetId) {
    return NextResponse.json({ hata: "Geçersiz istek" }, { status: 400 });
  }
  if (yeniTargetId === observerId) {
    return NextResponse.json({ hata: "Kişi kendini gözlemleyemez." }, { status: 400 });
  }
  if (yeniTargetId === eskiTargetId) {
    return NextResponse.json({ hata: "Aynı kişi." }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Yeni hedef gerçek bir katılımcı mı?
  const { data: yeniKisi } = await db
    .from("participants")
    .select("id, full_name")
    .eq("id", yeniTargetId)
    .eq("role", "participant")
    .maybeSingle();
  if (!yeniKisi) {
    return NextResponse.json({ hata: "Yeni hedef bulunamadı." }, { status: 404 });
  }

  // Bu gözlemci yeni hedefi zaten gözlüyor mu? (çift olmasın)
  const { data: zaten } = await db
    .from("assignments")
    .select("id")
    .eq("observer_id", observerId)
    .eq("target_id", yeniTargetId)
    .eq("type", "shadow")
    .maybeSingle();
  if (zaten) {
    return NextResponse.json(
      { hata: "Bu kişiyi zaten gözlüyor — başka biri seç." },
      { status: 409 }
    );
  }

  // Eski atamayı yeni hedefe taşı.
  const { data: guncel, error } = await db
    .from("assignments")
    .update({ target_id: yeniTargetId })
    .eq("observer_id", observerId)
    .eq("target_id", eskiTargetId)
    .eq("type", "shadow")
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ hata: error.message }, { status: 500 });
  if (!guncel) {
    return NextResponse.json({ hata: "Düzenlenecek atama bulunamadı." }, { status: 404 });
  }

  await yazAuditLog(
    db,
    session.sub,
    "eslestirme_duzenlendi",
    { observerId, eskiTargetId, yeniTargetId },
    req
  );
  return NextResponse.json({ tamam: true });
}

import { NextRequest, NextResponse } from "next/server";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { aynaAniUret } from "@/lib/ayna";
import { yazAuditLog } from "@/lib/auditLog";

export const maxDuration = 60;

// #3 Ayna Anı manuel tetik: admin tek bir aday için kamp içi "gördün mü?" anını
// üretir ve mühürler. İstemci uygun adayların id'lerini tek tek gönderir (her
// çağrı bir Opus üretimi — toplu istek zaman aşımına uğramasın diye böldük).
export async function POST(req: NextRequest) {
  const session = await adminOturumu();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const pid = typeof body?.participantId === "string" ? body.participantId : null;
  if (!pid) return NextResponse.json({ hata: "Geçersiz istek" }, { status: 400 });

  const db = supabaseAdmin();

  // Zaten anı varsa atla (yarış / tekrar tıklama güvenliği).
  const { data: mevcut } = await db
    .from("mirror_moments")
    .select("participant_id")
    .eq("participant_id", pid)
    .maybeSingle();
  if (mevcut) return NextResponse.json({ uretildi: false, atlandi: true });

  const { data: kisi } = await db
    .from("participants")
    .select("id, full_name")
    .eq("id", pid)
    .maybeSingle();
  if (!kisi) return NextResponse.json({ hata: "Kişi bulunamadı" }, { status: 404 });

  const govde = await aynaAniUret(db, { id: kisi.id, full_name: kisi.full_name });
  if (!govde) return NextResponse.json({ uretildi: false, atlandi: true });

  await db
    .from("mirror_moments")
    .upsert(
      { participant_id: pid, body: govde },
      { onConflict: "participant_id", ignoreDuplicates: true }
    );

  await yazAuditLog(db, session.sub, "ayna_ani_tetiklendi", { participantId: pid }, req);
  return NextResponse.json({ uretildi: true });
}

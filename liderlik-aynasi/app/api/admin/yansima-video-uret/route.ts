import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { yansimaUret, bekleyenleriIsle } from "@/lib/yansima-pipeline";
import { tr } from "@/lib/i18n/tr";

// Yansıma video pipeline'ı admin tetikleyicisi.
// POST { katilimciId } → tek katılımcı için pipeline başlatır.
// POST { toplu: true } → bekleyen tüm kayıtları (max 5) işler.
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }

  let govde: { katilimciId?: unknown; toplu?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: "geçersiz istek" }, { status: 400 });
  }

  // Toplu işleme
  if (govde.toplu === true) {
    const n = await bekleyenleriIsle();
    return Response.json({ ok: true, islenen: n });
  }

  // Tek katılımcı
  const katilimciId = govde.katilimciId;
  if (typeof katilimciId !== "string") {
    return Response.json({ hata: "katilimciId gerekli" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Durumu 'bekliyor' yap (pipeline zaten hazır ise atlar)
  await db
    .from("voice_profiles")
    .update({ video_status: "bekliyor" })
    .eq("participant_id", katilimciId)
    .eq("video_status", "yok");

  // Arka planda çalıştır (await yok — response hemen döner)
  void yansimaUret(katilimciId);

  return Response.json({ ok: true, basladi: true });
}

// GET → belirli bir katılımcının video durumunu döner
export async function GET(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }

  const katilimciId = new URL(req.url).searchParams.get("id");
  if (!katilimciId) {
    return Response.json({ hata: "id gerekli" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data } = await db
    .from("voice_profiles")
    .select("video_status, video_path, audio_path, video_request_id")
    .eq("participant_id", katilimciId)
    .maybeSingle();

  return Response.json(data ?? { video_status: "yok" });
}

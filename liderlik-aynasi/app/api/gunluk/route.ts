import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";

// #5 Günlük mikro check-in: kişi günde bir, hangi liderlik özelliğini yaşadığını
// işaretler (+ isteğe bağlı bir cümle). Alışkanlık döngüsü + kişisel iz.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "Yetkisiz" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as
    | { traitId?: unknown; notu?: unknown }
    | null;
  const traitId = Number(body?.traitId);
  if (!Number.isInteger(traitId)) {
    return Response.json({ hata: "Geçersiz" }, { status: 400 });
  }
  const notu = typeof body?.notu === "string" ? body.notu.trim().slice(0, 400) || null : null;
  const tarih = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
  }).format(new Date());

  const db = supabaseAdmin();
  const { error } = await db
    .from("gunluk_checkin")
    .upsert(
      { participant_id: session.sub, tarih, trait_id: traitId, notu },
      { onConflict: "participant_id,tarih" }
    );
  if (error) return Response.json({ hata: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

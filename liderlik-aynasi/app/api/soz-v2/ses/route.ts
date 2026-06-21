import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 30;
const AZAMI_BAYT = 12 * 1024 * 1024;

// SÖZ v2 ses: kişi sözünü KENDİ sesiyle okuyup kaydeder. sesler bucket'ına yazılır,
// soz.voice_path güncellenir, durum 'sesli' olur (söz tamamlanmış sayılır).
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "yetkisiz" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const form = await req.formData();
  const ses = form.get("ses");
  if (!(ses instanceof File) || ses.size === 0 || ses.size > AZAMI_BAYT) {
    return Response.json({ hata: "ses-yok" }, { status: 400 });
  }
  const uz = ses.type.includes("mp4") ? "mp4" : "webm";
  const yol = `${session.sub}/soz-v2.${uz}`;
  const yuk = await db.storage
    .from("sesler")
    .upload(yol, ses, { contentType: ses.type || "audio/webm", upsert: true });
  if (yuk.error) return Response.json({ hata: "yukleme" }, { status: 500 });

  const { error } = await db
    .from("soz")
    .update({ voice_path: yol, durum: "sesli", kayit_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("participant_id", session.sub);
  if (error) return Response.json({ hata: "kayit" }, { status: 500 });
  return Response.json({ ok: true });
}

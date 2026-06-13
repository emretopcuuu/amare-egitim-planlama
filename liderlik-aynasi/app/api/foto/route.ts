import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 30;
const AZAMI_BAYT = 8 * 1024 * 1024;

// FOTOĞRAF YÜKLE: katılımcı an yakalar. Moderasyon için 'pending' kaydedilir;
// onaylanınca ortak duvarda ve büyük ekranda görünür.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }

  const form = await req.formData();
  const foto = form.get("foto");
  const altYaziHam = form.get("altYazi");
  const altYazi =
    typeof altYaziHam === "string" && altYaziHam.trim()
      ? altYaziHam.trim().slice(0, 140)
      : null;

  if (!(foto instanceof File) || foto.size === 0) {
    return Response.json({ hata: tr.duvar.hata }, { status: 400 });
  }
  if (foto.size > AZAMI_BAYT || !foto.type.startsWith("image/")) {
    return Response.json({ hata: tr.duvar.hataBoyut }, { status: 413 });
  }

  const db = supabaseAdmin();
  const ext = foto.type.includes("png") ? "png" : foto.type.includes("webp") ? "webp" : "jpg";
  const yol = `anilar/${crypto.randomUUID()}.${ext}`;
  const yukleme = await db.storage
    .from("sesler")
    .upload(yol, foto, { contentType: foto.type, upsert: false });
  if (yukleme.error) {
    return Response.json({ hata: tr.duvar.hata }, { status: 500 });
  }

  const { error } = await db.from("photos").insert({
    participant_id: session.sub,
    path: yol,
    caption: altYazi,
  });
  if (error) {
    return Response.json({ hata: tr.duvar.hata }, { status: 500 });
  }
  return Response.json({ ok: true });
}

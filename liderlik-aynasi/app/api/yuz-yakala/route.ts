import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 30;
const AZAMI_BAYT = 6 * 1024 * 1024;
const ACILAR = ["duz", "sag", "sol"] as const;

// "Canlı Ayna" — selfie sonrası çoklu açılı yakın yüz kareleri. Video üretiminde
// mimik malzemesi için. participants.yuz_fotolari = [{aci, path}].
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }

  const form = await req.formData();
  const db = supabaseAdmin();
  const sonuc: { aci: string; path: string }[] = [];

  for (const aci of ACILAR) {
    const f = form.get(aci);
    if (!(f instanceof File) || f.size === 0) continue;
    if (f.size > AZAMI_BAYT || !f.type.startsWith("image/")) {
      return Response.json({ hata: tr.duvar.hataBoyut }, { status: 413 });
    }
    const ext = f.type.includes("png") ? "png" : f.type.includes("webp") ? "webp" : "jpg";
    const yol = `yuz/${session.sub}/${aci}-${crypto.randomUUID()}.${ext}`;
    const up = await db.storage
      .from("sesler")
      .upload(yol, f, { contentType: f.type, upsert: false });
    if (up.error) {
      return Response.json({ hata: tr.duvar.hata }, { status: 500 });
    }
    sonuc.push({ aci, path: yol });
  }

  if (sonuc.length === 0) {
    return Response.json({ hata: tr.duvar.hata }, { status: 400 });
  }

  const { error } = await db
    .from("participants")
    .update({ yuz_fotolari: sonuc })
    .eq("id", session.sub);
  if (error) {
    return Response.json({ hata: tr.duvar.hata }, { status: 500 });
  }
  return Response.json({ ok: true, sayi: sonuc.length });
}

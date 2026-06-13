import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";

// Giriş yapan katılımcının hayalet silüetine kısa ömürlü imzalı URL +
// "berraklık" (0..1): yolculuk ilerledikçe sudaki yansıma netleşir.
// Berraklık = taban + ritüel + öz-puan + başkalarını puanlama + rapor açılışı.
export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return NextResponse.json({ url: null, berraklik: 1 }, { status: 401 });
  }

  const db = supabaseAdmin();
  const [
    { data: profil },
    { count: ozSayi },
    { count: digerSayi },
    { data: raporAyar },
  ] = await Promise.all([
    db
      .from("voice_profiles")
      .select("face_path")
      .eq("participant_id", session.sub)
      .maybeSingle(),
    db
      .from("ratings")
      .select("id", { count: "exact", head: true })
      .eq("rater_id", session.sub)
      .eq("is_self", true),
    db
      .from("ratings")
      .select("id", { count: "exact", head: true })
      .eq("rater_id", session.sub)
      .eq("is_self", false),
    db.from("settings").select("value").eq("key", "reports_visible").maybeSingle(),
  ]);

  let berraklik = 0.25; // taban: yansıma hiçbir zaman tamamen kapkaranlık değil
  if (profil) berraklik += 0.2; // ses ritüeline başladı
  if ((ozSayi ?? 0) > 0) berraklik += 0.2; // kendini puanladı
  berraklik += 0.2 * Math.min(1, (digerSayi ?? 0) / 15); // başkalarını gözledi
  if (raporAyar?.value === "true") berraklik += 0.15; // aynan açıldı
  berraklik = Math.min(1, berraklik);

  let url: string | null = null;
  if (profil?.face_path) {
    const { data: imzali } = await db.storage
      .from("sesler")
      .createSignedUrl(profil.face_path, 3600);
    url = imzali?.signedUrl ?? null;
  }

  return NextResponse.json({ url, berraklik });
}

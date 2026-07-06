import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";

// [FAZ 6 · Yaşayan Plan] Söze mühürlenen bir aksiyon adımını tamamlandı/geri-al
// olarak işaretle. index = soz.aksiyonlar dizisindeki sıra (sabit; söz mühürlenince
// kilitlenir). tamam=true → satır ekle (idempotent), false → sil.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "yetkisiz" }, { status: 401 });
  }

  let g: { index?: unknown; tamam?: unknown };
  try {
    g = await req.json();
  } catch {
    return Response.json({ hata: "geçersiz" }, { status: 400 });
  }
  if (typeof g.index !== "number" || g.index < 0 || g.index > 20 || typeof g.tamam !== "boolean") {
    return Response.json({ hata: "geçersiz" }, { status: 400 });
  }
  const idx = Math.round(g.index);

  const db = supabaseAdmin();
  if (g.tamam) {
    const { error } = await db
      .from("soz_aksiyon_tamam")
      .upsert(
        { participant_id: session.sub, aksiyon_index: idx },
        { onConflict: "participant_id,aksiyon_index" }
      );
    if (error) return Response.json({ hata: "sunucu hatası" }, { status: 500 });
  } else {
    const { error } = await db
      .from("soz_aksiyon_tamam")
      .delete()
      .eq("participant_id", session.sub)
      .eq("aksiyon_index", idx);
    if (error) return Response.json({ hata: "sunucu hatası" }, { status: 500 });
  }
  return Response.json({ ok: true });
}

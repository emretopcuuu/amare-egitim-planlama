import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sahitOl } from "@/lib/sozMuhur";

// [E3] Yüz yüze şahitlik: şahit, söz verenin QR'ındaki token ile onaylar → imzalı
// soz_tanik oluşur. Şahit kendi oturumuyla çağırır.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "Oturum gerekli" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { token?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const sonuc = await sahitOl(supabaseAdmin(), token, session.sub);
  if (!sonuc.ok) {
    const durum = sonuc.sebep === "bulunamadi" || sonuc.sebep === "kendine" ? 400 : 500;
    return Response.json({ hata: "Şahitlik kaydedilemedi", sebep: sonuc.sebep }, { status: durum });
  }
  return Response.json({ ok: true, sahibiAd: sonuc.sahibiAd });
}

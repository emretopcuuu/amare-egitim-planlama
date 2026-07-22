import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ara360Kaydet } from "@/lib/ara360";

// [E#38] 45. gün ara-360 yanıtlarını kaydet (kişi başına bir kez).
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "yetkisiz" }, { status: 401 });
  }
  let g: { korNokta?: unknown; gelisim?: unknown; netlik?: unknown; enerji?: unknown };
  try {
    g = await req.json();
  } catch {
    return Response.json({ hata: "geçersiz" }, { status: 400 });
  }
  const num = (v: unknown) => Number(v);
  const gelisim = num(g.gelisim);
  const netlik = num(g.netlik);
  const enerji = num(g.enerji);
  if ([gelisim, netlik, enerji].some((n) => !Number.isFinite(n))) {
    return Response.json({ hata: "geçersiz" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const ok = await ara360Kaydet(
    db,
    session.sub,
    typeof g.korNokta === "string" ? g.korNokta : null,
    { gelisim, netlik, enerji }
  );
  return Response.json({ ok });
}

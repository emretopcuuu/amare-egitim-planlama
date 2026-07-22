import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tahminKaydet } from "@/lib/haftalikTahmin";
import { haftaBaslangici } from "@/lib/momentum";

// [C#27] Haftalık tahmin kaydet — kişi bu haftaki görüşme hedefini girer.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "yetkisiz" }, { status: 401 });
  }
  let g: { tahmin?: unknown };
  try {
    g = await req.json();
  } catch {
    return Response.json({ hata: "geçersiz" }, { status: 400 });
  }
  const n = Number(g.tahmin);
  if (!Number.isFinite(n) || n < 0) {
    return Response.json({ hata: "geçersiz" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const ok = await tahminKaydet(db, session.sub, haftaBaslangici(new Date()), n);
  return Response.json({ ok });
}

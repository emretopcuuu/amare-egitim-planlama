import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { checkin, takipDurum } from "@/lib/sozTakip";

// 90 gün takip — GET: durum (seri, son14, kaçırılan). POST: günlük check-in.
export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "yetkisiz" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const durum = await takipDurum(db, session.sub);
  return Response.json(durum);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "yetkisiz" }, { status: 401 });
  }
  let g: { yapildi?: unknown; notlar?: unknown };
  try {
    g = await req.json();
  } catch {
    return Response.json({ hata: "geçersiz" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const ok = await checkin(
    db,
    session.sub,
    g.yapildi !== false,
    typeof g.notlar === "string" ? g.notlar : null
  );
  if (!ok) return Response.json({ hata: "kayit" }, { status: 500 });
  const durum = await takipDurum(db, session.sub);
  return Response.json({ ok: true, durum });
}

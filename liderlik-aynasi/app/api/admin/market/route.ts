import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { teslimEt } from "@/lib/market";

export const maxDuration = 20;

// G1 — market admin: prestij teslim işaretleme + market bayrağını aç/kapat.
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: "Yetkisiz" }, { status: 403 });
  }
  const g = (await req.json().catch(() => ({}))) as { eylem?: string; islemId?: string; acik?: boolean };
  const db = supabaseAdmin();

  if (g.eylem === "teslim" && typeof g.islemId === "string") {
    const ok = await teslimEt(db, g.islemId);
    return Response.json(ok ? { ok: true } : { hata: "İşaretlenemedi" }, { status: ok ? 200 : 400 });
  }

  if (g.eylem === "bayrak") {
    await db.from("settings").upsert({
      key: "market_acik",
      value: g.acik ? "true" : "false",
      updated_at: new Date().toISOString(),
    });
    return Response.json({ ok: true, acik: !!g.acik });
  }

  return Response.json({ hata: "Geçersiz eylem" }, { status: 400 });
}

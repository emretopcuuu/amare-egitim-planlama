import { supabaseAdmin } from "@/lib/supabase/server";
import { MINI360_IFADELER } from "@/lib/onFarkindalik";
import { tr } from "@/lib/i18n/tr";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AZAMI_DIS = 12; // hedef başına anonim puan tavanı (spam koruması)

// Mini 360 — ANONİM dış puan (girişsiz, herkese açık link). Kim verdiği saklanmaz.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const targetId = typeof body?.targetId === "string" ? body.targetId : "";
  if (!UUID_RE.test(targetId)) {
    return Response.json({ hata: tr.mini360.hata }, { status: 400 });
  }

  const db = supabaseAdmin();
  // #9: aktif tur — dış puanlar tur'a etiketlenir, tavan tur başınadır.
  const { data: turAyar } = await db.from("settings").select("value").eq("key", "mini360_tur").maybeSingle();
  const tur = Math.max(1, parseInt(turAyar?.value ?? "1", 10) || 1);

  const satir: Record<string, number | string> = { target_id: targetId, tur };
  for (const i of MINI360_IFADELER) {
    const v = Number(body?.[i.kod]);
    if (!Number.isInteger(v) || v < 1 || v > 5) {
      return Response.json({ hata: tr.mini360.hata }, { status: 400 });
    }
    satir[i.kod] = v;
  }

  // Hedef gerçek bir katılımcı mı + bu tur için tavan kontrolü.
  const [{ data: hedef }, { count }] = await Promise.all([
    db.from("participants").select("id").eq("id", targetId).eq("role", "participant").maybeSingle(),
    db.from("mini360_dis").select("id", { count: "exact", head: true }).eq("target_id", targetId).eq("tur", tur),
  ]);
  if (!hedef) return Response.json({ hata: tr.mini360.hata }, { status: 404 });
  if ((count ?? 0) >= AZAMI_DIS) {
    return Response.json({ hata: tr.mini360.disDolu }, { status: 409 });
  }

  const { error } = await db.from("mini360_dis").insert(satir as never);
  if (error) return Response.json({ hata: tr.mini360.hata }, { status: 500 });
  return Response.json({ ok: true });
}

import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { MINI360_IFADELER } from "@/lib/onFarkindalik";
import { tr } from "@/lib/i18n/tr";

// Mini 360 — kişinin KENDİ puanı (girişli). 6 ifade × 1-5.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const satir: Record<string, number | string> = { participant_id: session.sub, updated_at: new Date().toISOString() };
  for (const i of MINI360_IFADELER) {
    const v = Number(body?.[i.kod]);
    if (!Number.isInteger(v) || v < 1 || v > 5) {
      return Response.json({ hata: tr.mini360.hata }, { status: 400 });
    }
    satir[i.kod] = v;
  }
  const { error } = await supabaseAdmin()
    .from("mini360_oz")
    .upsert(satir as never, { onConflict: "participant_id" });
  if (error) return Response.json({ hata: tr.mini360.hata }, { status: 500 });
  return Response.json({ ok: true });
}

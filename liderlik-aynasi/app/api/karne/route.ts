import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { karneKaydet, buHaftaAnahtari } from "@/lib/pazarKarnesi";

// P10 Pazar Karnesi ucu: bu haftanın 3 sayısı → kayıt + kamp arkadaşına rapor.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "Yetkisiz" }, { status: 401 });
  }
  const g = (await req.json().catch(() => ({}))) as {
    davet?: unknown;
    gorusme?: unknown;
    takip?: unknown;
  };
  const say = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);
  const db = supabaseAdmin();
  const hafta = buHaftaAnahtari(new Date());
  const ok = await karneKaydet(db, session.sub, hafta, {
    davet: say(g.davet),
    gorusme: say(g.gorusme),
    takip: say(g.takip),
  });
  return ok ? Response.json({ ok: true }) : Response.json({ hata: "Kaydedilemedi" }, { status: 500 });
}

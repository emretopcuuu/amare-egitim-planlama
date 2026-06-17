import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { kocuGecmis, kocuTuru } from "@/lib/kocu";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 60;

// AYNA KOÇU — GET: sohbet geçmişi. POST: bir tur (mesaj null ise karşılama üretir).
export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.kocu.hata }, { status: 401 });
  }
  const gecmis = await kocuGecmis(supabaseAdmin(), session.sub);
  return Response.json({ gecmis });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.kocu.hata }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const mesaj = typeof body?.mesaj === "string" ? body.mesaj : null;

  const tur = await kocuTuru(
    supabaseAdmin(),
    { id: session.sub, full_name: session.ad },
    mesaj
  );
  if (!tur) return Response.json({ hata: tr.kocu.uretilemedi }, { status: 503 });
  return Response.json(tur);
}

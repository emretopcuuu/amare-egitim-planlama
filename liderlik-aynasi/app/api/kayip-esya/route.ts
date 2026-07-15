import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { kayipDurum, kayipBul } from "@/lib/kayipEsya";

export const maxDuration = 15;

// G8 — GET: aktif kayıp eşya durumu (KayipNokta poll). POST: noktaya dokun.
export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") return Response.json({ durum: null }, { status: 401 });
  const db = supabaseAdmin();
  return Response.json({ durum: await kayipDurum(db, session.sub, new Date()) });
}

export async function POST() {
  const session = await getSession();
  if (!session || session.rol !== "participant") return Response.json({ hata: "Yetkisiz" }, { status: 401 });
  const db = supabaseAdmin();
  const { data: kisi } = await db.from("participants").select("full_name").eq("id", session.sub).maybeSingle();
  const odul = await kayipBul(db, session.sub, kisi?.full_name ?? "Birisi", new Date());
  if (!odul) return Response.json({ hata: "Şu an alınabilir bir şey yok." }, { status: 400 });
  return Response.json({ ok: true, odul });
}

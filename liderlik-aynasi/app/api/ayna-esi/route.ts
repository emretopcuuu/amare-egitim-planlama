import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// AYNA EŞİ — katılımcı bir görüşmeyi "konuştuk" diye işaretler (kendi tarafını).
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!UUID_RE.test(id)) return Response.json({ hata: tr.aynaEsi.hata }, { status: 400 });

  const db = supabaseAdmin();
  const { data: satir } = await db
    .from("ayna_esi")
    .select("a_id, b_id")
    .eq("id", id)
    .maybeSingle();
  if (!satir || (satir.a_id !== session.sub && satir.b_id !== session.sub)) {
    return Response.json({ hata: tr.aynaEsi.hata }, { status: 403 });
  }
  const alan = satir.a_id === session.sub ? { a_tamam: true } : { b_tamam: true };
  const { error } = await db.from("ayna_esi").update(alan as never).eq("id", id);
  if (error) return Response.json({ hata: tr.aynaEsi.hata }, { status: 500 });
  return Response.json({ ok: true });
}

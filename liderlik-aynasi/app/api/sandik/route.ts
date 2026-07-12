import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sandikAc } from "@/lib/sandik";

export const maxDuration = 20;

// G2 — sandık aç (yalnız katılımcı). Ödül sunucuda seçilir; istemci sadece
// sonucu görür. Hak yoksa/ kapalıysa reddedilir.
export async function POST() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "Yetkisiz" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { data: kisi } = await db.from("participants").select("full_name").eq("id", session.sub).maybeSingle();
  const odul = await sandikAc(db, session.sub, kisi?.full_name ?? "Birisi");
  if (!odul) return Response.json({ hata: "Açılacak sandık yok." }, { status: 400 });
  return Response.json({ ok: true, odul });
}

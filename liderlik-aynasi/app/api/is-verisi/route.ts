import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isVerisiKaydet } from "@/lib/isVerisi";
import { tr } from "@/lib/i18n/tr";

// [5.4] İŞ VERİSİ KÖPRÜSÜ — kişi bir haftanın gerçek sayılarını kaydeder.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as {
    hafta?: unknown;
    gorusme?: unknown;
    kayit?: unknown;
    takip?: unknown;
  } | null;

  const hafta = Number(body?.hafta);
  const db = supabaseAdmin();
  const ok = await isVerisiKaydet(db, session.sub, hafta, {
    gorusme: Number(body?.gorusme),
    kayit: Number(body?.kayit),
    takip: Number(body?.takip),
  });
  if (!ok) return Response.json({ hata: tr.isVerisi.kayitHata }, { status: 400 });
  return Response.json({ ok: true });
}

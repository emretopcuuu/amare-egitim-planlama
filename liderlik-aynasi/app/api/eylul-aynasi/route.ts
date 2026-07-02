import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { eylulKayitEt, eylulAynasiAcikMi } from "@/lib/eylulAynasi";
import { tr } from "@/lib/i18n/tr";

// [5.2] EYLÜL AYNASI — kişi 2 aylık yansımasını + 0-10 puanını kaydeder.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { cevap?: unknown; puan?: unknown } | null;
  const cevap = typeof body?.cevap === "string" ? body.cevap : "";
  const puan = Number(body?.puan);

  const db = supabaseAdmin();
  if (!(await eylulAynasiAcikMi(db))) {
    return Response.json({ hata: tr.eylulAynasi.kayitHata }, { status: 409 });
  }
  const sonuc = await eylulKayitEt(db, session.sub, cevap, puan);
  if (!sonuc.ok) return Response.json({ hata: tr.eylulAynasi.kayitHata }, { status: 400 });
  return Response.json({ ok: true });
}

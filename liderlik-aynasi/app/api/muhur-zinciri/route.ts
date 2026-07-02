import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { halkaTeyitEt } from "@/lib/muhurZinciri";
import { tr } from "@/lib/i18n/tr";

// [4.2] ARA MÜHÜR ZİNCİRİ — kişi açık bir halkayı (30/60/90) tek cümlelik teyitle
// mühürler. Yalnız bayrağı açık ve henüz teyit edilmemiş halka kabul edilir.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as
    | { halka?: unknown; teyit?: unknown }
    | null;
  const halka = Number(body?.halka);
  const teyit = typeof body?.teyit === "string" ? body.teyit : "";

  const db = supabaseAdmin();
  const sonuc = await halkaTeyitEt(db, session.sub, halka, teyit);
  if (!sonuc.ok) {
    const durum = sonuc.sebep === "kapali" || sonuc.sebep === "zaten" ? 409 : 400;
    return Response.json({ hata: tr.muhurZinciri.teyitHata, sebep: sonuc.sebep }, { status: durum });
  }
  return Response.json({ ok: true });
}

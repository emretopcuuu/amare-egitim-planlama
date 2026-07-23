import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { taahhutKaydet, taahhutTamamla, type TaahhutGirdi } from "@/lib/ilk72";
import { tr } from "@/lib/i18n/tr";

// [E2] İlk 72 Saat — kişi 3 mikro adıma gün+saat kaydeder; ayrıca her taahhüdü
// "Yaptım ✓" ile kapatabilir.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as
    | { adimlar?: unknown; tamamla?: { adim?: unknown; yapildi?: unknown } }
    | null;

  // "Yaptım ✓" / geri al.
  if (body?.tamamla && typeof body.tamamla.adim !== "undefined") {
    const db = supabaseAdmin();
    const ok = await taahhutTamamla(
      db,
      session.sub,
      Number(body.tamamla.adim),
      body.tamamla.yapildi !== false
    );
    return Response.json({ ok });
  }

  const adimlar = Array.isArray(body?.adimlar) ? (body.adimlar as TaahhutGirdi[]) : [];
  if (adimlar.length === 0) {
    return Response.json({ hata: tr.ilk72.kayitHata }, { status: 400 });
  }
  const db = supabaseAdmin();
  const sonuc = await taahhutKaydet(db, session.sub, adimlar);
  if (!sonuc.ok) {
    return Response.json({ hata: tr.ilk72.kayitHata, sebep: sonuc.sebep }, { status: 400 });
  }
  return Response.json({ ok: true });
}

import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { herkeseBildir, katilimciyaBildir } from "@/lib/push";
import { DUYURU_SABLONLARI } from "@/lib/duyuruSablonlari";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 60;

// #9 + GELİŞTİRME #3 (2.tur): Duyuru/yayın. İki mod:
//  - {sablon}: hazır şablonu herkese gönder (mevcut davranış).
//  - {baslik, govde, hedef}: SERBEST metin; hedef "herkes" ya da bir takım adı.
// Yüksek etkili olduğundan tam yetkili admin'e özel.
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const db = supabaseAdmin();

  // Hazır şablon yolu (geriye uyumlu).
  if (body?.sablon) {
    const sablon = DUYURU_SABLONLARI.find((s) => s.anahtar === body.sablon);
    if (!sablon) return Response.json({ hata: tr.admin.duyuru.hata }, { status: 400 });
    await herkeseBildir(db, sablon.baslik, sablon.govde, "/program");
    return Response.json({ ok: true });
  }

  // Serbest metin yayını.
  const baslik = typeof body?.baslik === "string" ? body.baslik.trim().slice(0, 80) : "";
  const govde = typeof body?.govde === "string" ? body.govde.trim().slice(0, 300) : "";
  const hedef = typeof body?.hedef === "string" ? body.hedef : "herkes";
  if (!baslik || !govde) {
    return Response.json({ hata: tr.admin.yayin.hata }, { status: 400 });
  }

  if (hedef === "herkes") {
    await herkeseBildir(db, baslik, govde, "/");
    return Response.json({ ok: true, hedef: tr.admin.yayin.herkes });
  }

  const { data: kisiler } = await db
    .from("participants")
    .select("id")
    .eq("role", "participant")
    .eq("team", hedef);
  const idler = (kisiler ?? []).map((k) => k.id);
  if (idler.length === 0) {
    return Response.json({ hata: tr.admin.yayin.takimBos }, { status: 400 });
  }
  await Promise.all(idler.map((id) => katilimciyaBildir(db, id, baslik, govde, "/")));
  return Response.json({ ok: true, hedef, sayi: idler.length });
}

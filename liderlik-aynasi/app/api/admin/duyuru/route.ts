import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { herkeseBildir } from "@/lib/push";
import { DUYURU_SABLONLARI } from "@/lib/duyuruSablonlari";
import { tr } from "@/lib/i18n/tr";

// #9 Hazır duyuru: seçilen şablonu herkese push olarak gönderir. Yüksek etkili
// (herkese) olduğundan tam yetkili admin'e özel.
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }
  let govde: { sablon?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.admin.duyuru.hata }, { status: 400 });
  }
  const sablon = DUYURU_SABLONLARI.find((s) => s.anahtar === govde.sablon);
  if (!sablon) {
    return Response.json({ hata: tr.admin.duyuru.hata }, { status: 400 });
  }
  await herkeseBildir(supabaseAdmin(), sablon.baslik, sablon.govde, "/program");
  return Response.json({ ok: true });
}

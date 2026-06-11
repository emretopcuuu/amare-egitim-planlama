import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { raporlarGorunurMu } from "@/lib/rapor";
import { tr } from "@/lib/i18n/tr";

// Ayna Anı bekleme ekranının yokladığı uç: raporlar görünür mü?
// Salon dolusu telefon 5 sn'de bir sorar — yanıt bilinçli olarak minimal.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const acik = await raporlarGorunurMu(supabaseAdmin());
  return Response.json({ acik });
}

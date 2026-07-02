import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// FAZ 5.4 — İKİ KAPI: kişi bir kapıyı seçer. Seçilen görev 'pending' olur,
// aynı secim_grubu'ndaki diğer(ler)i 'expired'. Geri dönüş yok. Yalnız kendi
// secim_bekliyor görevini seçebilir.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { gorevId?: unknown } | null;
  const gorevId = typeof body?.gorevId === "string" ? body.gorevId : "";
  if (!gorevId) return Response.json({ hata: tr.gorevler.hata }, { status: 400 });

  const db = supabaseAdmin();
  const { data: secilen } = await db
    .from("missions")
    .select("id, secim_grubu, status")
    .eq("id", gorevId)
    .eq("participant_id", session.sub)
    .maybeSingle();
  if (!secilen || secilen.status !== "secim_bekliyor" || !secilen.secim_grubu) {
    return Response.json({ hata: tr.gorevler.hata }, { status: 409 });
  }

  const simdi = new Date().toISOString();
  // Seçilen → pending; gruptaki diğerleri → expired. (Yarış: yalnız hâlâ
  // secim_bekliyor olanları güncelle; ikinci istek boşa düşer.)
  const { error: acHata } = await db
    .from("missions")
    .update({ status: "pending", issued_at: simdi })
    .eq("id", secilen.id)
    .eq("status", "secim_bekliyor");
  if (acHata) return Response.json({ hata: tr.gorevler.hata }, { status: 500 });
  await db
    .from("missions")
    .update({ status: "expired" })
    .eq("secim_grubu", secilen.secim_grubu)
    .eq("status", "secim_bekliyor")
    .neq("id", secilen.id);

  return Response.json({ ok: true });
}

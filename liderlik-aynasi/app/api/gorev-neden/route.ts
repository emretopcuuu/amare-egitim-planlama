import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// FAZ 7.2 — "Neden?" tek dokunuş: süresi dolan görevin yerine kişi neden
// kaçırdığını işaretler. Sebep bir sonraki görev üretimini yönlendirir
// (lib/tik.ts okur → gorevUret'e taşır). Suçlama yok; yalnız yönlendirme.
const GECERLI = ["vakit", "anlamadim", "cekindim", "ilgi_yok"];

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { gorevId?: unknown; sebep?: unknown } | null;
  const gorevId = typeof body?.gorevId === "string" ? body.gorevId : "";
  const sebep = typeof body?.sebep === "string" ? body.sebep : "";
  if (!gorevId || !GECERLI.includes(sebep)) {
    return Response.json({ hata: tr.gorevler.hata }, { status: 400 });
  }
  const db = supabaseAdmin();
  // Yalnız kendi süresi dolmuş görevine sebep yazılabilir.
  const { error } = await db
    .from("missions")
    .update({ kacirma_sebebi: sebep })
    .eq("id", gorevId)
    .eq("participant_id", session.sub)
    .eq("status", "expired");
  if (error) return Response.json({ hata: tr.gorevler.hata }, { status: 500 });
  return Response.json({ ok: true });
}

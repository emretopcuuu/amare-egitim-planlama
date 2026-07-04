import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// Özellik 2 — KİMLİK CÜMLESİNİ BIRAKMA: yüzleşme kartındaki "Artık söyleyemem 🔥"
// butonu. Kişinin KENDİ cümlesine birakildi_at damgalanır; write-once (doluysa
// dokunmaz → idempotent, çift dokunuş güvenli). Bırakılan cümle bir daha ne
// çürütme hedefi olur ne de yeniden damıtılır (lib/kimlik.ts tekrar koruması).
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return Response.json({ hata: tr.ortak.genelHata }, { status: 400 });

  const db = supabaseAdmin();
  const { data: kayit } = await db
    .from("kimlik_cumleleri")
    .select("id, birakildi_at")
    .eq("id", id)
    .eq("participant_id", session.sub)
    .maybeSingle();
  if (!kayit) return Response.json({ hata: tr.ortak.genelHata }, { status: 404 });
  // İdempotent: zaten bırakılmışsa sessizce OK.
  if (kayit.birakildi_at) return Response.json({ ok: true });

  const { error } = await db
    .from("kimlik_cumleleri")
    .update({ birakildi_at: new Date().toISOString() })
    .eq("id", kayit.id)
    .is("birakildi_at", null);
  if (error) return Response.json({ hata: tr.ortak.genelHata }, { status: 500 });
  return Response.json({ ok: true });
}

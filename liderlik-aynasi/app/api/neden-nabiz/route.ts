import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// Özellik 6 — ÇEKİRDEK NEDEN NABZI cevabı: her 5. puanlanan görevden sonra
// sorulan "Bu görev seni çekirdek nedenine yaklaştırdı mı?" (1-5) sorusunun
// yanıtı. Yalnız oturum sahibinin KENDİ puanlanmış görevine yazılır; write-once
// (neden_nabiz doluysa dokunmaz → idempotent, çift dokunuş güvenli).
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { missionId?: unknown; puan?: unknown } | null;
  const missionId = typeof body?.missionId === "string" ? body.missionId : "";
  const puan = Number(body?.puan);
  if (!missionId || !Number.isInteger(puan) || puan < 1 || puan > 5) {
    return Response.json({ hata: tr.ortak.genelHata }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: gorev } = await db
    .from("missions")
    .select("id, status, neden_nabiz")
    .eq("id", missionId)
    .eq("participant_id", session.sub)
    .maybeSingle();
  if (!gorev) return Response.json({ hata: tr.ortak.genelHata }, { status: 404 });
  // Yalnız puanlanmış göreve nabız tutulur (soru zaten puanlama sonrası çıkar).
  if (gorev.status !== "scored") {
    return Response.json({ hata: tr.ortak.genelHata }, { status: 409 });
  }
  // İdempotent: ilk cevap kalır, tekrar gönderim sessizce OK döner.
  if (gorev.neden_nabiz !== null) return Response.json({ ok: true });

  const { error } = await db
    .from("missions")
    .update({ neden_nabiz: puan })
    .eq("id", gorev.id)
    .is("neden_nabiz", null);
  if (error) return Response.json({ hata: tr.ortak.genelHata }, { status: 500 });
  return Response.json({ ok: true });
}

import { getSession } from "@/lib/auth/session";
import { bayatOturumYaniti } from "@/lib/auth/bayatOturum";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 30;
const AZAMI_BAYT = 12 * 1024 * 1024;

// KAPANIŞ SÖZÜ: multipart → söz ver (Temmuz kayıt + Ağustos görüşme + ses);
// JSON → ilerleme güncelle (gerçekleşen kayıt/görüşme sayısı).
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const db = supabaseAdmin();
  const tip = req.headers.get("content-type") ?? "";

  // ---- İLERLEME GÜNCELLE (JSON) ----
  if (tip.includes("application/json")) {
    let govde: { kayit?: unknown; gorusme?: unknown };
    try {
      govde = await req.json();
    } catch {
      return Response.json({ hata: tr.kapanisSoz.hata }, { status: 400 });
    }
    const kayit = Math.max(0, Math.floor(Number(govde.kayit) || 0));
    const gorusme = Math.max(0, Math.floor(Number(govde.gorusme) || 0));
    const { data: guncellenen, error } = await db
      .from("pledges")
      .update({
        kayit_yapilan: kayit,
        gorusme_yapilan: gorusme,
        updated_at: new Date().toISOString(),
      })
      .eq("participant_id", session.sub)
      .select("participant_id");
    if (error) return Response.json({ hata: tr.kapanisSoz.hata }, { status: 500 });
    // Henüz söz vermemiş kişiye sahte "kaydedildi" deme — 0 satır güncellendiyse
    // sessiz veri kaybı yerine gerçek durumu söyle.
    if (!guncellenen || guncellenen.length === 0) {
      return Response.json({ hata: tr.kapanisSoz.hata }, { status: 404 });
    }
    return Response.json({ ok: true });
  }

  // ---- SÖZ VER (multipart) ----
  const form = await req.formData();
  const temmuz = Math.floor(Number(form.get("temmuz")));
  const agustos = Math.floor(Number(form.get("agustos")));
  if (!Number.isFinite(temmuz) || temmuz < 0 || !Number.isFinite(agustos) || agustos < 100) {
    return Response.json({ hata: tr.kapanisSoz.hataSayi }, { status: 400 });
  }

  let voicePath: string | null = null;
  const ses = form.get("ses");
  if (ses instanceof File && ses.size > 0 && ses.size <= AZAMI_BAYT) {
    const uz = ses.type.includes("mp4") ? "mp4" : "webm";
    const yol = `${session.sub}/kapanis-soz.${uz}`;
    const yuk = await db.storage
      .from("sesler")
      .upload(yol, ses, { contentType: ses.type || "audio/webm", upsert: true });
    if (!yuk.error) voicePath = yol;
  }

  const { error } = await db.from("pledges").upsert(
    {
      participant_id: session.sub,
      temmuz_kayit: temmuz,
      agustos_gorusme: agustos,
      ...(voicePath ? { voice_path: voicePath } : {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "participant_id" }
  );
  if (error) {
    const bayat = await bayatOturumYaniti(error);
    if (bayat) return bayat;
    return Response.json({ hata: tr.kapanisSoz.hata }, { status: 500 });
  }
  return Response.json({ ok: true });
}

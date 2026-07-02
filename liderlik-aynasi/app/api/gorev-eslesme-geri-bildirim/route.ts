import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { eslesmeGercekMiydiKaydet } from "@/lib/gorevEslesme";
import { tr } from "@/lib/i18n/tr";

// FAZ 1.3 — eşleşmeli görev tesliminde "Bu konuşma gerçek miydi?" 1-5 cevabı.
// Yalnız görevi ALAN kişi (kaynak) cevaplayabilir; write-once (upsert değil —
// gorev_eslesme satırı zaten var, yalnız gercek_miydi'yi doldurur).
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
  const yazildi = await eslesmeGercekMiydiKaydet(db, missionId, session.sub, puan);
  if (!yazildi) return Response.json({ hata: tr.ortak.genelHata }, { status: 404 });
  return Response.json({ ok: true });
}

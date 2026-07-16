import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { acikSoruGetir, canliSoruYanitla, katilimciYanitiVarMi } from "@/lib/canliSoru";
import { provaDurum } from "@/lib/prova";

export const maxDuration = 20;

// KAPANIŞ Faz B — telefon canlı soru kanalı.
//  GET  : o an açık soru (katılımcı henüz yanıtlamadıysa) — dinleyici poll eder.
//  POST : {soruId, yanit} — yanıtı kaydet (tohum ise söz tohumu olur).
//
// GÜVENLİK: canlı soru yalnız KAMP AÇIKKEN herkese görünür. Kamp kapalıyken
// (onboarding) yalnız PROVA katılımcısına görünür — Emre soruyu prova'da tek
// kişiyle güvenle test etsin, 142 onboarding kullanıcısı yanlışlıkla görmesin.
export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ soru: null }, { status: 401 });
  }
  const db = supabaseAdmin();

  const [{ data: ayarlar }, prova] = await Promise.all([
    db.from("settings").select("value").eq("key", "ayna_aktif").maybeSingle(),
    provaDurum(db),
  ]);
  const kampAcik = ayarlar?.value === "true";
  const provaKisi = prova.aktif && prova.katilimciId === session.sub;
  if (!kampAcik && !provaKisi) return Response.json({ soru: null });

  const soru = await acikSoruGetir(db);
  if (!soru) return Response.json({ soru: null });
  const yanitladi = await katilimciYanitiVarMi(db, soru.id, session.sub);
  return Response.json({
    soru: yanitladi ? null : { id: soru.id, soru: soru.soru, tip: soru.tip, secenekler: soru.secenekler },
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "Yetkisiz" }, { status: 401 });
  }
  const g = (await req.json().catch(() => ({}))) as { soruId?: string; yanit?: string };
  if (typeof g.soruId !== "string" || typeof g.yanit !== "string") {
    return Response.json({ hata: "Eksik alan" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const sonuc = await canliSoruYanitla(db, g.soruId, session.sub, g.yanit);
  if (!sonuc.ok) return Response.json({ hata: "Yanıt kaydedilemedi." }, { status: 400 });
  return Response.json({ ok: true });
}

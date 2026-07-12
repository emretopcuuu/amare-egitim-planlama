import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { canliSoruAc, canliSoruKapat, type CanliSoruTip } from "@/lib/canliSoru";

export const maxDuration = 30;

// KAPANIŞ Faz B — Emre'nin canlı sahne kontrolleri (yalnız admin):
//  ac    : nabız/tohum sorusu aç (herkese push).
//  kapat : açık soruyu kapat.
//  kanit : /ekran'a isimsiz kanıt anı tetikle (settings.sahne_kanit).
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: "Yetkisiz" }, { status: 403 });
  }
  const g = (await req.json().catch(() => ({}))) as {
    eylem?: string;
    tip?: string;
    soru?: string;
    secenekler?: unknown;
    kanitId?: string;
  };
  const db = supabaseAdmin();

  if (g.eylem === "ac") {
    const tip: CanliSoruTip = g.tip === "tohum" ? "tohum" : "nabiz";
    const secenekler = Array.isArray(g.secenekler) ? g.secenekler.map(String) : null;
    const soru = typeof g.soru === "string" ? g.soru : "";
    const sonuc = await canliSoruAc(db, { soru, tip, secenekler });
    if (!sonuc) {
      return Response.json(
        { hata: tip === "nabiz" ? "Soru + en az 2 seçenek gerekli." : "Soru gerekli." },
        { status: 400 }
      );
    }
    return Response.json({ ok: true, soru: sonuc });
  }

  if (g.eylem === "kapat") {
    const tip = g.tip === "tohum" || g.tip === "nabiz" ? (g.tip as CanliSoruTip) : undefined;
    await canliSoruKapat(db, tip);
    return Response.json({ ok: true });
  }

  if (g.eylem === "kanit") {
    const gecerli = ["ic_engel", "kas", "taahhut", "bahis"];
    const kanitId = typeof g.kanitId === "string" && gecerli.includes(g.kanitId) ? g.kanitId : null;
    if (!kanitId) return Response.json({ hata: "Geçersiz kanıt." }, { status: 400 });
    await db.from("settings").upsert({
      key: "sahne_kanit",
      value: `${kanitId}:${new Date().toISOString()}`,
      updated_at: new Date().toISOString(),
    });
    return Response.json({ ok: true });
  }

  return Response.json({ hata: "Geçersiz eylem" }, { status: 400 });
}

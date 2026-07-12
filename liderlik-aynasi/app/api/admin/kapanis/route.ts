import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { kampBaslangicGetir } from "@/lib/kampZaman";
import { kampGunu } from "@/lib/kampProgrami";
import { brifUret } from "@/lib/kapanis";

export const maxDuration = 60;

// KAPANIŞ paneli — yalnız admin. İki eylem:
//  (varsayılan) brif üret/yenile — kamp kapalıyken bile eldeki veriyle.
//  eylem="ilkeler" — Emre'nin 90-gün müfredat ilkelerini kaydet (öneri 9).
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: "Yetkisiz" }, { status: 403 });
  }
  const db = supabaseAdmin();
  const govde = (await req.json().catch(() => ({}))) as { eylem?: string; ilkeler?: unknown };

  // Öneri 9 — 90-gün müfredat ilkeleri (3-5 madde) settings'e yazılır; yolculuk
  // görev motoru (lib/ayna.ts) her gün bir ilkeyi sahada yaşatır.
  if (govde.eylem === "ilkeler") {
    const ilkeler = Array.isArray(govde.ilkeler)
      ? govde.ilkeler.map((x) => String(x).trim()).filter(Boolean).slice(0, 5)
      : [];
    await db.from("settings").upsert({
      key: "kapanis_ilkeler",
      value: JSON.stringify(ilkeler),
      updated_at: new Date().toISOString(),
    });
    return Response.json({ ok: true, ilkeler });
  }

  const baslangic = await kampBaslangicGetir(db);
  // Istanbul tarihi (TZ-güvenli).
  const bugun = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const gun = kampGunu(bugun, baslangic) ?? 3; // kamp dışıysa kapanış günü varsay

  const sonuc = await brifUret(db, { slot: "manuel", gun, bugun });
  if (!sonuc) {
    return Response.json({ hata: "Brif üretilemedi. Tekrar dene." }, { status: 502 });
  }
  return Response.json({ ok: true });
}

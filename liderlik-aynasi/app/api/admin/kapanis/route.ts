import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { kampBaslangicGetir } from "@/lib/kampZaman";
import { kampGunu } from "@/lib/kampProgrami";
import { brifUret } from "@/lib/kapanis";

export const maxDuration = 60;

// KAPANIŞ BRİFİ — elle üretim/yenileme. Yalnız admin. Kamp açık olmasa bile
// (onboarding / prova) eldeki veriyle brifi hazırlar; Emre sahne öncesi test
// edip hazırlanabilsin. Otomatik teslim (Gün 3 07:30 + 11:20) tik'ten gelir.
export async function POST() {
  if (!(await adminOturumu())) {
    return Response.json({ hata: "Yetkisiz" }, { status: 403 });
  }
  const db = supabaseAdmin();
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

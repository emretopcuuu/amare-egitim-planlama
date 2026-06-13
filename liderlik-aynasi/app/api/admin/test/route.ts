import { randomInt } from "node:crypto";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { kodUret } from "@/lib/csv";
import { tikCalistir } from "@/lib/tik";
import { tr } from "@/lib/i18n/tr";

// Demo katılımcılar bu takım etiketiyle işaretlenir; sıfırlama yalnız bunları siler.
const DEMO_TAKIM = "DEMO";

// Provaya özel idempot-kilit anahtarları (config anahtarlarıyla çakışmaz):
// silinince zamana bağlı pencereler (senkron, fısıltı, gece, momentum, kayma)
// yeniden tetiklenebilir.
const KILIT_DESENLERI =
  "key.like.senkron_%,key.like.fisilti_%,key.like.gece_%,key.like.momentum_%,key.like.kayma_%,key.eq.sahne_anons";

export const maxDuration = 60;

// GÜVENLİ PROVA KUTUSU — yalnızca admin. Buradaki hiçbir işlem üretim cron
// tikini ya da gerçek saati değiştirmez; tik provası SEÇİLEN saatle elle çalışır.
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }

  let govde: { eylem?: string; zaman?: string };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.admin.test.hata }, { status: 400 });
  }

  const db = supabaseAdmin();

  // 1) SAAT YOLCULUĞU: seçilen anın tikini çalıştır (testModu: sessiz/sahne yok)
  if (govde.eylem === "tik") {
    const simdi = govde.zaman ? new Date(govde.zaman) : new Date();
    if (Number.isNaN(simdi.getTime())) {
      return Response.json({ hata: tr.admin.test.hata }, { status: 400 });
    }
    const sonuc = await tikCalistir(db, simdi, true);
    return Response.json({ ok: true, simdi: simdi.toISOString(), sonuc });
  }

  // 2) DEMO KATILIMCI: tüm akışı prova etmek için sahte bir kişi + kodu
  if (govde.eylem === "demo-olustur") {
    const { data: mevcutlar } = await db.from("participants").select("login_code");
    const kullanilmis = new Set((mevcutlar ?? []).map((m) => m.login_code));
    const { count } = await db
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("team", DEMO_TAKIM);
    const kod = kodUret(kullanilmis, randomInt);
    const { error } = await db.from("participants").insert({
      full_name: `Demo Katılımcı ${(count ?? 0) + 1}`,
      team: DEMO_TAKIM,
      login_code: kod,
      role: "participant",
    });
    if (error) {
      return Response.json({ hata: tr.admin.test.hata }, { status: 500 });
    }
    return Response.json({ ok: true, kod });
  }

  // 3) DEMO SİL: yalnız DEMO takımındaki kişileri sil (ilişkili veriler cascade)
  if (govde.eylem === "demo-sil") {
    const { error } = await db
      .from("participants")
      .delete()
      .eq("team", DEMO_TAKIM)
      .eq("role", "participant");
    if (error) {
      return Response.json({ hata: tr.admin.test.hata }, { status: 500 });
    }
    return Response.json({ ok: true });
  }

  // 4) KİLİTLERİ TEMİZLE: zamana bağlı pencereler prova için yeniden tetiklensin
  if (govde.eylem === "kilit-temizle") {
    const { error } = await db.from("settings").delete().or(KILIT_DESENLERI);
    if (error) {
      return Response.json({ hata: tr.admin.test.hata }, { status: 500 });
    }
    return Response.json({ ok: true });
  }

  return Response.json({ hata: tr.admin.test.hata }, { status: 400 });
}

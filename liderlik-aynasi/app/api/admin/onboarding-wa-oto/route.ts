import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { yazAuditLog } from "@/lib/auditLog";
import {
  onboardingWaAdaylari,
  onboardingWaGovde,
  WA_OTO_LIMIT,
  WA_OTO_ARALIK_SAAT,
  WA_OTO_SESSIZLIK_SAAT,
  WA_OTO_TUR_TAVANI,
} from "@/lib/onboardingTakip";
import { whatsAppYapilandirildiMi, sablonSidleri } from "@/lib/whatsapp";
import { sablonBul } from "@/lib/whatsappSablonlari";

// Otomatik onboarding WhatsApp dürtmesi (settings.onboarding_wa_oto).
// Varsayılan KAPALI; admin buradan açar. GET = önizleme (açmadan önce "kime,
// kaç kişiye, ne mesaj gidecek"), POST = aç/kapa.

// GET: açma öncesi önizleme — hiçbir mesaj göndermez, sadece hesaplar.
export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "admin") {
    return Response.json({ hata: "Yetkisiz" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const [{ data: ayarlar }, adaylar] = await Promise.all([
    db.from("settings").select("key, value").in("key", ["ayna_aktif", "onboarding_wa_oto"]),
    onboardingWaAdaylari(db),
  ]);
  const ayar = new Map((ayarlar ?? []).map((a) => [a.key, a.value]));
  const sid = (await sablonSidleri(db))["duyuru"];

  // Örnek mesaj: gerçek bir aday varsa onunla, yoksa şablonun kendi örneğiyle.
  const sab = sablonBul("duyuru");
  const ornekAday = adaylar[0];
  const ornekAd = ornekAday ? ornekAday.ilkAd : "Ayşe";
  const ornekGovde = ornekAday ? ornekAday.govde : onboardingWaGovde("Ön Farkındalık");
  const ornekMetin = (sab?.govde ?? "{{1}}\n\n{{2}}")
    .replace("{{1}}", ornekAd)
    .replace("{{2}}", ornekGovde);

  return Response.json({
    acik: ayar.get("onboarding_wa_oto") === "true",
    kampAcik: ayar.get("ayna_aktif") === "true", // açıkken motor susar
    waHazir: whatsAppYapilandirildiMi(),
    sablonHazir: !!sid,
    adaySayi: adaylar.length,
    ilkTurSayi: Math.min(adaylar.length, WA_OTO_TUR_TAVANI), // ilk saatlik taramada
    // Görsel için ilk 12 isim + eksik adımı (tamamını değil).
    ornekListe: adaylar.slice(0, 12).map((a) => ({ ad: a.ad, eksikAdimAd: a.eksikAdimAd })),
    ornekMetin,
    kurallar: {
      limit: WA_OTO_LIMIT,
      aralikSaat: WA_OTO_ARALIK_SAAT,
      sessizlikSaat: WA_OTO_SESSIZLIK_SAAT,
      turTavani: WA_OTO_TUR_TAVANI,
    },
  });
}

// POST: aç/kapa.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "admin") {
    return Response.json({ hata: "Yetkisiz" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { acik?: boolean } | null;
  const acik = body?.acik === true;
  const db = supabaseAdmin();
  await db
    .from("settings")
    .upsert(
      { key: "onboarding_wa_oto", value: acik ? "true" : "false", updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  await yazAuditLog(db, session.sub, "onboarding_wa_oto", { acik });
  return Response.json({ ok: true, acik });
}

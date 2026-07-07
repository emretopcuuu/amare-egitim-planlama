import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { degerlendirmeEksikler } from "@/lib/degerlendirme";
import { herkeseBildir, katilimciyaBildir } from "@/lib/push";
import { yazAuditLog } from "@/lib/auditLog";
import { sablonBul, degiskenleriUret } from "@/lib/whatsappSablonlari";
import { whatsAppYapilandirildiMi, whatsAppGonder, sablonSidGetir, whatsAppAdresi } from "@/lib/whatsapp";

// [KAMP OTOMASYON] Değerlendirme dalgası + reveal, orkestratöre çıpalı (İstanbul).
// Kamp senaryosunda fonksiyon eylemi olarak çağrılır → AYNA uyandırılınca Gün N
// kendiliğinden hesaplanır, elle dokunuş gerekmez.

// Kampın liderlik değerlendirmesi dalgası: adı "Kamp Değerlendirmesi"; bulunamazsa
// en düşük id'li dalgaya düş (reset sonrası 90-gün dalgası daha yüksek id'de).
async function degerlendirmeDalgasi(db: Db): Promise<{ id: number } | null> {
  const { data: adli } = await db
    .from("waves")
    .select("id")
    .ilike("name", "%Değerlendirme%")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (adli) return adli;
  const { data: ilk } = await db.from("waves").select("id").order("id", { ascending: true }).limit(1).maybeSingle();
  return ilk ?? null;
}

/** [Gün 2 21:00] Kamp Değerlendirmesini aç + herkese "ne yapacağını anlatan" push. */
export async function degerlendirmeAc(db: Db): Promise<void> {
  const dalga = await degerlendirmeDalgasi(db);
  if (!dalga) return;
  // Aynı anda tek dalga açık kuralı: diğerlerini kapat, bunu aç.
  const simdiIso = new Date().toISOString();
  await db.from("waves").update({ is_open: false }).neq("id", dalga.id);
  await db.from("waves").update({ is_open: true, opened_at: simdiIso }).eq("id", dalga.id);
  // [FAZ A · B4] Sahne sinyali — otomatik dalga açılışı da /ekran sinematiğini
  // tetiklesin (elle admin dalga açışıyla aynı: settings.sahne_dalga). Eskiden
  // yalnız admin route yazıyordu; otomatik açılışta büyük ekran efekti kaçıyordu.
  await db.from("settings").upsert({ key: "sahne_dalga", value: `${dalga.id}:${simdiIso}`, updated_at: simdiIso });
  await herkeseBildir(
    db,
    "🪞 Kamp Değerlendirmesi açıldı",
    "3 gündür yanındaki arkadaşlarını 10 liderlik özelliğinde puanla. Puanların ve yazdıkların GİZLİ — gözlemlediğin kişi kimin ne verdiğini asla görmez, o yüzden dürüst ol. Yarın sabaha kadar açık.",
    "/degerlendir"
  );
  await yazAuditLog(db, null, "degerlendirme_acildi", { wave_id: dalga.id });
}

/** [Gün 3 09:00] Değerlendirmesini tamamlamayanlara WhatsApp + push dürtme. */
export async function degerlendirmeHatirlat(db: Db): Promise<void> {
  const eksikler = await degerlendirmeEksikler(db);
  if (eksikler.length === 0) {
    await yazAuditLog(db, null, "degerlendirme_hatirlat", { eksik: 0 });
    return;
  }

  // 1) Uygulama içi push (bedava, herkese ulaşır).
  for (const k of eksikler) {
    await katilimciyaBildir(
      db,
      k.id,
      "🪞 Değerlendirmen eksik",
      "Kamp bugün kapanıyor — arkadaşlarını yansıtman için son şans. Birkaç dakika yeter.",
      "/degerlendir"
    ).catch(() => {});
  }

  // 2) WhatsApp (Meta onaylı şablon kayıtlıysa). Telefonu geçerli + kod olanlara.
  let waGonderildi = 0;
  const sablon = sablonBul("degerlendirme");
  const contentSid = sablon && whatsAppYapilandirildiMi() ? await sablonSidGetir(db, sablon) : null;
  if (sablon && contentSid) {
    const gecerli = eksikler.filter((k) => whatsAppAdresi(k.phone) !== null);
    const PARCA = 20;
    for (let i = 0; i < gecerli.length; i += PARCA) {
      const dilim = gecerli.slice(i, i + PARCA);
      const sonuc = await Promise.all(
        dilim.map((k) => whatsAppGonder(k.phone!, contentSid, degiskenleriUret(sablon, { ad: k.full_name, kod: k.login_code })))
      );
      for (const ok of sonuc) if (ok) waGonderildi++;
    }
  }

  await yazAuditLog(db, null, "degerlendirme_hatirlat", {
    eksik: eksikler.length,
    push: eksikler.length,
    whatsapp: waGonderildi,
    whatsappKayitsiz: !contentSid,
  });
}

/** [Gün 3 13:00 güvenlik ağı] Reveal: dalgayı kapat + raporları aç + push.
 * İdempotent — reports_visible zaten true ise (host sahneden elle açtıysa)
 * push tekrarını atlar. */
export async function revealAc(db: Db): Promise<void> {
  const { data: mevcut } = await db.from("settings").select("value").eq("key", "reports_visible").maybeSingle();
  if (mevcut?.value === "true") return; // host zaten sahneden açmış — tekrar etme.

  const dalga = await degerlendirmeDalgasi(db);
  if (dalga) await db.from("waves").update({ is_open: false, closed_at: new Date().toISOString() }).eq("id", dalga.id);
  await db.from("settings").upsert(
    { key: "reports_visible", value: "true", updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
  await herkeseBildir(
    db,
    "👁 Ayna Raporun hazır",
    "3 günün aynada belirdi — seni nasıl gördüklerini, güçlü yanlarını ve sana yazılanları gör.",
    "/ayna"
  );
  await yazAuditLog(db, null, "reveal_otomatik_acildi", {});
}

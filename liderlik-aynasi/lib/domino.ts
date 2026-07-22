import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { aynaClient } from "@/lib/aynaClient";
import type { supabaseAdmin } from "@/lib/supabase/server";
import { herkeseBildir } from "@/lib/push";
import { onFarkindalikOzeti } from "@/lib/ayna";
import { kimlikBloguGetir } from "@/lib/kisiKimligi";
import { tr } from "@/lib/i18n/tr";

type Db = ReturnType<typeof supabaseAdmin>;

// Özellik 9 — DOMİNO GÖREVİ (kamp dışına ilk taşıma). Gün 3 sabahı orkestratör
// FONKSIYONLAR'dan çağrılır (senaryo satırı 'gun3_domino_ac'). Herkese TEK
// kind='cesaret' + domino=true görevi düşer: kamptaki en güçlü içgörünü BUGÜN
// kamp DIŞINDAN birine (eş, ekip arkadaşı, aday) telefonla söyle/uygula; kanıt
// karşı tarafın tek cümlelik tepkisi. Yanıt normal gorev-yanit akışıyla AI
// puanlanır; domino=true izi 90-gün follow-up köprüsüdür (Eylül Aynası kartı).
//
// İçgörü kişi başı TEK ucuz Haiku çağrısıyla kişiselleşir (kamp-içi derinleşen
// tema + kör nokta profili). FAIL-OPEN: çağrı düşerse genel şablona düşülür —
// görev her koşulda düşer.

/** Görev akşama kadar açık: aynı gün 21:00 İstanbul (geç ateşlemede +3 saat). */
function dominoDue(simdi: Date): Date {
  const tarih = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(simdi);
  const aksam = new Date(`${tarih}T21:00:00+03:00`);
  return aksam.getTime() - simdi.getTime() >= 2 * 3_600_000
    ? aksam
    : new Date(simdi.getTime() + 3 * 3_600_000);
}

const ICGORU_SEMASI = {
  type: "object" as const,
  properties: {
    icgoru: {
      type: "string" as const,
      description:
        "Kişiye dair EN GÜÇLÜ tek içgörü — 'sen' diliyle, TEK kısa cümle (en fazla ~140 karakter). Somut ve kişisel olsun; genel motivasyon cümlesi değil.",
    },
  },
  required: ["icgoru"],
  additionalProperties: false,
};

// sicakAn.ts'teki jsonCoz deseninin yereli (refusal → null, bozuk JSON → null).
function jsonCoz<T>(yanit: Anthropic.Message): T | null {
  if (yanit.stop_reason === "refusal") return null;
  const metin = yanit.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  try {
    return JSON.parse(metin) as T;
  } catch {
    return null;
  }
}

/** Kişinin kamp profili (kamp-içi derinleşen tema + kör nokta) üzerinden tek
 * cümlelik "en güçlü içgörü" damıt. Profil boşsa/çağrı düşerse null (fail-open). */
async function dominoIcgoru(db: Db, pid: string): Promise<string | null> {
  try {
    const profil = await onFarkindalikOzeti(db, pid);
    if (!profil) return null;
    const client = aynaClient("domino");
    const yanit = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      thinking: { type: "disabled" },
      output_config: { format: { type: "json_schema", schema: ICGORU_SEMASI } },
      system:
        "Bir liderlik kampı katılımcısının 3 günde biriken farkındalık profilini okuyorsun (kamp boyunca derinleşen tema, kör nokta, sosyal tema). Görevin: bu kamptan kişinin yanına kalması gereken EN GÜÇLÜ TEK içgörüyü tek kısa cümleye damıtmak — 'sen' diliyle, sıcak ama net, klişesiz. Kör noktayı kırıcı biçimde yüzüne vurma; gücü ve dönüşümü öne al. Yalnızca JSON döndür." +
        (await kimlikBloguGetir(db, pid)),
      messages: [{ role: "user", content: JSON.stringify(profil) }],
    });
    const veri = jsonCoz<{ icgoru: string }>(yanit);
    const icgoru = (veri?.icgoru ?? "").trim();
    return icgoru ? icgoru.slice(0, 200) : null;
  } catch {
    // fail-open: kişiselleştirme düşerse genel şablon devreye girer
    return null;
  }
}

/** Orkestratör eylemi: tüm katılımcılara domino görevini düşür + push.
 * İdempotent: domino görevi zaten olan kişiye ikinci kez düşmez. */
export async function dominoAc(db: Db): Promise<void> {
  const { data: kisiler } = await db
    .from("participants")
    .select("id")
    .eq("role", "participant");
  if (!kisiler?.length) return;

  const { data: mevcutlar } = await db
    .from("missions")
    .select("participant_id")
    .eq("domino", true);
  const alanlar = new Set((mevcutlar ?? []).map((m) => m.participant_id));

  const simdi = new Date();
  const due = dominoDue(simdi).toISOString();
  let dusen = 0;
  for (const k of kisiler) {
    if (alanlar.has(k.id)) continue;
    const icgoru = await dominoIcgoru(db, k.id);
    const { error } = await db.from("missions").insert({
      participant_id: k.id,
      kind: "cesaret",
      domino: true,
      title: tr.gorevler.dominoBaslik,
      body: tr.gorevler.dominoGovde(icgoru),
      difficulty: 2,
      issued_at: simdi.toISOString(),
      due_at: due,
    });
    if (!error) dusen++;
  }
  if (dusen > 0) {
    await herkeseBildir(
      db,
      tr.gorevler.dominoPush.baslik,
      tr.gorevler.dominoPush.govde,
      "/gorevler"
    );
  }
}

/** 90-gün follow-up köprüsü: kişinin domino görevine verdiği yanıttan tek
 * satırlık alıntı (Eylül Aynası kartı). Yanıt yoksa null. */
export async function dominoAlintisi(db: Db, pid: string): Promise<string | null> {
  const { data } = await db
    .from("missions")
    .select("response_text")
    .eq("participant_id", pid)
    .eq("domino", true)
    .not("response_text", "is", null)
    .order("responded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const metin = (data?.response_text ?? "").trim();
  if (!metin) return null;
  const ilkSatir = metin.split("\n")[0].trim();
  return ilkSatir.length > 140 ? ilkSatir.slice(0, 137) + "…" : ilkSatir;
}

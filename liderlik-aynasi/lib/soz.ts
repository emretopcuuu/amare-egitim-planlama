import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/degerlendirme";
import { DIL_KALITESI } from "@/lib/dilKalitesi";
import { raporHesapla } from "@/lib/rapor";
import { pusulaCekirdek } from "@/lib/pusula";
import { hedefCekirdek } from "@/lib/hedef";
import { oyunPlaniGetir } from "@/lib/oyunPlani";
import { KATILIMCI_EVRENI } from "@/lib/katilimciEvreni";
import { tlFormat } from "@/lib/kariyer";

// FAZ A — SÖZ v2. Kamp kapanışında: AI keşifler + hedef + neden + plandan bir söz
// TASLAĞI şekillendirir; kişi düzenleyip onaylar; sonra KENDİ SESİYLE okur/kaydeder.
// Söz, plandaki somut aksiyon adımlarını içerir. 5 lider şahit imzalar (Faz B takibi).

const TANIK_HEDEF = 5; // her söze 5 şahit
const TANIK_LIMIT = 5; // her lider en fazla 5 kişiye şahit olabilir

const SISTEM = `Sen AYNA'sın — bu liderlik kampını yöneten yapay zekâ. Kamp kapanışında, katılımcının KENDİ ağzından okuyacağı kişisel bir SÖZ taslağı yazarsın. Bu söz birinci tekil şahıs ("Ben…"), sıcak, kararlı ve SOMUT olmalı.

Sana JSON verilecek: kişinin çekirdek nedeni, iç engeli, kariyer hedefi + planı, ve kamptaki en güçlü/gelişim yanı. Söz şunları DOKUSUNDA taşımalı:
- Kim olduğuna ve NEDEN'ine dair bir cümle (kampta keşfettiği).
- HEDEFİNE dair net bir taahhüt (kariyer hedefi + süre).
- Plandan gelen 2-3 SOMUT aksiyon adımı (sözün içinde doğal cümleler olarak).
- İç engelini aşmaya dair tek, güçlü bir cümle (engeli açıkça etiketlemeden).

Kurallar: Türkçe, birinci tekil şahıs, 90-140 kelime. Klişe değil, kişinin kendi rakamları/nedeniyle. Sonunda kişiyi geleceğe bağlayan bir cümle. Ayrıca "aksiyonlar" alanında plandan damıtılmış 3 somut adımı (her biri kısa, ölçülebilir) ufkuyla ('10','40','90') ver.`;

const SOZ_SEMASI = {
  type: "object" as const,
  properties: {
    metin: {
      type: "string" as const,
      description: "Kişinin sesli okuyacağı söz metni (birinci tekil, 90-140 kelime)",
    },
    aksiyonlar: {
      type: "array" as const,
      description: "Sözün içerdiği 3 somut aksiyon adımı",
      items: {
        type: "object" as const,
        properties: {
          metin: { type: "string" as const, description: "Kısa, ölçülebilir adım" },
          ufuk: { type: "string" as const, enum: ["10", "40", "90"], description: "Gün ufku" },
        },
        required: ["metin", "ufuk"],
        additionalProperties: false,
      },
    },
  },
  required: ["metin", "aksiyonlar"],
  additionalProperties: false,
};

export type SozAksiyon = { metin: string; ufuk: string };
export type SozKaydi = {
  metin: string | null;
  aksiyonlar: SozAksiyon[];
  voice_path: string | null;
  durum: string;
};

export async function sozGetir(db: Db, pid: string): Promise<SozKaydi | null> {
  const { data } = await db
    .from("soz")
    .select("metin, aksiyonlar, voice_path, durum")
    .eq("participant_id", pid)
    .maybeSingle();
  if (!data) return null;
  return {
    metin: data.metin,
    aksiyonlar: (data.aksiyonlar as SozAksiyon[]) ?? [],
    voice_path: data.voice_path,
    durum: data.durum,
  };
}

export type SekilSonucu =
  | { durum: "hazir"; metin: string; aksiyonlar: SozAksiyon[] }
  | { durum: "anahtar-yok" }
  | { durum: "hata" };

// AI söz taslağını şekillendir (varsa mevcut taslağı döndür).
export async function sozSekillendir(db: Db, pid: string, ad: string): Promise<SekilSonucu> {
  const mevcut = await sozGetir(db, pid);
  if (mevcut?.metin) {
    return { durum: "hazir", metin: mevcut.metin, aksiyonlar: mevcut.aksiyonlar };
  }
  if (!process.env.ANTHROPIC_API_KEY) return { durum: "anahtar-yok" };

  const [rapor, pusula, hedef, plan] = await Promise.all([
    raporHesapla(db, pid),
    pusulaCekirdek(db, pid),
    hedefCekirdek(db, pid),
    oyunPlaniGetir(db, pid),
  ]);

  const veri = {
    ad,
    cekirdekNeden: pusula?.cekirdek_neden ?? null,
    icEngel: pusula?.ic_engel ?? null,
    hedef: hedef?.plan
      ? {
          rutbe: hedef.plan.rutbe,
          aylikGelir: tlFormat(hedef.plan.gelir, hedef.plan.gelirArti),
          sureAy: hedef.plan.sureAy,
        }
      : null,
    plan: plan
      ? { on_gun: plan.on_gun, kirk_gun: plan.kirk_gun, doksan_gun: plan.doksan_gun }
      : null,
    enGucluYan: rapor.guclu[0]?.ad ?? null,
    gelisimAlani: rapor.korNokta?.ad ?? rapor.gelisim[0]?.ad ?? null,
  };

  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: { type: "json_schema", schema: SOZ_SEMASI } },
      system: `${SISTEM}\n\n${KATILIMCI_EVRENI}\n\n${DIL_KALITESI}`,
      messages: [{ role: "user", content: JSON.stringify(veri) }],
    });
    if (yanit.stop_reason === "refusal") return { durum: "hata" };
    const metin = yanit.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    let cikti: { metin: string; aksiyonlar: SozAksiyon[] };
    try {
      cikti = JSON.parse(metin);
    } catch {
      return { durum: "hata" };
    }
    if (!cikti?.metin) return { durum: "hata" };

    await db.from("soz").upsert(
      {
        participant_id: pid,
        metin: cikti.metin.slice(0, 4000),
        aksiyonlar: (cikti.aksiyonlar ?? []).slice(0, 5) as never,
        durum: "taslak",
        sekillendi_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "participant_id" }
    );
    return { durum: "hazir", metin: cikti.metin, aksiyonlar: cikti.aksiyonlar ?? [] };
  } catch {
    return { durum: "hata" };
  }
}

// Kişi sözü düzenleyip onayladı.
export async function sozMetinKaydet(
  db: Db,
  pid: string,
  metin: string,
  aksiyonlar: SozAksiyon[]
): Promise<boolean> {
  const temiz = (metin ?? "").trim().slice(0, 4000);
  if (!temiz) return false;
  const { error } = await db
    .from("soz")
    .upsert(
      {
        participant_id: pid,
        metin: temiz,
        aksiyonlar: (aksiyonlar ?? []).slice(0, 5) as never,
        durum: "onaylandi",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "participant_id" }
    );
  return !error;
}

// ---- 5 LİDER ŞAHİT ----

export type TanikSatiri = {
  witness_id: string;
  ad: string;
  imzali: boolean;
};

export async function taniklar(db: Db, sahibiId: string): Promise<TanikSatiri[]> {
  const { data } = await db
    .from("soz_tanik")
    .select("witness_id, imza_at, tanik:participants!soz_tanik_witness_id_fkey(full_name)")
    .eq("soz_sahibi", sahibiId)
    .order("created_at");
  return (data ?? []).map((r) => ({
    witness_id: r.witness_id,
    ad: (r.tanik as { full_name: string } | null)?.full_name ?? "—",
    imzali: !!r.imza_at,
  }));
}

// Şahit ekle: kural — her söze en fazla 5; her lider en fazla 5 kişiye.
export async function tanikEkle(
  db: Db,
  sahibiId: string,
  witnessId: string
): Promise<{ ok: boolean; sebep?: string }> {
  if (witnessId === sahibiId) return { ok: false, sebep: "kendine" };
  const [{ count: sahipSayi }, { count: witnessSayi }] = await Promise.all([
    db.from("soz_tanik").select("id", { count: "exact", head: true }).eq("soz_sahibi", sahibiId),
    db.from("soz_tanik").select("id", { count: "exact", head: true }).eq("witness_id", witnessId),
  ]);
  if ((sahipSayi ?? 0) >= TANIK_HEDEF) return { ok: false, sebep: "dolu" };
  if ((witnessSayi ?? 0) >= TANIK_LIMIT) return { ok: false, sebep: "lider_dolu" };
  const { error } = await db
    .from("soz_tanik")
    .insert({ soz_sahibi: sahibiId, witness_id: witnessId });
  if (error) {
    if (error.code === "23505") return { ok: false, sebep: "zaten" };
    return { ok: false, sebep: "hata" };
  }
  return { ok: true };
}

export async function tanikSil(db: Db, sahibiId: string, witnessId: string): Promise<void> {
  await db.from("soz_tanik").delete().eq("soz_sahibi", sahibiId).eq("witness_id", witnessId);
}

// Şahit imzası (lider, kendisini şahit gösteren kişinin sözünü onaylar).
export async function tanikImzala(db: Db, sahibiId: string, witnessId: string): Promise<boolean> {
  const { error } = await db
    .from("soz_tanik")
    .update({ imza_at: new Date().toISOString() })
    .eq("soz_sahibi", sahibiId)
    .eq("witness_id", witnessId)
    .is("imza_at", null);
  return !error;
}

// Bir liderin şahit gösterildiği, henüz imzalamadığı sözler (lider görünümü).
export async function bekleyenImzalar(
  db: Db,
  witnessId: string
): Promise<{ sahibiId: string; ad: string }[]> {
  const { data } = await db
    .from("soz_tanik")
    .select("soz_sahibi, sahip:participants!soz_tanik_soz_sahibi_fkey(full_name)")
    .eq("witness_id", witnessId)
    .is("imza_at", null);
  return (data ?? []).map((r) => ({
    sahibiId: r.soz_sahibi,
    ad: (r.sahip as { full_name: string } | null)?.full_name ?? "—",
  }));
}

export async function sozV2KapisiAcik(db: Db): Promise<boolean> {
  const { data } = await db.from("settings").select("value").eq("key", "soz_v2_acik").maybeSingle();
  return data?.value === "true";
}

export { TANIK_HEDEF, TANIK_LIMIT };

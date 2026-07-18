import "server-only";
import type { supabaseAdmin } from "@/lib/supabase/server";

type Db = ReturnType<typeof supabaseAdmin>;

// A6 — ÇAPRAZ-TAKIM ÇARPANI. Kendi takımının DIŞINA gönderilen takdir, gönderene
// bonus kıvılcım kazandırır (takımlar arası duvarı eritmek için). Aynı takım içi
// takdir 0 bonus (mevcut ekonomi değişmez). Bonus kivilcim_bonus'a yazılır →
// kazanç toplamına eklenir, unvan/ekonomi kırılmaz.
//
// GUARDRAIL'ler:
//  - Kill-switch: settings.takdir_capraz_acik === "false" → tamamen kapalı.
//  - Günlük tavan: farming'i önlemek için kişi başına günde en çok TAVAN bonus.
//  - Best-effort: hata takdirin kendisini ASLA düşürmez (çağıran try ile sarar).

const BONUS = 3; // çapraz takdir başına kıvılcım
const GUNLUK_TAVAN = 5; // gün içi en çok 5 çapraz bonus (→ +15 kıvılcım/gün)

export async function takdirCaprazBonus(
  db: Db,
  gonderenId: string,
  aliciId: string
): Promise<boolean> {
  // Kill-switch
  const { data: bayrak } = await db
    .from("settings")
    .select("value")
    .eq("key", "takdir_capraz_acik")
    .maybeSingle();
  if (bayrak?.value === "false") return false;

  // İki tarafın takımı
  const { data: kisiler } = await db
    .from("participants")
    .select("id, team")
    .in("id", [gonderenId, aliciId]);
  const gonderen = kisiler?.find((k) => k.id === gonderenId);
  const alici = kisiler?.find((k) => k.id === aliciId);
  const gt = gonderen?.team?.trim();
  const at = alici?.team?.trim();
  // İkisi de dolu ve FARKLI değilse çapraz değil → bonus yok.
  if (!gt || !at || gt === at) return false;

  // Günlük tavan
  const gunBasi = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { count } = await db
    .from("kivilcim_bonus")
    .select("id", { count: "exact", head: true })
    .eq("participant_id", gonderenId)
    .eq("kaynak", "takdir_capraz")
    .gte("created_at", gunBasi);
  if ((count ?? 0) >= GUNLUK_TAVAN) return false;

  const { error } = await db
    .from("kivilcim_bonus")
    .insert({ participant_id: gonderenId, deger: BONUS, kaynak: "takdir_capraz" });
  return !error;
}

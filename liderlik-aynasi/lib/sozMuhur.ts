import "server-only";
import type { Db } from "@/lib/degerlendirme";

// [E3] KOLEKTİF SÖZ FİNALİ — yüz yüze şahitlik + mühür sayacı. Söz veren telefonda
// QR gösterir; şahit kendi oturumuyla okutup onaylar (soz_tanik imzalanır). MUHUR_ESIK
// şahit dolunca söz "mühürlendi". Son söz mühürlenince tüm telefonlarda senkron an.

export const MUHUR_ESIK = 5;

export type SozMuhurDurumu = {
  toplam: number; // katılımcı sayısı
  sozVeren: number; // söz metni olan
  muhurlu: number; // >= MUHUR_ESIK imzalı şahit
  hepsiMuhurlu: boolean; // sözVeren > 0 && muhurlu >= sözVeren
};

export async function sozMuhurDurumu(db: Db): Promise<SozMuhurDurumu> {
  const [{ data: kisiler }, { data: sozler }, { data: taniklar }] = await Promise.all([
    db.from("participants").select("id").eq("role", "participant"),
    db.from("soz").select("participant_id, metin"),
    db.from("soz_tanik").select("soz_sahibi").not("imza_at", "is", null),
  ]);
  const toplam = (kisiler ?? []).length;
  const sozVerenSet = new Set((sozler ?? []).filter((s) => s.metin).map((s) => s.participant_id));
  const sayac = new Map<string, number>();
  for (const t of taniklar ?? []) sayac.set(t.soz_sahibi, (sayac.get(t.soz_sahibi) ?? 0) + 1);
  let muhurlu = 0;
  for (const id of sozVerenSet) if ((sayac.get(id) ?? 0) >= MUHUR_ESIK) muhurlu++;
  return {
    toplam,
    sozVeren: sozVerenSet.size,
    muhurlu,
    hepsiMuhurlu: sozVerenSet.size > 0 && muhurlu >= sozVerenSet.size,
  };
}

// Şahit token ile söz sahibini bulur; şahidin adına imzalı soz_tanik oluşturur
// (idempotent upsert). Yüz yüze: şahit, söz verenin telefonundaki QR'ı okutur.
export async function sahitOl(
  db: Db,
  token: string,
  witnessId: string
): Promise<{ ok: boolean; sebep?: string; sahibiAd?: string }> {
  const temiz = (token ?? "").trim();
  if (!temiz) return { ok: false, sebep: "gecersiz" };
  const { data: sahibi } = await db
    .from("participants")
    .select("id, full_name")
    .eq("camp_unlock_token", temiz)
    .eq("role", "participant")
    .maybeSingle();
  if (!sahibi) return { ok: false, sebep: "bulunamadi" };
  if (sahibi.id === witnessId) return { ok: false, sebep: "kendine" };
  const { error } = await db
    .from("soz_tanik")
    .upsert(
      { soz_sahibi: sahibi.id, witness_id: witnessId, imza_at: new Date().toISOString() },
      { onConflict: "soz_sahibi,witness_id" }
    );
  if (error) return { ok: false, sebep: "hata" };
  return { ok: true, sahibiAd: sahibi.full_name };
}

// Token'dan söz sahibinin adını çözer (şahit ekranında onay öncesi göstermek için).
export async function tokenSahibi(db: Db, token: string): Promise<string | null> {
  const temiz = (token ?? "").trim();
  if (!temiz) return null;
  const { data } = await db
    .from("participants")
    .select("full_name")
    .eq("camp_unlock_token", temiz)
    .eq("role", "participant")
    .maybeSingle();
  return data?.full_name ?? null;
}

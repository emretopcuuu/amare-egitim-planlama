import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { takipDurum } from "@/lib/sozTakip";
import { bugunTr } from "@/lib/takipHesap";

// [B#19] YOL ARKADAŞI veri katmanı. Aday havuzu = kişinin sözüne şahit olanlar
// (doğal sorumluluk çevresi). Ortak alev = iki kişinin de kesintisiz "adım attı"
// günü (bugünden geriye).

async function adCoz(db: Db, idler: string[]): Promise<Map<string, string>> {
  if (idler.length === 0) return new Map();
  const { data } = await db.from("participants").select("id, full_name").in("id", idler);
  return new Map((data ?? []).map((k) => [k.id, k.full_name]));
}

export async function arkadasGetir(
  db: Db,
  pid: string
): Promise<{ id: string; ad: string } | null> {
  const { data } = await db
    .from("yol_arkadasi")
    .select("arkadas_id")
    .eq("secen_id", pid)
    .maybeSingle();
  if (!data) return null;
  const adlar = await adCoz(db, [data.arkadas_id]);
  return { id: data.arkadas_id, ad: adlar.get(data.arkadas_id) ?? "—" };
}

// Aday havuzu: kişinin sözüne KABUL ile şahit olanlar (kendisi hariç).
export async function arkadasAdaylari(
  db: Db,
  pid: string,
  mevcutArkadasId?: string | null
): Promise<{ id: string; ad: string }[]> {
  const { data } = await db
    .from("soz_tanik")
    .select("witness_id")
    .eq("soz_sahibi", pid)
    .not("imza_at", "is", null);
  const idler = (data ?? [])
    .map((r) => r.witness_id)
    .filter((id) => id !== pid && id !== mevcutArkadasId);
  const adlar = await adCoz(db, idler);
  return idler.map((id) => ({ id, ad: adlar.get(id) ?? "—" }));
}

export async function arkadasSec(db: Db, pid: string, arkadasId: string): Promise<boolean> {
  if (arkadasId === pid) return false;
  const { error } = await db
    .from("yol_arkadasi")
    .upsert({ secen_id: pid, arkadas_id: arkadasId }, { onConflict: "secen_id" });
  return !error;
}

export async function arkadasKaldir(db: Db, pid: string): Promise<void> {
  await db.from("yol_arkadasi").delete().eq("secen_id", pid);
}

// Ortak alev: bugünden geriye, İKİSİNİN de "adım attı" günü kesintisiz kaç gün.
// Bugün ikisinden biri henüz işaretlemediyse seriyi kırmaz (seri deseniyle aynı).
export async function ortakAlev(db: Db, pid: string, arkadasId: string): Promise<number> {
  const [benim, onun] = await Promise.all([takipDurum(db, pid), takipDurum(db, arkadasId)]);
  const b = new Map(benim.son14.map((g) => [g.gun, g.yapildi === true]));
  const o = new Map(onun.son14.map((g) => [g.gun, g.yapildi === true]));
  const bugun = bugunTr();
  let alev = 0;
  for (let i = 0; i < 14; i++) {
    const g = bugunTr(new Date(Date.parse(bugun) - i * 86_400_000));
    const ikisi = b.get(g) && o.get(g);
    if (ikisi) alev++;
    else if (i === 0) continue; // bugün ikisi de işaretlemediyse kırma
    else break;
  }
  return alev;
}

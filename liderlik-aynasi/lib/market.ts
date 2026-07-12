import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { rozetKivilcimi } from "@/lib/rozet";
import { ELMAS_RENKLERI, urunBul } from "@/lib/marketKatalog";

// ============================================================================
// G1 — ÇİFT CÜZDAN + KIVILCIM MARKETİ (sunucu tarafı)
// ============================================================================
// Katalog + tipler saf modülde: lib/marketKatalog.ts (istemci de oradan okur).
// Kıvılcımın stored toplamı yok (her yerde missions.spark_points toplanır).
// Çift cüzdanı bu mimariye dokunmadan kurarız:
//   kivilcim_toplam (kazanç, rank-only) = missions.spark_points toplamı + rozet
//   kivilcim_cuzdan (harcanabilir)       = kivilcim_toplam − market harcamaları
// Yani unvan/takım/lig hesapları HİÇ değişmez; yalnız harcama defteri eklenir.
// GUARDRAIL: harcama toplamı/unvanı/takım skorunu ASLA düşürmez (adalet).

// Feature flag — varsayılan KAPALI (row yoksa kapalı).
export async function marketAcikMi(db: Db): Promise<boolean> {
  const { data } = await db.from("settings").select("value").eq("key", "market_acik").maybeSingle();
  return data?.value === "true";
}

// KAZANÇ TOPLAMI (rank-only) — mevcut kimlik toplamıyla aynı: scored görev
// kıvılcımı + rozet kıvılcımı. Harcama bunu ASLA düşürmez.
export async function kazancToplami(db: Db, pid: string): Promise<number> {
  const [{ data: gorevler }, rozet] = await Promise.all([
    db.from("missions").select("spark_points").eq("participant_id", pid).eq("status", "scored"),
    rozetKivilcimi(db, pid).catch(() => 0),
  ]);
  const gorevKiv = (gorevler ?? []).reduce((t, g) => t + (g.spark_points ?? 0), 0);
  return gorevKiv + (rozet ?? 0);
}

async function harcamaToplami(db: Db, pid: string): Promise<number> {
  const { data } = await db.from("market_islem").select("tutar").eq("participant_id", pid);
  return (data ?? []).reduce((t, r) => t + (r.tutar ?? 0), 0);
}

export type Cuzdan = { toplam: number; harcanan: number; cuzdan: number };

// Çift cüzdan: toplam (kazanç) hep artar/sabit; cuzdan = toplam − harcama.
export async function cuzdanBakiye(db: Db, pid: string): Promise<Cuzdan> {
  const [toplam, harcanan] = await Promise.all([kazancToplami(db, pid), harcamaToplami(db, pid)]);
  return { toplam, harcanan, cuzdan: Math.max(0, toplam - harcanan) };
}

export type SatinAlmaSonuc =
  | { ok: true; cuzdan: number }
  | { ok: false; sebep: "kapali" | "urun_yok" | "varyant_gerekli" | "yetersiz" };

// Satın alma — cüzdandan düşer (kazanç/unvan DOKUNULMAZ). Bakiyeyi insert'ten
// hemen önce yeniden okur (küçük ölçekte yeterli yarış koruması).
export async function satinAl(
  db: Db,
  pid: string,
  kod: string,
  varyant?: string | null
): Promise<SatinAlmaSonuc> {
  if (!(await marketAcikMi(db))) return { ok: false, sebep: "kapali" };
  const urun = urunBul(kod);
  if (!urun) return { ok: false, sebep: "urun_yok" };
  if (urun.varyantlar && urun.varyantlar.length > 0) {
    const ge = urun.varyantlar.some((v) => v.kod === varyant);
    if (!ge) return { ok: false, sebep: "varyant_gerekli" };
  }
  const { cuzdan } = await cuzdanBakiye(db, pid);
  if (cuzdan < urun.fiyat) return { ok: false, sebep: "yetersiz" };

  const { error } = await db.from("market_islem").insert({
    participant_id: pid,
    urun_kod: urun.kod,
    reyon: urun.reyon,
    tutar: urun.fiyat,
    fiziksel: !!urun.fiziksel,
    varyant: varyant ?? null,
    teslim_durumu: urun.fiziksel ? "bekliyor" : null,
  });
  if (error) return { ok: false, sebep: "yetersiz" };
  return { ok: true, cuzdan: cuzdan - urun.fiyat };
}

export type GecmisSatir = { urun_kod: string; ad: string; tutar: number; varyant: string | null; created_at: string; fiziksel: boolean };

export async function marketGecmisi(db: Db, pid: string): Promise<GecmisSatir[]> {
  const { data } = await db
    .from("market_islem")
    .select("urun_kod, tutar, varyant, fiziksel, created_at")
    .eq("participant_id", pid)
    .order("created_at", { ascending: false })
    .limit(50);
  return ((data ?? []) as { urun_kod: string; tutar: number; varyant: string | null; fiziksel: boolean; created_at: string }[]).map((r) => ({
    urun_kod: r.urun_kod,
    ad: urunBul(r.urun_kod)?.ad ?? r.urun_kod,
    tutar: r.tutar,
    varyant: r.varyant,
    fiziksel: r.fiziksel,
    created_at: r.created_at,
  }));
}

// Kişinin seçtiği elmas ışık rengi (son elmas_rengi alımının varyantı) — RGB
// dizesi ("r,g,b"); yoksa null (KimlikElmasi altın varsayılana düşer).
export async function elmasRengiGetir(db: Db, pid: string): Promise<string | null> {
  const { data } = await db
    .from("market_islem")
    .select("varyant")
    .eq("participant_id", pid)
    .eq("urun_kod", "elmas_rengi")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const v = (data as { varyant?: string | null } | null)?.varyant;
  return ELMAS_RENKLERI.find((r) => r.kod === v)?.renk ?? null;
}

// ---- ADMIN: prestij (fiziksel) teslim listesi ----
export type TeslimSatiri = { id: string; ad: string; urun: string; tutar: number; created_at: string };

export async function teslimBekleyenler(db: Db): Promise<TeslimSatiri[]> {
  const { data } = await db
    .from("market_islem")
    .select("id, participant_id, urun_kod, tutar, created_at")
    .eq("teslim_durumu", "bekliyor")
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as { id: string; participant_id: string; urun_kod: string; tutar: number; created_at: string }[];
  if (rows.length === 0) return [];
  const { data: kisiler } = await db
    .from("participants")
    .select("id, full_name")
    .in("id", [...new Set(rows.map((r) => r.participant_id))]);
  const adMap = new Map((kisiler ?? []).map((k) => [k.id, k.full_name]));
  return rows.map((r) => ({
    id: r.id,
    ad: adMap.get(r.participant_id) ?? "—",
    urun: urunBul(r.urun_kod)?.ad ?? r.urun_kod,
    tutar: r.tutar,
    created_at: r.created_at,
  }));
}

export async function teslimEt(db: Db, islemId: string): Promise<boolean> {
  const { error } = await db
    .from("market_islem")
    .update({ teslim_durumu: "teslim", teslim_at: new Date().toISOString() })
    .eq("id", islemId)
    .eq("teslim_durumu", "bekliyor");
  return !error;
}

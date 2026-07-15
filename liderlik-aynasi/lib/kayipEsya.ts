import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { herkeseBildir } from "@/lib/push";

// ============================================================================
// G8 — KAYIP EŞYA BÜROSU (ARG/keşif)
// ============================================================================
// Sistemin içinde gizli parlayan nokta (bir sayfanın köşesi). İlk bulan +50⚡,
// 24 saat aynı yere dokunan herkes +10⚡ pay alır. 3 aşamalı farkındalık:
// mit-duyurusu → ilk bulan HERKESE push → 48s bulunmazsa ipucu. Kumar değil
// (bulan hep kazanır, ceza yok); gönüllü keşif. Ödüller kivilcim_bonus'a yazılır.

const PAY_ILK = 50;
const PAY_SONRA = 10;
const PAY_PENCERE_MS = 24 * 3_600_000;
const IPUCU_ESIK_MS = 48 * 3_600_000;

// Noktanın saklanabileceği rotalar (admin seçer ya da rastgele).
export const KONUM_SECENEKLER: { yol: string; ad: string }[] = [
  { yol: "/", ad: "Ana sayfa" },
  { yol: "/program", ad: "Program" },
  { yol: "/rekorlar", ad: "Rekorlar" },
  { yol: "/gorevler", ad: "Görevler" },
  { yol: "/koleksiyon", ad: "Koleksiyon" },
  { yol: "/market", ad: "Market" },
];

export async function kayipAcikMi(db: Db): Promise<boolean> {
  const { data } = await db.from("settings").select("value").eq("key", "kayip_esya_acik").maybeSingle();
  return data?.value === "true";
}

type Tur = { id: string; konum: string; ipucu: string; durum: string; bulundu_at: string | null; myth_at: string | null; ipucu_at: string | null; created_at: string };

async function aktifTur(db: Db): Promise<Tur | null> {
  const { data } = await db
    .from("kayip_esya")
    .select("id, konum, ipucu, durum, bulundu_at, myth_at, ipucu_at, created_at")
    .in("durum", ["gizli", "bulundu"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Tur | null) ?? null;
}

// Admin: yeni tur başlat. Öncekini kapat, yeni gizli tur + mit-duyurusu.
export async function turBaslat(db: Db, konum: string, ipucu: string, simdi: Date): Promise<{ ok: boolean }> {
  const gecerli = KONUM_SECENEKLER.some((k) => k.yol === konum);
  if (!gecerli) return { ok: false };
  await db.from("kayip_esya").update({ durum: "bitti" }).in("durum", ["gizli", "bulundu"]);
  const hafta = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(simdi);
  const { data, error } = await db
    .from("kayip_esya")
    .insert({ hafta, konum, ipucu: ipucu.trim().slice(0, 200) || "İpucu: geçmişinin durduğu yer.", myth_at: (await kayipAcikMi(db)) ? simdi.toISOString() : null })
    .select("id")
    .single();
  if (error || !data) return { ok: false };
  if (await kayipAcikMi(db)) {
    await herkeseBildir(
      db,
      "🔍 AYNA bir şey kaybetti",
      "Bu aynanın içinde bir şey kaybettim… ne olduğunu söylemem. Bulursan bana dokun.",
      "/"
    ).catch(() => {});
  }
  return { ok: true };
}

export type KayipDurum = { konum: string; faz: "gizli" | "bulundu_pay"; benAldim: boolean } | null;

// KayipNokta için: aktif tur konumu + faz + kişi pay aldı mı. Mekanik
// kapalıyken KayipNokta yine de 45s'de bir /api/kayip-esya'ya poll atar
// (global layout'ta mount edilir, sayfa bazlı flag-gate mümkün değil) — bu
// yüzden burada ERKEN çıkış şart: bayrak kapalıyken tek ucuz settings okuması
// yeterli, kayip_esya tablosuna hiç dokunulmaz (denetimde canlı loglardan
// bulundu — 142 onboarding kullanıcısının açık sekmeleri gereksiz sorgu atıyordu).
export async function kayipDurum(db: Db, pid: string, simdi: Date): Promise<KayipDurum> {
  if (!(await kayipAcikMi(db))) return null;
  const tur = await aktifTur(db);
  if (!tur) return null;
  let faz: "gizli" | "bulundu_pay";
  if (tur.durum === "gizli") faz = "gizli";
  else if (tur.durum === "bulundu" && tur.bulundu_at && simdi.getTime() - Date.parse(tur.bulundu_at) <= PAY_PENCERE_MS) faz = "bulundu_pay";
  else return null; // pay penceresi kapandı
  const { count } = await db.from("kayip_esya_pay").select("id", { count: "exact", head: true }).eq("kayip_id", tur.id).eq("participant_id", pid);
  return { konum: tur.konum, faz, benAldim: (count ?? 0) > 0 };
}

async function payYaz(db: Db, kayipId: string, pid: string, deger: number, ilk: boolean): Promise<boolean> {
  const { error } = await db.from("kayip_esya_pay").insert({ kayip_id: kayipId, participant_id: pid, deger, ilk });
  if (error) return false; // unique çakışması = zaten aldı
  await db.from("kivilcim_bonus").insert({ participant_id: pid, kaynak: "kayip_esya", deger });
  return true;
}

// Parlayan noktaya dokunma. İlk bulan ya da 24s pay; yoksa null.
export async function kayipBul(db: Db, pid: string, ad: string, simdi: Date): Promise<{ ilk: boolean; deger: number } | null> {
  if (!(await kayipAcikMi(db))) return null;
  const tur = await aktifTur(db);
  if (!tur) return null;

  if (tur.durum === "gizli") {
    // İlk bulan — yarış koruması: durum'u atomik 'bulundu'ya çevir.
    const { data: kilit } = await db
      .from("kayip_esya")
      .update({ durum: "bulundu", bulan_ilk: pid, bulundu_at: simdi.toISOString() })
      .eq("id", tur.id)
      .eq("durum", "gizli")
      .select("id")
      .maybeSingle();
    if (!kilit) {
      // Başkası aynı anda buldu → pay yoluna düş.
      return payYolu(db, tur.id, pid, simdi);
    }
    await payYaz(db, tur.id, pid, PAY_ILK, true);
    const ilkAd = ad.split(" ")[0];
    await herkeseBildir(
      db,
      "🔍 Kayıp eşya bulundu!",
      `${ilkAd} buldu — ilk bulana +${PAY_ILK}⚡. 24 saat aynı yere dokunan herkes pay alır!`,
      tur.konum
    ).catch(() => {});
    return { ilk: true, deger: PAY_ILK };
  }
  return payYolu(db, tur.id, pid, simdi);
}

async function payYolu(db: Db, turId: string, pid: string, simdi: Date): Promise<{ ilk: boolean; deger: number } | null> {
  const { data: tur } = await db.from("kayip_esya").select("bulundu_at").eq("id", turId).maybeSingle();
  if (!tur?.bulundu_at || simdi.getTime() - Date.parse(tur.bulundu_at) > PAY_PENCERE_MS) return null;
  const yazildi = await payYaz(db, turId, pid, PAY_SONRA, false);
  return yazildi ? { ilk: false, deger: PAY_SONRA } : null;
}

// tik bakımı: 48s bulunmayan gizli tura ipucu; 24s biten pay turunu kapat.
export async function kayipBakimTik(db: Db, simdi: Date): Promise<void> {
  try {
    const tur = await aktifTur(db);
    if (!tur) return;
    if (tur.durum === "gizli" && !tur.ipucu_at) {
      const bas = Date.parse(tur.myth_at ?? tur.created_at);
      if (simdi.getTime() - bas >= IPUCU_ESIK_MS) {
        await db.from("kayip_esya").update({ ipucu_at: simdi.toISOString() }).eq("id", tur.id);
        await herkeseBildir(db, "🧭 Kayıp eşya ipucu", tur.ipucu, tur.konum).catch(() => {});
      }
    } else if (tur.durum === "bulundu" && tur.bulundu_at && simdi.getTime() - Date.parse(tur.bulundu_at) > PAY_PENCERE_MS) {
      await db.from("kayip_esya").update({ durum: "bitti" }).eq("id", tur.id);
    }
  } catch {
    /* sessiz */
  }
}

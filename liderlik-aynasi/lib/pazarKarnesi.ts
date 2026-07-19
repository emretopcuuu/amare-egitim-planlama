import "server-only";
import type { supabaseAdmin } from "@/lib/supabase/server";
import { katilimciyaBildir } from "@/lib/push";

type Db = ReturnType<typeof supabaseAdmin>;

// 90 GÜN PROTOKOLÜ · P10 Pazar Karnesi. Haftalık 3 sayı (davet/görüşme/takip)
// kaydedilir + kamp arkadaşına tek satır tanıklık raporu gider. Söz→eylem oranı
// admin panelde bu kayıtlardan türetilir.

/** Bu haftanın anahtarı: en son Pazar'ın (Istanbul) tarihi (YYYY-MM-DD). */
export function buHaftaAnahtari(simdi: Date): string {
  const gunAdi = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    weekday: "short",
  }).format(simdi);
  const sira = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(gunAdi);
  const pazar = new Date(simdi.getTime() - sira * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(pazar);
}

/** Kişinin kamp arkadaşı (partner) id'si — kamp_arkadasi.uyeler'den. */
export async function partnerBul(db: Db, pid: string): Promise<string | null> {
  const { data } = await db.from("kamp_arkadasi").select("uyeler");
  for (const g of data ?? []) {
    const uyeler = (g.uyeler as string[] | null) ?? [];
    if (uyeler.includes(pid)) {
      const digeri = uyeler.find((u) => u !== pid);
      if (digeri) return digeri;
    }
  }
  return null;
}

export async function karneVarMi(db: Db, pid: string, hafta: string): Promise<boolean> {
  const { count } = await db
    .from("pazar_karnesi")
    .select("id", { count: "exact", head: true })
    .eq("participant_id", pid)
    .eq("hafta", hafta);
  return (count ?? 0) > 0;
}

/** Karne kaydet (upsert) + kamp arkadaşına tanıklık raporu (best-effort). */
export async function karneKaydet(
  db: Db,
  pid: string,
  hafta: string,
  s: { davet: number; gorusme: number; takip: number }
): Promise<boolean> {
  const temiz = {
    davet: Math.max(0, Math.min(999, Math.round(s.davet || 0))),
    gorusme: Math.max(0, Math.min(999, Math.round(s.gorusme || 0))),
    takip: Math.max(0, Math.min(999, Math.round(s.takip || 0))),
  };
  const { error } = await db
    .from("pazar_karnesi")
    .upsert({ participant_id: pid, hafta, ...temiz }, { onConflict: "participant_id,hafta" });
  if (error) return false;

  // Kamp arkadaşına tanıklık raporu.
  try {
    const partner = await partnerBul(db, pid);
    if (partner) {
      const { data: kisi } = await db
        .from("participants")
        .select("full_name")
        .eq("id", pid)
        .maybeSingle();
      const ad = kisi?.full_name?.split(" ")[0] ?? "Kamp arkadaşın";
      await katilimciyaBildir(
        db,
        partner,
        "👊 Karne geldi",
        `${ad} bu hafta ${temiz.davet} davet, ${temiz.gorusme} görüşme, ${temiz.takip} takip yaptı — tanığısın.`,
        "/protokol"
      );
    }
  } catch {
    // push yoksa karne yine kaydedildi
  }
  return true;
}

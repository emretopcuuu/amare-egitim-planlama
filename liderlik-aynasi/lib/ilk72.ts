import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { oyunPlaniGetir } from "@/lib/oyunPlani";
import { sozGetir } from "@/lib/soz";

// [E2] İLK 72 SAAT KARTI — söz sonrası salon içi. Kişi oyun planından türetilmiş
// 3 mikro adıma KENDİ gün+saatini seçer; seçilen anda kişisel push (cron/olaylar
// taahhut satırlarını gönderir). Kamp sonrası p72 protokolünden AYRI.

const VARSAYILAN_ADIMLAR = [
  "Kamptan bir kişiyle bugün 10 dakika konuş — hâlini sor, planını değil.",
  "Listenden bir isme dokun: tek bir davet/mesaj gönder.",
  "Bir sonraki adımını yaz: yarın sahada atacağın ilk somut hamle.",
];

// 3 mikro adım metnini üret: önce oyun planı on_gun aksiyonları, yoksa söz
// aksiyonları, o da yoksa varsayılan. Her zaman tam 3 döner.
export async function ilk72Adimlar(db: Db, pid: string): Promise<string[]> {
  const plan = await oyunPlaniGetir(db, pid);
  // İlk 72 Saat artık planın kendi ufku — önce onu kullan, yetmezse 10 gün'le tamamla.
  const planAdim = [
    ...(plan?.ilk_72_saat ?? []).map((m) => m.aksiyon),
    ...(plan?.on_gun ?? []).map((m) => m.aksiyon),
  ].filter(Boolean);
  if (planAdim.length >= 3) return planAdim.slice(0, 3);

  const soz = await sozGetir(db, pid);
  const sozAdim = (soz?.aksiyonlar ?? []).map((a) => a.metin).filter(Boolean);

  const birlesik = [...planAdim, ...sozAdim];
  const sonuc: string[] = [];
  for (const m of birlesik) {
    if (sonuc.length >= 3) break;
    if (!sonuc.includes(m)) sonuc.push(m);
  }
  for (const m of VARSAYILAN_ADIMLAR) {
    if (sonuc.length >= 3) break;
    if (!sonuc.includes(m)) sonuc.push(m);
  }
  return sonuc.slice(0, 3);
}

export type Taahhut = {
  adim: number;
  metin: string;
  planlanan_zaman: string;
  durum: string;
};

export async function taahhutlerGetir(db: Db, pid: string): Promise<Taahhut[]> {
  const { data } = await db
    .from("taahhut")
    .select("adim, metin, planlanan_zaman, durum")
    .eq("participant_id", pid)
    .order("adim", { ascending: true });
  return (data ?? []) as Taahhut[];
}

// Bir taahhüdü "yaptım/geri al" işaretle (durum: yapildi | bekliyor).
export async function taahhutTamamla(
  db: Db,
  pid: string,
  adim: number,
  yapildi: boolean
): Promise<boolean> {
  if (![1, 2, 3].includes(Number(adim))) return false;
  const { error } = await db
    .from("taahhut")
    .update({ durum: yapildi ? "yapildi" : "bekliyor" })
    .eq("participant_id", pid)
    .eq("adim", adim);
  return !error;
}

export type TaahhutGirdi = { adim: number; metin: string; planlanan_zaman: string };

// 3 taahhüdü kaydeder (upsert). Zamanlar gelecekte + 96 saat içinde olmalı.
export async function taahhutKaydet(
  db: Db,
  pid: string,
  girdiler: TaahhutGirdi[]
): Promise<{ ok: boolean; sebep?: string }> {
  const simdi = Date.now();
  const enGec = simdi + 96 * 3_600_000;
  const temiz: {
    participant_id: string;
    adim: number;
    metin: string;
    planlanan_zaman: string;
    push_gonderildi: boolean;
    durum: string;
  }[] = [];
  for (const g of girdiler) {
    const adim = Number(g.adim);
    const metin = (g.metin ?? "").trim().slice(0, 500);
    const t = Date.parse(g.planlanan_zaman);
    if (![1, 2, 3].includes(adim) || !metin || !Number.isFinite(t)) {
      return { ok: false, sebep: "gecersiz" };
    }
    if (t < simdi - 60_000 || t > enGec) return { ok: false, sebep: "zaman" };
    temiz.push({
      participant_id: pid,
      adim,
      metin,
      planlanan_zaman: new Date(t).toISOString(),
      push_gonderildi: false,
      durum: "bekliyor",
    });
  }
  if (temiz.length === 0) return { ok: false, sebep: "bos" };
  const { error } = await db.from("taahhut").upsert(temiz, { onConflict: "participant_id,adim" });
  return error ? { ok: false, sebep: "hata" } : { ok: true };
}

// [E2] Cron kancası: zamanı gelmiş, gönderilmemiş taahhütleri döndürür
// (cron/olaylar bunları push'lar). Kaynak: dakikalık cron.
export async function bekleyenTaahhutler(
  db: Db
): Promise<{ id: string; participant_id: string; metin: string }[]> {
  const { data } = await db
    .from("taahhut")
    .select("id, participant_id, metin")
    .eq("push_gonderildi", false)
    .lte("planlanan_zaman", new Date().toISOString())
    .limit(200);
  return data ?? [];
}

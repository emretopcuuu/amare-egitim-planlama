import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { OZLU_SOZLER } from "@/lib/ozluSozler";
import { herkeseBildir } from "@/lib/push";

// ============================================================================
// G2 — GİZEMLİ SANDIK
// ============================================================================
// Her 3 puanlanmış görevde bir sandık HAKKI doğar (kazanılan = floor(scored/3)).
// Kişi açar → ağırlıklı rastgele ödül. ASLA boş/ceza (kumar guardrail'i): her
// sonuç bir şey verir; "kaybetme" hissi yok. Rastgelelik SUNUCUDA — istemciye
// ödül tablosu sızmaz. Kıvılcım ödülü G1 cüzdan+toplamına akar (kazancToplami
// sandik_gecmisi.deger'i toplar), yani sandık kazancı da AKTİVİTEyle gelir.

export const SANDIK_ESIK = 3; // her 3 scored görevde 1 sandık

export async function sandikAcikMi(db: Db): Promise<boolean> {
  const { data } = await db.from("settings").select("value").eq("key", "sandik_acik").maybeSingle();
  return data?.value === "true";
}

export type SandikDurum = { kazanilan: number; acilan: number; bekleyen: number };

export async function sandikDurumu(db: Db, pid: string): Promise<SandikDurum> {
  const [{ count: scored }, { count: acilan }] = await Promise.all([
    db.from("missions").select("id", { count: "exact", head: true }).eq("participant_id", pid).eq("status", "scored"),
    db.from("sandik_gecmisi").select("id", { count: "exact", head: true }).eq("participant_id", pid),
  ]);
  const kazanilan = Math.floor((scored ?? 0) / SANDIK_ESIK);
  const ac = acilan ?? 0;
  return { kazanilan, acilan: ac, bekleyen: Math.max(0, kazanilan - ac) };
}

export type Odul = {
  tur: "kivilcim" | "ayna_karti" | "gizli_gorev" | "rozet" | "altin";
  deger: number;
  baslik: string;
  metin: string;
  ikon: string;
  altin: boolean;
};

const NADIR_ROZETLER = ["Gece Yıldızı", "Kıvılcım Avcısı", "Sessiz Kahraman", "Işık Taşıyıcı", "Şafak Bekçisi"];

// Ağırlıklı rastgele ödül seç (sunucu). Toplam 100: kıvılcım 50, kart 25,
// gizli görev 15, rozet 8, altın 2. Hiçbiri boş değil.
function odulSec(): { tur: Odul["tur"]; deger: number; meta: Record<string, unknown> } {
  const r = Math.random() * 100;
  if (r < 50) {
    // kıvılcım 10-30 (ağırlık: küçük değerler daha sık)
    const taban = 10 + Math.floor(Math.random() * Math.random() * 21); // 10..30, düşüğe eğimli
    return { tur: "kivilcim", deger: Math.min(30, taban), meta: {} };
  }
  if (r < 75) {
    const kats = Object.values(OZLU_SOZLER).flat();
    const s = kats[Math.floor(Math.random() * kats.length)];
    return { tur: "ayna_karti", deger: 0, meta: { metin: s.metin, kaynak: s.kaynak } };
  }
  if (r < 90) {
    return { tur: "gizli_gorev", deger: 8, meta: {} }; // davet + küçük kıvılcım (boş değil)
  }
  if (r < 98) {
    const ad = NADIR_ROZETLER[Math.floor(Math.random() * NADIR_ROZETLER.length)];
    return { tur: "rozet", deger: 0, meta: { ad } };
  }
  return { tur: "altin", deger: 100, meta: {} };
}

function odulSun(tur: Odul["tur"], deger: number, meta: Record<string, unknown>): Odul {
  switch (tur) {
    case "kivilcim":
      return { tur, deger, baslik: `+${deger} kıvılcım`, metin: "Cüzdanına eklendi.", ikon: "⚡", altin: false };
    case "ayna_karti":
      return {
        tur,
        deger: 0,
        baslik: "Ayna Kartı",
        metin: `"${meta.metin}" — ${meta.kaynak}`,
        ikon: "🃏",
        altin: false,
      };
    case "gizli_gorev":
      return { tur, deger, baslik: "Gizli görev daveti", metin: `Sürpriz bir görev + ${deger} kıvılcım seni bekliyor.`, ikon: "🎭", altin: false };
    case "rozet":
      return { tur, deger: 0, baslik: `Nadir rozet: ${meta.ad}`, metin: "Koleksiyonuna eklendi.", ikon: "🏅", altin: false };
    case "altin":
      return { tur, deger, baslik: "ALTIN SANDIK!", metin: `+${deger} kıvılcım — bütün kamp bunu duydu.`, ikon: "🥇", altin: true };
  }
}

// Sandık aç — hak yoksa null. Kapalıysa null. Rastgele ödül insert + döndür.
export async function sandikAc(db: Db, pid: string, ad: string): Promise<Odul | null> {
  if (!(await sandikAcikMi(db))) return null;
  const durum = await sandikDurumu(db, pid);
  if (durum.bekleyen <= 0) return null;

  const { tur, deger, meta } = odulSec();
  const { error } = await db.from("sandik_gecmisi").insert({
    participant_id: pid,
    tur,
    deger,
    meta: meta as unknown as never,
  });
  if (error) return null;

  const odul = odulSun(tur, deger, meta);
  if (tur === "altin") {
    const ilk = ad.split(" ")[0];
    await herkeseBildir(db, "🥇 Altın sandık açıldı!", `${ilk} altın sandığı buldu — kampta biri çok şanslı.`, "/").catch(() => {});
  }
  return odul;
}

export type KoleksiyonKart = { tur: string; baslik: string; metin: string; ikon: string; at: string };

export async function koleksiyon(db: Db, pid: string): Promise<KoleksiyonKart[]> {
  const { data } = await db
    .from("sandik_gecmisi")
    .select("tur, deger, meta, acildi_at")
    .eq("participant_id", pid)
    .in("tur", ["ayna_karti", "rozet", "altin"])
    .order("acildi_at", { ascending: false })
    .limit(60);
  return ((data ?? []) as { tur: string; deger: number; meta: Record<string, unknown>; acildi_at: string }[]).map((r) => {
    const o = odulSun(r.tur as Odul["tur"], r.deger, r.meta ?? {});
    return { tur: r.tur, baslik: o.baslik, metin: o.metin, ikon: o.ikon, at: r.acildi_at };
  });
}

import "server-only";
import type { Db } from "@/lib/degerlendirme";

// [FAZ1-B] OTOMASYON NABZI — sistemin kalp atışı görünür olsun. Bugün yakalanan
// "cron günde 1 çalışıyormuş" sınıfı hatanın kalıcı bekçisi: tik ve olaylar
// cron'u her koşuda buraya damga vurur; NabizSeridi her admin sayfasında okur.

export const NABIZ_TIK = "son_tik_at";
export const NABIZ_OLAYLAR = "son_olaylar_at";

// Damga vur (best-effort — akışı asla kırmaz).
export async function nabizVur(db: Db, anahtar: string): Promise<void> {
  try {
    await db
      .from("settings")
      .upsert({ key: anahtar, value: new Date().toISOString(), updated_at: new Date().toISOString() });
  } catch {
    /* nabız yazımı hiçbir akışı bozmaz */
  }
}

export type Nabiz = {
  tikDk: number | null; // son tik kaç dk önce (null = hiç)
  olaylarDk: number | null; // son olaylar-cron kaç dk önce
  durduruldu: boolean; // orkestratör elle durduruldu mu
  bekleyen: number; // bekleyen senaryo satırı
  hataSatirSayisi: number; // 'hata' durumunda kalan, yeniden denenmeyi bekleyen satır
  sonHata: string | null; // son orkestrator_hata olay kodu (varsa)
  kampAcik: boolean; // ayna_aktif
};

export async function nabizOku(db: Db): Promise<Nabiz> {
  const [{ data: ayarlar }, { count: bekleyen }, { count: hataSayisi }, { data: hata }] = await Promise.all([
    db
      .from("settings")
      .select("key, value")
      .in("key", [NABIZ_TIK, NABIZ_OLAYLAR, "orkestrator_durduruldu", "ayna_aktif"]),
    db.from("kamp_senaryosu").select("id", { count: "exact", head: true }).eq("durum", "bekliyor"),
    db.from("kamp_senaryosu").select("id", { count: "exact", head: true }).eq("durum", "hata"),
    db
      .from("audit_log")
      .select("detay, created_at")
      .eq("eylem", "orkestrator_hata")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  const a = new Map((ayarlar ?? []).map((s) => [s.key, s.value]));
  const dk = (v: string | undefined) => {
    if (!v) return null;
    const t = Date.parse(v);
    return Number.isFinite(t) ? Math.max(0, Math.round((Date.now() - t) / 60_000)) : null;
  };
  const sonHataDetay = hata?.[0]?.detay as { olay_kodu?: string } | null;
  // Son 24 saatten eski hatayı gösterme (bayat gürültü) — ama satır hâlâ
  // 'hata' durumundaysa hataSatirSayisi zaten kalıcı olarak uyarır.
  const hataTaze =
    hata?.[0]?.created_at && Date.now() - Date.parse(hata[0].created_at) < 24 * 3_600_000;

  return {
    tikDk: dk(a.get(NABIZ_TIK)),
    olaylarDk: dk(a.get(NABIZ_OLAYLAR)),
    durduruldu: a.get("orkestrator_durduruldu") === "true",
    bekleyen: bekleyen ?? 0,
    hataSatirSayisi: hataSayisi ?? 0,
    sonHata: hataTaze ? (sonHataDetay?.olay_kodu ?? "bilinmeyen") : null,
    kampAcik: a.get("ayna_aktif") === "true",
  };
}

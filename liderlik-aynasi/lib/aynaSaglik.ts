import "server-only";
import type { Db } from "@/lib/degerlendirme";

// #5 — AYNA CANLI SAĞLIK PANOSU. 150 kişi aynı anda AI'a vururken operatörün
// "her şey yolunda mı?" sorusuna tek bakışta cevap: son 24 saatteki AI hataları
// (kaynağa göre), son hata, ve günün AI iş hacmi (görev üretimi/puanlama).
// Kritik hatalar (kredi/anahtar) zaten e-posta uyarısı tetikler; bu panel
// operatörün gözüyle gerçek-zamanlı izleme katmanıdır.

export type SaglikDurumu = "iyi" | "uyari" | "kritik";

export type AynaSaglik = {
  durum: SaglikDurumu;
  // Son 24 saat AI hataları, kaynağa göre (audit_log eylem ~ "*_ai_hata"/"ai_hata")
  hatalar: { kaynak: string; sayi: number }[];
  toplamHata: number;
  sonHata: { kaynak: string; mesaj: string; ts: string } | null;
  // Günün AI iş hacmi
  bugunUretilen: number; // bugün üretilen görev
  bugunPuanlanan: number; // bugün puanlanan görev
  bugunBekleyen: number; // şu an puanlama bekleyen (submitted)
  // Kriz bayrakları (insan müdahalesi gereken)
  krizBayragi: number;
};

const HATA_EYLEMLERI = ["ai_hata", "hedef_ai_hata", "kocu_hata", "pusula_ai_hata"];

// audit_log eylem → okunur kaynak adı
const KAYNAK_AD: Record<string, string> = {
  ai_hata: "Görev üretimi/puanlama",
  hedef_ai_hata: "Hedef",
  kocu_hata: "Ayna Koçu",
  pusula_ai_hata: "Pusula",
};

export async function aynaSaglik(db: Db): Promise<AynaSaglik> {
  const simdi = Date.now();
  const yirmiDortOnce = new Date(simdi - 24 * 3_600_000).toISOString();
  const bugunBasISO = new Date(
    `${new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date(simdi))}T00:00:00+03:00`
  ).toISOString();

  const [
    { data: hataKayitlari },
    { count: krizSayi },
    { count: uretilen },
    { count: puanlanan },
    { count: bekleyen },
  ] = await Promise.all([
    db
      .from("audit_log")
      .select("eylem, detay, created_at")
      .in("eylem", HATA_EYLEMLERI)
      .gte("created_at", yirmiDortOnce)
      .order("created_at", { ascending: false })
      .limit(200),
    db
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .eq("eylem", "kriz_dili_tespit")
      .gte("created_at", yirmiDortOnce),
    db
      .from("missions")
      .select("id", { count: "exact", head: true })
      .gte("issued_at", bugunBasISO),
    db
      .from("missions")
      .select("id", { count: "exact", head: true })
      .eq("status", "scored")
      .gte("scored_at", bugunBasISO),
    db.from("missions").select("id", { count: "exact", head: true }).eq("status", "submitted"),
  ]);

  const kayitlar = hataKayitlari ?? [];
  const sayac = new Map<string, number>();
  for (const k of kayitlar) sayac.set(k.eylem, (sayac.get(k.eylem) ?? 0) + 1);
  const hatalar = [...sayac.entries()]
    .map(([eylem, sayi]) => ({ kaynak: KAYNAK_AD[eylem] ?? eylem, sayi }))
    .sort((a, b) => b.sayi - a.sayi);
  const toplamHata = kayitlar.length;

  const sonKayit = kayitlar[0];
  const sonHata = sonKayit
    ? {
        kaynak: KAYNAK_AD[sonKayit.eylem] ?? sonKayit.eylem,
        mesaj:
          ((sonKayit.detay as { message?: string } | null)?.message ?? "Bilinmeyen hata").slice(
            0,
            200
          ),
        ts: sonKayit.created_at,
      }
    : null;

  // Durum: kredi/anahtar gibi kritik bir mesaj ya da yoğun hata → kritik;
  // birkaç hata → uyarı; temiz → iyi.
  const kritikMesaj = kayitlar.some((k) => {
    const m = ((k.detay as { message?: string } | null)?.message ?? "").toLowerCase();
    return m.includes("credit") || m.includes("billing") || m.includes("authentication");
  });
  const durum: SaglikDurumu =
    kritikMesaj || toplamHata >= 20 ? "kritik" : toplamHata > 0 ? "uyari" : "iyi";

  return {
    durum,
    hatalar,
    toplamHata,
    sonHata,
    bugunUretilen: uretilen ?? 0,
    bugunPuanlanan: puanlanan ?? 0,
    bugunBekleyen: bekleyen ?? 0,
    krizBayragi: krizSayi ?? 0,
  };
}

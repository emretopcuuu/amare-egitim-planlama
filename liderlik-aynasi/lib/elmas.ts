import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { unvanBul, UNVANLAR } from "@/lib/kivilcim";

// KİMLİK ELMASI — katılımcının ana sayfasındaki canlı 3B elmasını besleyen veri.
// Her tamamlanan görev, o görevin çalıştırdığı liderlik özelliğine (trait) denk
// gelen FASETİ ışıtır. 10 özellik = elmasın 10 faseti. Tamamlanan görev sayısı
// arttıkça elmas bütünleşir/parlar. Saf agregat — kişiye özel, motive edici.

export type Facet = {
  ad: string; // liderlik özelliği adı (ör. "Cesaret")
  deger: number; // 0..1 fasetin parlaklığı
  gorevSayisi: number; // bu fasete katkı yapan tamamlanmış görev sayısı
};

export type ElmasVeri = {
  tamamlanan: number; // toplam tamamlanan (submitted+scored) görev
  parlaklik: number; // 0..1 elmasın genel parlaklığı (bütünleşme)
  ortalamaPuan: number | null; // puanlanan görevlerin ortalaması (1-10)
  facetler: Facet[]; // her zaman 10 (sıralı)
  sonFacet: string | null; // en son ışıyan özellik (kıvılcım vurgusu)
  asama: number; // 1..5 — unvana (Çırak→Efsane) göre elmas görseli aşaması
  unvanAd: string; // mevcut unvan adı
};

// Bir faset "tam dolu" sayılması için gereken tamamlanmış görev (yumuşak eğri).
const FASET_DOYUM = 2;
// Elmasın tam parlaması için hedef toplam görev (3 günde makul üst sınır).
const PARLAK_HEDEF = 9;

export async function kimlikElmasiVerisi(db: Db, pid: string): Promise<ElmasVeri> {
  const [{ data: traits }, { data: gorevler }] = await Promise.all([
    db.from("traits").select("id, name").order("sort_order", { ascending: true }),
    db
      .from("missions")
      .select("trait_id, status, ai_score, scored_at, spark_points")
      .eq("participant_id", pid)
      .in("status", ["submitted", "scored"])
      .order("scored_at", { ascending: true }),
  ]);

  const traitListe = (traits ?? []) as { id: number; name: string }[];
  const tamamlar = (gorevler ?? []) as {
    trait_id: number | null;
    status: string;
    ai_score: number | null;
    scored_at: string | null;
    spark_points: number | null;
  }[];

  // trait_id → tamamlanan görev sayısı.
  const sayac = new Map<number, number>();
  let puanTopla = 0;
  let puanAdet = 0;
  let toplamKivilcim = 0;
  let sonTraitId: number | null = null;
  for (const g of tamamlar) {
    if (g.trait_id != null) {
      sayac.set(g.trait_id, (sayac.get(g.trait_id) ?? 0) + 1);
      sonTraitId = g.trait_id; // scored_at sıralı → en sonuncusu en taze
    }
    if (g.ai_score != null) {
      puanTopla += g.ai_score;
      puanAdet += 1;
    }
    toplamKivilcim += g.spark_points ?? 0;
  }

  const facetler: Facet[] = traitListe.map((tr) => {
    const n = sayac.get(tr.id) ?? 0;
    return { ad: tr.name, deger: Math.min(1, n / FASET_DOYUM), gorevSayisi: n };
  });

  const tamamlanan = tamamlar.length;
  // Genel parlaklık: hem toplam sayı hem faset YAYGINLIĞI (kaç farklı özellik
  // ışıdı) birlikte — tek özelliği tekrar etmek elması tam parlatmasın.
  const yaygin = facetler.filter((f) => f.deger > 0).length / Math.max(1, traitListe.length);
  const sayiOran = Math.min(1, tamamlanan / PARLAK_HEDEF);
  const parlaklik = Math.min(1, sayiOran * 0.65 + yaygin * 0.35);

  // AŞAMA — 5 unvan (Çırak→Efsane) = 5 elmas görseli. unvan indeksi + 1 (1..5).
  const unvan = unvanBul(toplamKivilcim);
  const unvanIndex = Math.max(0, UNVANLAR.findIndex((u) => u.ad === unvan.mevcut.ad));
  const asama = Math.min(UNVANLAR.length, unvanIndex + 1);

  return {
    tamamlanan,
    parlaklik,
    ortalamaPuan: puanAdet > 0 ? Math.round((puanTopla / puanAdet) * 10) / 10 : null,
    facetler,
    sonFacet: sonTraitId != null ? (traitListe.find((t) => t.id === sonTraitId)?.name ?? null) : null,
    asama,
    unvanAd: unvan.mevcut.ad,
  };
}

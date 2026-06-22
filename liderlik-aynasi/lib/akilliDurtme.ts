import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { katilimciyaBildir } from "@/lib/push";
import { tr } from "@/lib/i18n/tr";

// #9 Akıllı zamanlı bildirimler: genel toplu dürtme yerine GERÇEK veriye dayalı,
// kişiye özel bildirim. "Bugün N kişi seni gözlemledi" — merak + karşılıklılık
// uyandırır, kişiyi sırada bekleyen kendi gözlemlerini tamamlamaya çeker.
//
// Gizlilik: yalnızca SAYI gönderilir (kim gözledi asla taşınmaz). Push yükü
// katılımcının kendi cihazına gider; başkasının kimliği ifşa olmaz.
//
// Tekrar koruması: aynı takvim gününde bir kez çalışır (settings anahtarı).
// Böylece günlük cron birden çok kez tetiklense de kimse spam'lenmez.

const SON_TARIH_ANAHTAR = "akilli_durtme_son_tarih";

function bugunString(): string {
  // Kamp Türkiye'de: UTC+3 ile "gün" sınırını yerel akşamla hizala
  const yerel = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return yerel.toISOString().slice(0, 10); // YYYY-MM-DD
}

export type AkilliDurtmeSonuc = {
  atlandi: boolean;
  gonderilen: number;
};

export async function akilliDurtmeleriGonder(
  db: Db,
  zorla = false
): Promise<AkilliDurtmeSonuc> {
  const bugun = bugunString();

  // Tekrar koruması: bugün zaten çalıştıysa atla (admin "zorla" ile geçebilir)
  if (!zorla) {
    const { data: son } = await db
      .from("settings")
      .select("value")
      .eq("key", SON_TARIH_ANAHTAR)
      .maybeSingle();
    if (son?.value === bugun) return { atlandi: true, gonderilen: 0 };
  }

  // Son 24 saatte yapılan dış (öz olmayan) puanlamalar — kim kimi puanladı.
  // target_id başına FARKLI rater sayısı = "bugün seni gözleyen kişi sayısı".
  const yirmiDortSaatOnce = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ).toISOString();
  const { data: puanlar } = await db
    .from("ratings")
    .select("rater_id, target_id")
    .eq("is_self", false)
    .gte("created_at", yirmiDortSaatOnce);

  const gozleyenler = new Map<string, Set<string>>();
  for (const p of puanlar ?? []) {
    const küme = gozleyenler.get(p.target_id) ?? new Set<string>();
    küme.add(p.rater_id);
    gozleyenler.set(p.target_id, küme);
  }

  let gonderilen = 0;
  for (const [hedefId, raterKumesi] of gozleyenler) {
    const n = raterKumesi.size;
    if (n < 1) continue;
    try {
      await katilimciyaBildir(
        db,
        hedefId,
        tr.akilliDurtme.gozlendiBaslik(n),
        tr.akilliDurtme.gozlendiGovde,
        "/degerlendir"
      );
      gonderilen++;
    } catch {
      // bireysel başarısızlık tüm turu durdurmasın
    }
  }

  // Bugün çalıştı işaretle
  await db.from("settings").upsert(
    {
      key: SON_TARIH_ANAHTAR,
      value: bugun,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  return { atlandi: false, gonderilen };
}

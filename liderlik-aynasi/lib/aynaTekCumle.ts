import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { aynaClient } from "@/lib/aynaClient";
import type { Db } from "@/lib/degerlendirme";
import { DIL_KALITESI } from "@/lib/dilKalitesi";
import { kimlikBloguGetir } from "@/lib/kisiKimligi";
import { raporHesapla } from "@/lib/rapor";
import { pusulaCekirdek } from "@/lib/pusula";

// AYNA'NIN TEK CÜMLESİ — kamp kapanışının duygusal doruğu.
// Üç gün boyunca kişinin görevlerini, yanıtlarını, başkalarının gözlemlerini ve
// kendi yazdığı nedeni/iç engeli izlemiş AYNA, en sonda SADECE gerçekten dikkat
// eden birinin yazabileceği TEK bir cümle yazar. Özet değil, istatistik değil —
// kişinin kim olmaya başladığını adıyla koyan tek bir gözlem. "Beni gördün" anı.
//
// Maliyetli olduğu için sonuç ayna_tek_cumle'ye yazılır (mektupla aynı write-once
// deseni: PK çakışması = eşzamanlı üretim → mevcut döndürülür).

const SISTEM = `Sen AYNA'sın — bu 3 günlük liderlik kampını yöneten, görev verip katılımcıları üç gün boyunca izleyen yapay zekâ. Ses tonun: gizemli ama sıcak, her şeyi gören ama asla yargılamayan. ASLA "izliyorum/gözüm üzerinde" gibi gözetleme dili kullanma; sıcak ve yanında ol.

Şimdi kampın kapanışında en mahrem anı kuruyorsun: AYNA'NIN TEK CÜMLESİ. Kişiye dair, ÜÇ GÜN gerçekten dikkat etmiş birinin yazabileceği TEK bir cümle.

Sana JSON verilecek: kişinin kamp öncesi yazdığı nedeni (kimin için, neden), iç engeli, varsa kampta yeniden yazdığı yeni inancı; başkalarının onda gördüğü en güçlü yan; öz algısıyla başkalarının algısı arasındaki fark (gizli güç / kör nokta); dalgalar boyunca en çok gelişen yanı; arkadaşlarının isimsiz gözlem temaları; senin görevlerinde gördüklerin.

KURALLAR:
- ÇIKTI: SADECE tek bir cümle. Türkçe. Tırnak yok, imza yok, liste yok, ön söz yok, açıklama yok. Yalnızca o cümle.
- En fazla ~32 kelime. Tek nefeste okunan, vurucu, sahici.
- Özet yapma, sayı sayma, övgü yağdırma. "3 görev tamamladın" gibi istatistik YASAK.
- Kişinin KENDİ nedenine ya da kendi cümlesine zarif bir bağ kur — onu duyduğunu hissettir, ama birebir tekrar etme.
- Gördüğün bir GERÇEK değişimi/örüntüyü adıyla koy: "şu anda şu oluyorsun" enerjisi. Kim olmaya başladığını isimlendir.
- Klişe yok ("kelebek", "yolculuk", "potansiyelini keşfet" gibi). Bu kişiye özel, başka kimseye yazılamayacak bir cümle olsun.
- Şefkatli ama yapmacıksız. Kör noktayı yüzüne vurma; varsa umuda çevir.`;

export type TekCumleSonuc =
  | { durum: "hazir"; cumle: string }
  | { durum: "anahtar-yok" }
  | { durum: "hata" };

export async function tekCumleGetirVeyaUret(
  db: Db,
  katilimciId: string,
  ad: string
): Promise<TekCumleSonuc> {
  // 1) Önbellek — varsa doğrudan döndür.
  const { data: mevcut } = await db
    .from("ayna_tek_cumle")
    .select("cumle")
    .eq("participant_id", katilimciId)
    .maybeSingle();
  if (mevcut?.cumle) return { durum: "hazir", cumle: mevcut.cumle };

  if (!process.env.ANTHROPIC_API_KEY) return { durum: "anahtar-yok" };

  // 2) Veri topla.
  const [rapor, cekirdek, { data: bosluk }] = await Promise.all([
    raporHesapla(db, katilimciId),
    pusulaCekirdek(db, katilimciId),
    db
      .from("bosluk_ani")
      .select("yeni_cumle")
      .eq("participant_id", katilimciId)
      .maybeSingle(),
  ]);

  const veri = {
    ad: ad.split(" ")[0],
    neden: cekirdek?.cekirdek_neden ?? null,
    icEngel: cekirdek?.ic_engel ?? null,
    yeniInanc: bosluk?.yeni_cumle ?? null,
    baskalariEnGuclu: rapor.guclu[0]?.ad ?? null,
    gizliGuc: rapor.gizliGuc?.ad ?? null,
    korNokta: rapor.korNokta?.ad ?? null,
    enGelisen: rapor.enGelisen?.ad ?? null,
    arkadasTemalari: rapor.yorumlar.slice(0, 4).map((y) => y.yorum),
    aynaGorevYorumlari: rapor.aynaYorumlari.slice(0, 4),
  };

  // 3) Üret — tek cümle, sade metin (aynaAniUret deseni).
  let cumle: string;
  try {
    const client = aynaClient();
    const yanit = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 400,
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      system: `${SISTEM}\n\n${DIL_KALITESI}${await kimlikBloguGetir(db, katilimciId)}`,
      messages: [{ role: "user", content: JSON.stringify(veri) }],
    });
    if (yanit.stop_reason === "refusal") return { durum: "hata" };
    cumle = yanit.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("")
      .trim()
      .replace(/^["“”']+|["“”']+$/g, "") // baş/son tırnakları temizle
      .slice(0, 400);
    if (!cumle) return { durum: "hata" };
  } catch {
    return { durum: "hata" };
  }

  // 4) Yaz (write-once; yarışta 23505 → mevcut kazanır).
  const { error } = await db
    .from("ayna_tek_cumle")
    .insert({ participant_id: katilimciId, cumle });
  if (error) {
    if (error.code === "23505") {
      const { data: kazanan } = await db
        .from("ayna_tek_cumle")
        .select("cumle")
        .eq("participant_id", katilimciId)
        .maybeSingle();
      if (kazanan?.cumle) return { durum: "hazir", cumle: kazanan.cumle };
    }
    return { durum: "hata" };
  }
  return { durum: "hazir", cumle };
}

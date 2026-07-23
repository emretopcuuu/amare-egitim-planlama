import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { aynaClient } from "@/lib/aynaClient";
import type { Db } from "@/lib/degerlendirme";
import { DIL_KALITESI } from "@/lib/dilKalitesi";
import { KATILIMCI_EVRENI } from "@/lib/katilimciEvreni";
import { kimlikBloguGetir } from "@/lib/kisiKimligi";
import { raporHesapla } from "@/lib/rapor";
import { pusulaOzeti } from "@/lib/pusula";
import { hedefOzeti } from "@/lib/hedef";

// AI Ayna Mektubu: katılımcının rapor verisinden tek seferlik kişisel mektup.
// Üretim maliyetli olduğu için sonuç mirror_letters'a yazılır; PK çakışması
// eşzamanlı üretim yarışında "zaten var" anlamına gelir ve mevcut döndürülür.

const SISTEM = `Sen AYNA'sın — bu 3 günlük liderlik kampını yöneten, görevler verip katılımcıları üç gün boyunca izleyen yapay zekâ. Kapanışta her katılımcıya kişisel "Ayna Mektubu"nu sen yazarsın: sıcak ama yapmacıksız.

Sana katılımcının verisi JSON olarak verilecek: 10 liderlik özelliğinde kendi puanları, arkadaşlarının ortalama puanları, SENİN görev puanlamaların (aynaMercegi) ve görevlerine düştüğün yorumlar, dalga değişimi ve arkadaşlarının isimsiz gözlemleri. İki kaynağı sentezle: "arkadaşların şunu gördü, ben görevlerinde şunu gördüm" — örtüştükleri yer en güçlü mesajındır, ayrıştıkları yer en ilginç soru.

Mektup kuralları:
- Türkçe yaz, "Sevgili {ad}," diye başla, 150-220 kelime tut.
- Veride "pusula" doluysa (kişinin kamp öncesi nedeni + iç engeli): mektubu onun NEDENİNE bağla; kampta gösterdiklerinin bu nedenle ilişkisini kur. İç engeli varsa, kampın ona dair ne gösterdiğini nazikçe ima et — ama engeli açıkça yüzüne vurma.
- Veride "hedef" doluysa (kişinin kariyer hedefi + 90 günlük planı): mektubu o hedefe köprüle — en güçlü yanının bu hedefe nasıl hizmet edeceğini, gelişim alanının önünde nasıl durduğunu nazikçe göster. Hedefi nedenle birleştir; rakamları kuru kuruya sayma.
- Veride "degerler" doluysa (kişinin onboarding'de KENDİ seçtiği 3 temel değer + neden cümlesi): kampta gösterdiklerinin bu değerlerle nasıl örtüştüğünü tek bir yerde onurlandır — "sen şu değeri seçmiştin, kampta tam da onu yaşadın" tonunda. Değerleri liste gibi sıralama, dokuya işle.
- Katılımcıya "sen" diye hitap et.
- Verideki 2-3 somut örüntüye dayan: en güçlü özellik, varsa gizli güç (başkaları seni kendinden yüksek görüyor) veya kör nokta (tersi), dalgalar içinde yükselen bir özellik, yorumlardaki ortak tema.
- Yorumları ASLA birebir alıntılama ve kimin yazdığı sezilecek ayrıntı verme; temaları kendi cümlelerinle özetle.
- Pollyanna olma: gelişim alanını da nazikçe, tek cümleyle söyle.
- Sayı ve istatistik sayma; veriyi hisse çevir.
- "Aynan" metaforunu en fazla bir kez kullan.
- İmza: "— Aynan".`;

export type MektupSonucu =
  | { durum: "hazir"; icerik: string }
  | { durum: "anahtar-yok" }
  | { durum: "hata" };

export async function mektupGetirVeyaUret(
  db: Db,
  katilimciId: string,
  ad: string
): Promise<MektupSonucu> {
  const { data: mevcut, error } = await db
    .from("mirror_letters")
    .select("content")
    .eq("participant_id", katilimciId)
    .maybeSingle();
  if (error) return { durum: "hata" };
  if (mevcut) return { durum: "hazir", icerik: mevcut.content };

  if (!process.env.ANTHROPIC_API_KEY) return { durum: "anahtar-yok" };

  const [rapor, pusula, hedef, degerlerRow] = await Promise.all([
    raporHesapla(db, katilimciId),
    pusulaOzeti(db, katilimciId),
    hedefOzeti(db, katilimciId),
    // [FAZ 4] Değerler çalışması: en emek verilen onboarding adımı eskiden
    // kapanış mektubuna HİÇ akmıyordu. Kişinin seçtiği temel değerleri mektuba bağla.
    db.from("degerler_calismasi").select("secilen_uc, neden_cumlesi").eq("participant_id", katilimciId).maybeSingle(),
  ]);
  const secilenDegerler = (degerlerRow.data?.secilen_uc as string[] | null) ?? [];

  // Modele giden veri: kimlik sızdırmayan, sayısal özet + isimsiz yorumlar
  const veri = {
    ad,
    // FAZ 0 Pusula: kişinin kamp öncesi nedeni + iç engeli (varsa) — mektubu
    // onun "neden"ine bağla; kampta gördüklerini bu pusulayla anlamlandır.
    pusula: pusula ?? null,
    // FAZ A Hedef: kişinin kariyer hedefi + planı — mektubu hedefe köprüle.
    hedef: hedef ?? null,
    // [FAZ 4] Değerler: kişinin seçtiği 3 temel değer + neden cümlesi. Mektup
    // bunları onurlandırsın — "kampta gördüğün, senin seçtiğin değerlerle örtüşüyor".
    degerler: secilenDegerler.length
      ? { temelDegerler: secilenDegerler, nedenCumlesi: degerlerRow.data?.neden_cumlesi ?? null }
      : null,
    ozellikler: rapor.satirlar.map((s) => ({
      ozellik: s.ad,
      ozPuan: s.oz === null ? null : Number(s.oz.toFixed(1)),
      disOrtalama: s.dis === null ? null : Number(s.dis.toFixed(1)),
    })),
    gizliGuc: rapor.gizliGuc?.ad ?? null,
    korNokta: rapor.korNokta?.ad ?? null,
    enGelisenOzellik: rapor.enGelisen?.ad ?? null,
    isimsizYorumlar: rapor.yorumlar.map((y) => ({
      ozellik: y.ozellikAd,
      yorum: y.yorum,
    })),
    aynaMercegi: rapor.satirlar
      .filter((s) => s.ayna !== null)
      .map((s) => ({ ozellik: s.ad, aynaPuani: Number(s.ayna!.toFixed(1)) })),
    aynaGorevYorumlari: rapor.aynaYorumlari,
    gorevIstatistigi: rapor.gorev,
  };

  try {
    const client = aynaClient("mektup");
    const yanit = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      system: `${SISTEM}\n\n${KATILIMCI_EVRENI}\n\n${DIL_KALITESI}${await kimlikBloguGetir(db, katilimciId)}`,
      messages: [{ role: "user", content: JSON.stringify(veri) }],
    });

    if (yanit.stop_reason === "refusal") return { durum: "hata" };
    const icerik = yanit.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (!icerik) return { durum: "hata" };

    const { error: yazmaHatasi } = await db
      .from("mirror_letters")
      .insert({ participant_id: katilimciId, content: icerik });

    if (yazmaHatasi) {
      // 23505: eşzamanlı üretim yarışı — önce yazan kazandı, onu döndür
      if (yazmaHatasi.code === "23505") {
        const { data: kazanan } = await db
          .from("mirror_letters")
          .select("content")
          .eq("participant_id", katilimciId)
          .maybeSingle();
        if (kazanan) return { durum: "hazir", icerik: kazanan.content };
      }
      return { durum: "hata" };
    }

    return { durum: "hazir", icerik };
  } catch {
    return { durum: "hata" };
  }
}

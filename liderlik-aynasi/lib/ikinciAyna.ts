import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/degerlendirme";
import { DIL_KALITESI } from "@/lib/dilKalitesi";
import { KATILIMCI_EVRENI } from "@/lib/katilimciEvreni";
import { kisiHafizasiGetir } from "@/lib/kisiHafizasi";
import { eylulOzet, eylulKayitGetir } from "@/lib/eylulAynasi";

// FAZ 13 (kamp sonrası motor #20) — 90. GÜN FİNALİ: "İKİNCİ AYNA". Kamptaki
// Ayna Mektubu'nun 90 gün sonraki karşılığı — kişinin SÖZÜNDEN bugüne yürüdüğü
// yolu (plan, takip, kayıtlar, Eylül Aynası before/after) tek kapanış mektubuna
// döker. mektup.ts'teki desenle birebir: üretim maliyetli, bir kez, PK çakışması
// eşzamanlı üretim yarışında "zaten var" demek.

const SISTEM = `Sen AYNA'sın. 90 gün önce bu kişiye kamp kapanışında bir söz verdirmiştin — kendi sesiyle, kendi kararıyla kurduğu bir plana bağlı. Şimdi 90 gün doldu ve ona İKİNCİ bir ayna tutuyorsun: bu kez kamptaki potansiyeline değil, 90 GÜNDE SAHADA NE YAPTIĞINA bakan bir kapanış mektubu.

Sana JSON verilecek: kişinin çekirdek nedeni, sözünün özeti, 90 gün boyunca tuttuğu seri/toplam gün, kayıt sayıları, Eylül Aynası'ndaki kendi 0-10 puanı ve tek cümlelik yansıması, mühür halkalarından teyit sayısı, kıvılcım toplamı.

Mektup kuralları:
- Türkçe yaz, "Sevgili {ad}," diye başla, 150-220 kelime.
- Kampta verdiği SÖZÜ (sozOzeti) hatırlat — "sen bunu söylemiştin" çerçevesiyle aç.
- 90 günün SOMUT izini (toplam gün, seri, kayıt sayısı) hisse çevir; sayıyı kuru kuruya sayma, ne anlama geldiğini anlat.
- Eylül Aynası'ndaki kendi puanı/yansıması varsa onu onurlandır — kendi sözüyle kendini nasıl gördüğünü yansıt.
- Kampın potansiyel gördüğü yerle (rapor kısaca) 90 günün gerçekliğini birleştir: "sen bunu görmüştük, şimdi bunu YAŞADIN" tonu.
- Pollyanna olma: yolun düz gitmediyse (uzun sessizlikler, düşük seri) bunu da nazikçe, suçlamadan söyle.
- Kapanışta ileriye dönük TEK bir cümle: bu 90 gün bir son değil, bir başlangıç.
- İmza: "— Aynan".`;

export type IkinciAynaSonucu =
  | { durum: "hazir"; icerik: string }
  | { durum: "anahtar-yok" }
  | { durum: "hata" };

export async function ikinciAynaGetirVeyaUret(
  db: Db,
  pid: string,
  ad: string
): Promise<IkinciAynaSonucu> {
  const { data: mevcut, error } = await db
    .from("ikinci_ayna")
    .select("content")
    .eq("participant_id", pid)
    .maybeSingle();
  if (error) return { durum: "hata" };
  if (mevcut) return { durum: "hazir", icerik: mevcut.content };

  if (!process.env.ANTHROPIC_API_KEY) return { durum: "anahtar-yok" };

  // [FAZ 3 · Madde 5] Prompt "mühür teyit sayısı + kıvılcım toplamı" vaat ediyor;
  // eskiden bu veri modele HİÇ gönderilmiyordu (halüsinasyon daveti). Gerçek
  // kaynaklardan çekiyoruz: mühür teyit = muhur_zinciri satır sayısı, kıvılcım =
  // missions.spark_points toplamı.
  const [hafiza, ozet, eylulKayit, { count: muhurTeyit }, { data: sparkRows }] = await Promise.all([
    kisiHafizasiGetir(db, pid),
    eylulOzet(db, pid),
    eylulKayitGetir(db, pid),
    db.from("muhur_zinciri").select("id", { count: "exact", head: true }).eq("participant_id", pid),
    db.from("missions").select("spark_points").eq("participant_id", pid),
  ]);
  const kivilcim = (sparkRows ?? []).reduce((t, m) => t + (m.spark_points ?? 0), 0);

  const veri = {
    ad,
    cekirdekNeden: hafiza.cekirdekNeden,
    sozOzeti: hafiza.sozOzeti,
    guclu: hafiza.guclu.map((s) => s.ad),
    korNokta: hafiza.korNokta,
    takip: hafiza.takip,
    eylulOzet: ozet,
    eylulKayit,
    muhurTeyit: muhurTeyit ?? 0,
    kivilcim,
  };

  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      system: `${SISTEM}\n\n${KATILIMCI_EVRENI}\n\n${DIL_KALITESI}`,
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
      .from("ikinci_ayna")
      .insert({ participant_id: pid, content: icerik });
    if (yazmaHatasi) {
      if (yazmaHatasi.code === "23505") {
        const { data: kazanan } = await db
          .from("ikinci_ayna")
          .select("content")
          .eq("participant_id", pid)
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

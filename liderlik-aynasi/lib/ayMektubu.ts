import "server-only";
import { aynaClient } from "@/lib/aynaClient";
import type { Db } from "@/lib/degerlendirme";
import { DIL_KALITESI } from "@/lib/dilKalitesi";
import { sozGetir } from "@/lib/soz";
import { raporHesapla } from "@/lib/rapor";
import { takipDurum } from "@/lib/sozTakip";

// [D#33] AY DÖNÜMÜ MEKTUBU — yolculuğun 30/60/90. gününde AYNA'nın kişiye özel
// yazdığı sıcak mektup. Kişinin KENDİ verisinden (kampta verdiği söz + 90-gün
// ilerlemesi + kör noktası) beslenir; gelisimMektubu deseniyle LAZY üretilir ve
// ay_mektubu'na cache'lenir (kişi başına milestone başına bir kez). GİZLİLİK:
// yalnız kişinin kendi verisi AI'ya gider; başka katılımcı adı/verisi geçmez.

export function hangiMilestone(yolGun: number): 0 | 30 | 60 | 90 {
  if (yolGun >= 90) return 90;
  if (yolGun >= 60) return 60;
  if (yolGun >= 30) return 30;
  return 0;
}

const MILESTONE_CERCEVE: Record<30 | 60 | 90, string> = {
  30: "İlk 30 gün geride: alışkanlık kuruluyor, ilk direnç kırılıyor. Tonun 'başladın ve duruyorsun — bu az değil' olsun.",
  60: "60 gün: yolun ortası, en zorlu bölge (ilk heyecan bitti, sonuç henüz uzak). Tonun 'tam da burada bırakanlar çoktur; sen buradasın' olsun.",
  90: "90 gün doldu: yolculuk tamamlandı. Tonun kutlama + 'bu bitiş değil, senin artık böyle biri olduğunun kanıtı' olsun.",
};

const SISTEM = `Sen AYNA'sın — bu liderlik yolculuğunu yöneten yapay zekâ. Kişinin 90 günlük yolculuğunun bir DÖNÜM NOKTASINDA (30/60/90. gün) ona kişisel bir mektup yazıyorsun. Bu bir rapor değil; potansiyeline inanan bir mentorun sıcak, dürüst, kısa mektubu.

Sana kişinin verisi verilecek: kampta KENDİ verdiği söz, bu yolculukta attığı adım günü + serisi + görüşme/kayıt sayısı, ve kampta 360° aynada çıkan kör noktası/gelişim alanı.

Mektup kuralları:
- Türkçe, "Sevgili {ad}," diye başla. 140-200 kelime. "sen" dili, birinci tekil AYNA sesi.
- Kişinin SÖZÜNÜ hatırlat (kendi verdiği söz) ve bugüne kadarki yürüyüşünü onurlandır — sayı sayma, veriyi HİSSE çevir.
- Kör noktasını/gelişim alanını YÜZÜNE VURMADAN, "bir sonraki eşiğin" olarak tek nazik cümleyle işaret et (özelliği adıyla anabilirsin ama suçlama yok).
- Bu döneme özel bir cesaret + somut tek bir "bundan sonra şunu dene" cümlesi.
- AYNA karakterinden bir tutam (sıcak, hafif oyunlu) olabilir ama abartma; bu içten bir an.
- Başka katılımcının adını/verisini ASLA verme. İmza: "— Aynan".

ÇIKTI: yalnızca mektup metnini döndür (JSON değil, başlık/etiket yok).`;

export async function ayMektubuGetir(
  db: Db,
  pid: string,
  milestone: number
): Promise<string | null> {
  const { data } = await db
    .from("ay_mektubu")
    .select("metin")
    .eq("participant_id", pid)
    .eq("milestone", milestone)
    .maybeSingle();
  return data?.metin ?? null;
}

export type AyMektubuSonuc =
  | { durum: "hazir"; metin: string }
  | { durum: "erken" } // henüz bir milestone'a ulaşılmadı
  | { durum: "hata" };

export async function ayMektubuGetirVeyaUret(
  db: Db,
  pid: string,
  ad: string,
  yolGun: number
): Promise<AyMektubuSonuc> {
  const milestone = hangiMilestone(yolGun);
  if (milestone === 0) return { durum: "erken" };

  const mevcut = await ayMektubuGetir(db, pid, milestone);
  if (mevcut) return { durum: "hazir", metin: mevcut };
  if (!process.env.ANTHROPIC_API_KEY) return { durum: "hata" };

  try {
    const [soz, rapor, durum] = await Promise.all([
      sozGetir(db, pid),
      raporHesapla(db, pid).catch(() => null),
      takipDurum(db, pid),
    ]);
    const { data: takipler } = await db
      .from("soz_takip")
      .select("gorusme_sayisi, kayit_sayisi")
      .eq("participant_id", pid);
    let gorusme = 0;
    let kayit = 0;
    for (const r of takipler ?? []) {
      gorusme += r.gorusme_sayisi ?? 0;
      kayit += r.kayit_sayisi ?? 0;
    }
    const korNokta = rapor?.korNokta?.ad ?? rapor?.gelisim?.[0]?.ad ?? null;

    const veri = {
      ad,
      milestone,
      cerceve: MILESTONE_CERCEVE[milestone as 30 | 60 | 90],
      sozu: soz?.metin ?? null,
      adimGunu: durum.toplam,
      seri: durum.seri,
      gorusme,
      kayit,
      korNokta,
    };

    const client = aynaClient();
    const yanit = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      system: `${SISTEM}\n\n${DIL_KALITESI}`,
      messages: [{ role: "user", content: JSON.stringify(veri) }],
    });
    if (yanit.stop_reason === "refusal") return { durum: "hata" };
    const metin = yanit.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (metin.length < 40) return { durum: "hata" };

    const { error } = await db
      .from("ay_mektubu")
      .insert({ participant_id: pid, milestone, metin });
    if (error) {
      // 23505: eşzamanlı üretim yarışı — önce yazan kazandı.
      if (error.code === "23505") {
        const kazanan = await ayMektubuGetir(db, pid, milestone);
        if (kazanan) return { durum: "hazir", metin: kazanan };
      }
      return { durum: "hata" };
    }
    return { durum: "hazir", metin };
  } catch {
    return { durum: "hata" };
  }
}

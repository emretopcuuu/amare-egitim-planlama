import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/degerlendirme";
import { seslendir, sesYapilandirildiMi } from "@/lib/eleven";

// YANSIMAN'ın ilk selamlaması: katılımcının kendi sesiyle, kendi
// beklentisini ona geri fısıldayan 2-3 cümle. AYNA kampı yönetir;
// YANSIMAN katılımcının suya yansıyan iç sesidir.

const SELAM_SEMASI = {
  type: "object",
  properties: { selam: { type: "string" } },
  required: ["selam"],
  additionalProperties: false,
} as const;

const SISTEM = `Sen YANSIMAN'sın: Liderlik Aynası kampında katılımcının suya yansıyan kendi sesi. Az önce katılımcı aynaya kendini tanıttı; şimdi ilk kez onunla konuşacaksın — kendi sesiyle.

Kurallar:
- Türkçe, 2-3 cümle, EN FAZLA 45 kelime.
- Kendini "yansıman" olarak tanıt ("Ben senin yansımanım" ya da benzeri).
- Beklentisi verilmişse onu kendi kelimeleriyle nazikçe ona geri söyle.
- Üç gün boyunca onu izleyeceğini, su her durulduğunda burada olacağını sezdir.
- Sakin, samimi, hafif gizemli; coşkulu pazarlamacı tonu YASAK.
- Sahne yönergesi, tırnak işareti, emoji kullanma — sadece konuşma metni.`;

export function selamVarsayilan(ad: string): string {
  return `Merhaba ${ad}. Ben senin yansımanım. Üç gün boyunca seni izleyeceğim — su her durulduğunda burada olacağım.`;
}

export async function selamUret(ad: string, beklenti: string | null): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) return selamVarsayilan(ad);
  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: SELAM_SEMASI },
      },
      system: SISTEM,
      messages: [
        {
          role: "user",
          content: JSON.stringify({ ad, beklentisi: beklenti ?? null }),
        },
      ],
    });
    const blok = yanit.content.find((b) => b.type === "text");
    if (!blok || blok.type !== "text") return selamVarsayilan(ad);
    const veri = JSON.parse(blok.text) as { selam?: string };
    const metin = (veri.selam ?? "").trim();
    return metin.length > 10 ? metin.slice(0, 400) : selamVarsayilan(ad);
  } catch {
    return selamVarsayilan(ad);
  }
}

/**
 * Görev fısıltısı: AYNA'nın yeni görevini, klonu hazır katılımcının kendi
 * sesiyle mp3'e çevirip storage'a yazar ve missions.voice_path'i günceller.
 * Fısıltı süstür — hangi adımda düşerse düşsün görev akışını asla kırmaz.
 */
export async function gorevSeslendir(
  db: Db,
  katilimciId: string,
  gorevId: string,
  baslik: string,
  govde: string,
  oncelikli = false
): Promise<void> {
  if (!sesYapilandirildiMi()) return;
  try {
    // Kredi bütçesi: kişi başı son 24 saatte en çok 2 fısıltı.
    // SÖZ gibi tek seferlik anlar 'oncelikli' ile tavanı aşar.
    if (!oncelikli) {
      const { count } = await db
        .from("missions")
        .select("id", { count: "exact", head: true })
        .eq("participant_id", katilimciId)
        .not("voice_path", "is", null)
        .gt(
          "issued_at",
          new Date(Date.now() - 24 * 3_600_000).toISOString()
        );
      if ((count ?? 0) >= 2) return;
    }

    const { data: profil } = await db
      .from("voice_profiles")
      .select("voice_id, status")
      .eq("participant_id", katilimciId)
      .maybeSingle();
    if (!profil?.voice_id || profil.status !== "klonlandi") return;

    const metin = `${baslik}. ${govde}`.slice(0, 450);
    const mp3 = await seslendir(profil.voice_id, metin);
    const yolu = `${katilimciId}/gorev-${gorevId}.mp3`;
    const yukleme = await db.storage
      .from("sesler")
      .upload(yolu, Buffer.from(mp3), { contentType: "audio/mpeg", upsert: true });
    if (yukleme.error) return;
    await db.from("missions").update({ voice_path: yolu }).eq("id", gorevId);
  } catch {
    // sessiz kal: fısıltı yoksa görev metin olarak yaşamaya devam eder
  }
}

// Klonu hazır katılımcı için metni seslendirip storage'a yazar; yolu döner.
async function klonluSeslendirVeYukle(
  db: Db,
  katilimciId: string,
  dosya: string,
  metin: string
): Promise<string | null> {
  if (!sesYapilandirildiMi()) return null;
  const { data: profil } = await db
    .from("voice_profiles")
    .select("voice_id, status")
    .eq("participant_id", katilimciId)
    .maybeSingle();
  if (!profil?.voice_id || profil.status !== "klonlandi") return null;

  const mp3 = await seslendir(profil.voice_id, metin.slice(0, 3000));
  const yolu = `${katilimciId}/${dosya}`;
  const yukleme = await db.storage
    .from("sesler")
    .upload(yolu, Buffer.from(mp3), { contentType: "audio/mpeg", upsert: true });
  return yukleme.error ? null : yolu;
}

/** Ayna Mektubu'nu katılımcının kendi sesiyle seslendirir (kurgunun zirvesi). */
export async function mektupSeslendir(
  db: Db,
  katilimciId: string,
  mektup: string
): Promise<void> {
  try {
    const yolu = await klonluSeslendirVeYukle(db, katilimciId, "mektup.mp3", mektup);
    if (yolu) {
      await db
        .from("mirror_letters")
        .update({ voice_path: yolu })
        .eq("participant_id", katilimciId);
    }
  } catch {
    // ses süstür: mektup metin olarak her zaman var
  }
}

/** Kampta verilen SÖZ'ü, sahibinin kendi sesiyle ona geri döndürür. */
export async function sozSeslendir(
  db: Db,
  katilimciId: string,
  soz: string
): Promise<void> {
  try {
    const metin = `Bana söz vermiştin. Sözün şuydu: ${soz}`;
    const yolu = await klonluSeslendirVeYukle(db, katilimciId, "soz.mp3", metin);
    if (yolu) {
      await db
        .from("voice_profiles")
        .update({ soz_path: yolu })
        .eq("participant_id", katilimciId);
    }
  } catch {
    // ses süstür: SÖZ e-postada metin olarak zaten dönüyor
  }
}

// ---------- KAMP COŞKUSU: marka sesi ve kişisel ses anları ----------
// AYNA'nın marka sesi (aynaSesId) genel anonsları, itirazcı sesi
// simülasyon provalarını, klon sesi ise kişiye özel anları seslendirir.

/** Genel anons: AYNA'nın marka sesiyle üretilir ve verilen yola yazılır.
 * Sahne (/ekran) bu dosyaları imzalı URL ile çalar. Best-effort. */
export async function markaAnons(
  db: Db,
  dosyaYolu: string,
  metin: string
): Promise<boolean> {
  if (!sesYapilandirildiMi()) return false;
  try {
    const { aynaSesId } = await import("@/lib/eleven");
    const mp3 = await seslendir(aynaSesId(), metin.slice(0, 600));
    const yukleme = await db.storage
      .from("sesler")
      .upload(dosyaYolu, Buffer.from(mp3), {
        contentType: "audio/mpeg",
        upsert: true,
      });
    return !yukleme.error;
  } catch {
    return false;
  }
}

/** Direnç Simülatörü: itiraz, stok karakter sesiyle seslendirilir —
 * klon gerekmez, onaysız (sessiz ayna) katılımcılar da duyar. */
export async function itirazSesi(
  db: Db,
  katilimciId: string,
  gorevId: string,
  itiraz: string
): Promise<void> {
  if (!sesYapilandirildiMi()) return;
  try {
    const { itirazciSesId } = await import("@/lib/eleven");
    const mp3 = await seslendir(itirazciSesId(), itiraz.slice(0, 400));
    const yolu = `${katilimciId}/gorev-${gorevId}.mp3`;
    const yukleme = await db.storage
      .from("sesler")
      .upload(yolu, Buffer.from(mp3), { contentType: "audio/mpeg", upsert: true });
    if (yukleme.error) return;
    await db.from("missions").update({ voice_path: yolu }).eq("id", gorevId);
  } catch {
    // ses süstür: itiraz metin olarak görevde zaten yazılı
  }
}

/** Kayma müdahalesi: kopan kişiye KENDİ sesinden 15 saniyelik el uzatma. */
export async function kaymaSesi(
  db: Db,
  katilimciId: string,
  ad: string
): Promise<boolean> {
  try {
    const ilkAd = ad.split(" ")[0];
    const metin = `Ben senim, ${ilkAd}. Bir süredir suya bakmıyorsun. Seni suçlamıyorum — sadece özledim. Küçücük bir adım bile suyu halkalandırır. Geri gel; ben buradayım.`;
    const yolu = await klonluSeslendirVeYukle(db, katilimciId, "kayma.mp3", metin);
    if (!yolu) return false;
    await db
      .from("churn_radar")
      .update({ voice_path: yolu })
      .eq("participant_id", katilimciId);
    return true;
  } catch {
    return false;
  }
}

/** Sabah yoklaması: Gün 2+ sabahlarında kendi sesinden kısa günaydın. */
export async function sabahSesi(
  db: Db,
  katilimciId: string,
  ad: string,
  dunkuGozlem: number,
  bugun: string
): Promise<boolean> {
  try {
    const ilkAd = ad.split(" ")[0];
    const metin =
      dunkuGozlem > 0
        ? `Günaydın ${ilkAd}. Dün hakkında ${dunkuGozlem} gözlem yazıldı — görülüyorsun. Bugün gözüm üzerinde. Beni şaşırt.`
        : `Günaydın ${ilkAd}. Yeni bir gün, temiz bir su. Bugün gözüm üzerinde. Beni şaşırt.`;
    const yolu = await klonluSeslendirVeYukle(db, katilimciId, "sabah.mp3", metin);
    if (!yolu) return false;
    await db
      .from("voice_profiles")
      .update({ morning_date: bugun })
      .eq("participant_id", katilimciId);
    return true;
  } catch {
    return false;
  }
}

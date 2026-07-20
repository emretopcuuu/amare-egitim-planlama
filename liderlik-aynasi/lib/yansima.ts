import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { aynaClient } from "@/lib/aynaClient";
import type { Db } from "@/lib/degerlendirme";
import { DIL_KALITESI } from "@/lib/dilKalitesi";
import { kimlikBlogu } from "@/lib/kisiKimligi";
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

export async function selamUret(
  ad: string,
  beklenti: string | null,
  cinsiyet?: string | null,
  yas?: number | null
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) return selamVarsayilan(ad);
  try {
    const client = aynaClient();
    const yanit = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: SELAM_SEMASI },
      },
      system: `${SISTEM}\n\n${DIL_KALITESI}${kimlikBlogu(cinsiyet, yas)}`,
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

// GELİŞTİRME #6: Sesli Yansıman'ı Ön Farkındalık + Pusula'dan kişiselleştir.
// Templated (ek AI çağrısı yok) — kişinin en zayıf alanı + çekirdek nedeni.
const OZ_ALAN_AD: Record<string, string> = {
  oz_saygi: "Öz Saygı",
  oz_guven: "Öz Güven",
  oz_yeterlilik: "Öz Yeterlilik",
};
async function kisiselDokunus(
  db: Db,
  pid: string
): Promise<{ alan: string | null; neden: string | null }> {
  try {
    const [ofR, pusulaR] = await Promise.all([
      db.from("on_farkindalik").select("profil").eq("participant_id", pid).maybeSingle(),
      db.from("pusula").select("cekirdek_neden, tamamlandi_at").eq("participant_id", pid).maybeSingle(),
    ]);
    const p = ofR.data?.profil as { katman1?: { enZayif?: string | null } } | null;
    const alan = p?.katman1?.enZayif ? OZ_ALAN_AD[p.katman1.enZayif] ?? null : null;
    let neden: string | null = null;
    if (pusulaR.data?.tamamlandi_at) {
      const arr = (pusulaR.data.cekirdek_neden as string[]) ?? [];
      neden = (arr[0] ?? "").trim().slice(0, 120) || null;
    }
    return { alan, neden };
  } catch {
    return { alan: null, neden: null };
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
    const { alan } = await kisiselDokunus(db, katilimciId);
    const acilis =
      dunkuGozlem > 0
        ? `Günaydın ${ilkAd}. Dün hakkında ${dunkuGozlem} gözlem yazıldı — görülüyorsun.`
        : `Günaydın ${ilkAd}. Yeni bir gün, temiz bir su.`;
    const kapanis = alan
      ? `Bugün ${alan} kasını çalıştır; küçük bir kanıt yeter. Yanındayım.`
      : "Bugün yanındayım. Beni şaşırt.";
    const metin = `${acilis} ${kapanis}`;
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

// ---------- KONUŞAN YANSIMA: kalıp video + senaryo anında taze ses ----------
// Kişinin yansıma videosu (yansima.mp4) sessiz kalıptır; senaryonun sesi
// üstüne biner. Aşağıdaki üreticiler yalnız mp3 üretir — ucuz ve anlıktır.

/** FIERO kişisel kutlama: 10/10 anında yansıman SANA konuşur (sahnedeki
 * marka anonsundan ayrı). Dosya kişi başı tektir; her zafer üstüne yazar. */
export async function fieroSesi(
  db: Db,
  katilimciId: string,
  ad: string
): Promise<boolean> {
  try {
    const ilkAd = ad.split(" ")[0];
    const { neden } = await kisiselDokunus(db, katilimciId);
    const orta = neden
      ? `Bunu ben yapmadım — sen yaptın. ${neden} için buradasın; işte tam da bu yüzden.`
      : "Bunu ben yapmadım — sen yaptın; ben sadece suya yansıttım.";
    const metin = `İşte bu, ${ilkAd}! On üzerinden on. ${orta} Bu hissi unutma. Sakın durma.`;
    const yolu = await klonluSeslendirVeYukle(db, katilimciId, "fiero.mp3", metin);
    return yolu !== null;
  } catch {
    return false;
  }
}

/** Gece fısıltısının kişisel hâli: kendi sesinden, günde bir kez.
 * Üretim akşam erken saatte yapılır (push değildir, sahneyi bozmaz);
 * night_date hem tekrar kilidi hem ana sayfa kartının tazelik işaretidir. */
export async function geceSesi(
  db: Db,
  katilimciId: string,
  metin: string,
  bugun: string
): Promise<boolean> {
  try {
    // #6 Kişisel dokunuş: gece fısıltısını kişinin nedeni/zayıf alanıyla mühürle.
    const { alan, neden } = await kisiselDokunus(db, katilimciId);
    const ek = neden
      ? ` Neden buradasın, hatırla: ${neden}`
      : alan
        ? ` ${alan} alanın yarın seni bekliyor.`
        : "";
    const tamMetin = `${metin}${ek}`.slice(0, 600);
    const yolu = await klonluSeslendirVeYukle(db, katilimciId, "gece.mp3", tamMetin);
    if (!yolu) return false;
    await db
      .from("voice_profiles")
      .update({ night_date: bugun })
      .eq("participant_id", katilimciId);
    return true;
  } catch {
    return false;
  }
}

import "server-only";
import { aynaClient } from "@/lib/aynaClient";
import type { Db } from "@/lib/degerlendirme";
import { seslendir, sesYapilandirildiMi, aynaSesId } from "@/lib/eleven";
import { AYNA_KARAKTER_TAM, aynaKarakterAcikMi, bahisSkoru } from "@/lib/aynaKarakter";
import { herkeseBildir, adminlereBildir } from "@/lib/push";
import { gunProgrami } from "@/lib/kampProgrami";
import { aiHataYakala } from "@/lib/uyari";

// ============================================================================
// AYNA karakteri Faz 4 — KAMP RADYOSU
// ============================================================================
// Günde iki yayın: SABAH 07:30 (günaydın + program + iddialı tahmin) ve
// AKŞAM 21:30 (dedikodu bülteni + günün bahis skoru + sabah tahminiyle
// dramatik yüzleşme). Akış: üretim tiki yayından ~20 dk önce script'i yazar
// (AI; düşerse ŞABLON metin) + seslendirir (ElevenLabs; düşerse salt metin),
// yayın tikinde durum 'yayinda' olur + herkese push gider.
//
// AKSAKLIK ZIRHLARI:
// - unique(tarih, slot): tekrarlı/yarışan tikler idempotent.
// - Her aşama try/catch — radyo asla tik'i düşürmez; AI yoksa şablon,
//   TTS yoksa metin. Radyo asla susmaz, en kötü salt-metin yayınlar.
// - Kill switch (ayna_karakter_acik=false) radyoyu tamamen kapatır.
// - Dedikoduda İSİM ASLA geçmez: script'e yalnız toplam SAYILAR gider
//   (kişisel veri prompt'a bile girmez — sızma riski sıfır).

const MODEL = "claude-sonnet-5";
const BUCKET = "sesler";

// Yayın planı (gün içi dakika). Üretim, yayından 20 dk önce başlar.
const SLOTLAR = [
  { slot: "sabah" as const, uretimDk: 7 * 60 + 10, yayinDk: 7 * 60 + 30 },
  { slot: "aksam" as const, uretimDk: 21 * 60 + 10, yayinDk: 21 * 60 + 30 },
];

type Slot = (typeof SLOTLAR)[number]["slot"];

// Yayın malzemesi — yalnız toplam sayılar (kişisel veri YOK).
type RadyoVeri = {
  gun: number;
  program: string[]; // bugünün programından 2 başlık
  dunTamamlanan: number;
  bugunTamamlanan: number;
  bugunTakdir: number;
  enYuksekPuan: number | null; // günün en yüksek görev puanı (isimsiz)
  bahis: { ayna: number; itirazci: number };
  sabahTahmin: string | null; // akşam yüzleşmesi için
  tahminHedef: number; // sabah tahmininin sayısal hedefi
};

async function veriTopla(db: Db, gun: number, bugun: string, slot: Slot): Promise<RadyoVeri> {
  const gunBasi = new Date(`${bugun}T00:00:00+03:00`).toISOString();
  const dunBasi = new Date(new Date(gunBasi).getTime() - 24 * 3_600_000).toISOString();
  const [dunT, bugunT, takdir, enYuksek, bahis, sabahRow] = await Promise.all([
    db
      .from("missions")
      .select("id", { count: "exact", head: true })
      .eq("status", "scored")
      .gte("scored_at", dunBasi)
      .lt("scored_at", gunBasi),
    db
      .from("missions")
      .select("id", { count: "exact", head: true })
      .eq("status", "scored")
      .gte("scored_at", gunBasi),
    db
      .from("kudos")
      .select("id", { count: "exact", head: true })
      .eq("is_hidden", false)
      .gte("created_at", gunBasi),
    db
      .from("missions")
      .select("ai_score")
      .eq("status", "scored")
      .gte("scored_at", gunBasi)
      .not("ai_score", "is", null)
      .order("ai_score", { ascending: false })
      .limit(1)
      .maybeSingle(),
    bahisSkoru(db, gunBasi),
    slot === "aksam"
      ? db.from("radyo_yayin").select("tahmin").eq("tarih", bugun).eq("slot", "sabah").maybeSingle()
      : Promise.resolve({ data: null } as { data: { tahmin: string | null } | null }),
  ]);
  const dunTamamlanan = dunT.count ?? 0;
  return {
    gun,
    // gunProgrami yalnız 1|2|3 kabul eder — aralık dışı günde boş program.
    program: (gun === 1 || gun === 2 || gun === 3 ? gunProgrami(gun) : [])
      .slice(0, 6)
      .map((m) => m.baslik.split("&")[0].trim())
      .filter((b, i, a) => a.indexOf(b) === i)
      .slice(0, 2),
    dunTamamlanan,
    bugunTamamlanan: bugunT.count ?? 0,
    bugunTakdir: takdir.count ?? 0,
    enYuksekPuan: enYuksek.data?.ai_score ?? null,
    bahis,
    sabahTahmin: sabahRow.data?.tahmin ?? null,
    // Sabah tahmini: dünkü tamamlanandan cüretkâr hedef (Gün 1'de taban 40).
    tahminHedef: Math.max(40, Math.ceil(dunTamamlanan * 1.15)),
  };
}

// AI script — AYNA sunucu. Düşerse null (şablon devreye girer).
async function scriptUret(veri: RadyoVeri, slot: Slot): Promise<string | null> {
  try {
    const client = aynaClient();
    const gorevTanim =
      slot === "sabah"
        ? `SABAH YAYINI (07:30). İçerik sırası: (1) "Burası Kamp Radyosu, ben AYNA" tarzı açılış + güne enerjik günaydın, (2) bugünün programından şu iki başlığa heyecanlı tek cümle: ${veri.program.join(" ve ") || "sürpriz program"}, (3) İDDİALI TAHMİNİN: bugün kampta EN AZ ${veri.tahminHedef} görev tamamlanacağını iddia et ve "akşam yüzleşeceğiz, yazıyorum buraya" de, (4) tek cümlelik kapanış. Running gag'lerinden birine KISA dokunabilirsin (bowling programdaysa korkun tutabilir).`
        : `AKŞAM BÜLTENİ (21:30). İçerik sırası: (1) kısa açılış, (2) DEDİKODU KÖŞESİ: eldeki sayılardan 1-2 isimsiz dedikodu cümlesi kur (bugün ${veri.bugunTamamlanan} görev tamamlandı, ${veri.bugunTakdir} takdir verildi${veri.enYuksekPuan ? `, günün en yüksek puanı ${veri.enYuksekPuan}` : ""}) — "biri, adını vermeyeceğim, KVKK" tarzında, (3) BAHİS SKORU: bugün İtirazcı'yla aranızda skor AYNA ${veri.bahis.ayna} - İtirazcı ${veri.bahis.itirazci}; öndeysen böbürlen, gerideysen zarif ama dramatik biçimde hazmet, (4) SABAH TAHMİNİYLE YÜZLEŞME: ${
            veri.sabahTahmin
              ? `sabah şunu iddia etmiştin: "${veri.sabahTahmin}". Gerçekleşen: ${veri.bugunTamamlanan}. Tuttuysa böbürlen; TUTMADIYSA dramatik biçimde itiraf et ("bir aynanın yanılması...").`
              : "sabah tahmini yoksa bu maddeyi atla."
          } (5) yarına tek cümlelik merak tohumu ve iyi geceler.`;
    const yanit = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      system: `${AYNA_KARAKTER_TAM}

Sen KAMP RADYOSU'nun sunucususun. Aşağıdaki yayını yazacaksın.
BİÇİM KURALLARI (pazarlıksız):
- SESLİ okunacak: 80-120 kelime, konuşma dili, kısa cümleler. Emoji, madde işareti, başlık, parantez notu, kısaltma YOK — yalnız akan konuşma metni.
- HİÇBİR KATILIMCI ADI, grup numarası ya da kimliği daraltan detay SÖYLEME. Elindeki veri zaten yalnız toplam sayılar.
- Sayıları olduğu gibi kullan, uydurma.
- ${gorevTanim}`,
      messages: [{ role: "user", content: "Yayın metnini yaz." }],
    });
    const metin = yanit.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return metin.length > 40 ? metin : null;
  } catch {
    return null;
  }
}

// ŞABLON fallback — AI olmadan, gerçek sayılarla. Radyo asla susmaz.
function sablonMetin(veri: RadyoVeri, slot: Slot): string {
  if (slot === "sabah") {
    return `Burası Kamp Radyosu, ben AYNA. Günaydın Sapanca! Bugün Gün ${veri.gun}${
      veri.program.length ? ` ve programda ${veri.program.join(" ile ")} var` : ""
    }. Şimdi iddiamı yazıyorum buraya: bugün en az ${veri.tahminHedef} görev tamamlanacak. Akşam bu tahminle yüzleşeceğiz. Ben aynayım, yalan söyleyemem — ama abartabilirim. Haydi güne.`;
  }
  const bahisSatir =
    veri.bahis.ayna >= veri.bahis.itirazci
      ? `İtirazcı'yla günün skoru: ben ${veri.bahis.ayna}, o ${veri.bahis.itirazci}. Kendisi şu an konuşamıyor, bozuk.`
      : `İtirazcı'yla günün skoru: o ${veri.bahis.itirazci}, ben ${veri.bahis.ayna}. Not aldım. Yarın konuşuruz.`;
  return `Burası Kamp Radyosu, ben AYNA. Akşam bülteni. Bugün ${veri.bugunTamamlanan} görev tamamlandı, ${veri.bugunTakdir} takdir verildi. İsim mi? Veremem, KVKK. ${bahisSatir} Yarın için bir şey hazırlıyorum. Ne olduğunu söylemem. İyi geceler.`;
}

// Sabah tahmin cümlesi — akşam yüzleşmesinde okunacak biçimde saklanır.
function tahminCumlesi(veri: RadyoVeri): string {
  return `Bugün en az ${veri.tahminHedef} görev tamamlanacak`;
}

// TTS — düşerse null (salt metin yayını).
async function sesUret(db: Db, metin: string, bugun: string, slot: Slot): Promise<string | null> {
  try {
    if (!sesYapilandirildiMi()) return null;
    const buf = await seslendir(aynaSesId(), metin);
    const yol = `radyo/${bugun}-${slot}.mp3`;
    const { error } = await db.storage
      .from(BUCKET)
      .upload(yol, buf, { contentType: "audio/mpeg", upsert: true });
    return error ? null : yol;
  } catch {
    return null;
  }
}

// tik'ten çağrılır (yalnız mod=kamp). Kendi hatasını yutar — tik'i asla düşürmez.
export async function radyoTik(
  db: Db,
  gun: number,
  gunDk: number,
  bugun: string
): Promise<void> {
  try {
    if (!(await aynaKarakterAcikMi(db))) return; // kill switch radyoyu da kapatır
    for (const plan of SLOTLAR) {
      if (gunDk < plan.uretimDk) continue;
      const { data: mevcut } = await db
        .from("radyo_yayin")
        .select("id, durum")
        .eq("tarih", bugun)
        .eq("slot", plan.slot)
        .maybeSingle();

      // 1) ÜRETİM — henüz satır yoksa script + ses hazırla ('hazir').
      if (!mevcut) {
        const veri = await veriTopla(db, gun, bugun, plan.slot);
        const metin = (await scriptUret(veri, plan.slot)) ?? sablonMetin(veri, plan.slot);
        // Yarış koruması: unique(tarih,slot) — ikinci tik 23505 alır, sorun değil.
        const { data: eklenen, error } = await db
          .from("radyo_yayin")
          .insert({
            tarih: bugun,
            slot: plan.slot,
            gun,
            metin,
            tahmin: plan.slot === "sabah" ? tahminCumlesi(veri) : null,
          })
          .select("id")
          .single();
        if (error || !eklenen) continue;
        const sesYol = await sesUret(db, metin, bugun, plan.slot);
        if (sesYol) {
          await db.from("radyo_yayin").update({ ses_path: sesYol }).eq("id", eklenen.id);
        } else if (sesYapilandirildiMi()) {
          // TTS yapılandırılmış ama üretim DÜŞTÜ (kota/ElevenLabs hatası): radyo
          // salt-metin çıkacak, maskot konuşmayacak. Eskiden tamamen SESSİZDİ —
          // artık adminlere tek push: sorun görünür olsun, kimse fark etmeden
          // "radyo neden sessiz" diye sahne arkasında koşuşturmasın. Slot başına 1 kez.
          await adminlereBildir(
            db,
            "🔇 Radyo sesi üretilemedi",
            `${plan.slot === "sabah" ? "Sabah" : "Akşam"} yayını salt-metin çıktı (ses üretimi düştü — ElevenLabs kota/anahtar?). Metin yayında, maskot konuşmuyor.`,
            "/admin"
          ).catch(() => {});
        }
        // Geç başlangıç (üretim penceresi kaçtıysa) aynı tikte yayına da düşsün.
        if (gunDk >= plan.yayinDk) await yayinla(db, eklenen.id, plan.slot);
        continue;
      }

      // 2) YAYIN — hazır satır yayın saatini geçtiyse yayına al + push.
      if (mevcut.durum === "hazir" && gunDk >= plan.yayinDk) {
        await yayinla(db, mevcut.id, plan.slot);
      }
    }
  } catch (e) {
    await aiHataYakala(db, "kamp_radyosu", e).catch(() => {});
  }
}

async function yayinla(db: Db, id: string, slot: Slot): Promise<void> {
  const { error } = await db
    .from("radyo_yayin")
    .update({ durum: "yayinda", yayinlanan_at: new Date().toISOString() })
    .eq("id", id)
    .eq("durum", "hazir"); // yarışta ikinci güncelleme boşa düşer
  if (error) return;
  await herkeseBildir(
    db,
    "📻 Kamp Radyosu yayında",
    slot === "sabah"
      ? "AYNA mikrofonda: günün programı ve iddialı bir tahmin var."
      : "Akşam bülteni: dedikodu köşesi ve İtirazcı skoru açıklandı.",
    "/gorevler"
  ).catch(() => {});
}

// /ekran sahne sinyali: yayına YENİ geçmiş bir yayın varsa (≤4 dk taze —
// fiero/anons ile aynı konvansiyon), gerçek sesle birlikte döner. EkranGosterisi
// bunu bir kez otomatik çalar (host "Sesi Aç" dediyse) ve ses sürerken maskotu
// "konusma" pozuna geçirir — gerçek dudak senkronu değil ama gerçek SES + genel
// konuşma hareketi birlikte sahne mesafesinde ikna edici (bkz. Faz 1.5b).
export async function ekranSinyali(
  db: Db,
  simdi: Date
): Promise<{ id: string; sesUrl: string | null } | null> {
  try {
    const { data } = await db
      .from("radyo_yayin")
      .select("id, ses_path, yayinlanan_at")
      .eq("durum", "yayinda")
      .not("yayinlanan_at", "is", null)
      .order("yayinlanan_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data?.yayinlanan_at) return null;
    const taze = simdi.getTime() - new Date(data.yayinlanan_at).getTime() <= 4 * 60_000;
    if (!taze) return null;
    let sesUrl: string | null = null;
    if (data.ses_path) {
      const { data: imza } = await db.storage.from(BUCKET).createSignedUrl(data.ses_path, 600);
      sesUrl = imza?.signedUrl ?? null;
    }
    return { id: data.id, sesUrl };
  } catch {
    return null;
  }
}

// UX paketi #10 — yayın arşivi: son N yayın (en yenisi dahil), /gorevler kartı
// ana yayın + "önceki yayınlar" listesini bundan kurar. Sabahı kaçıran akşam
// dinleyebilsin; dünün tahmin/dedikodusu kaybolmasın.
export type ArsivYayin = {
  id: string;
  tarih: string;
  slot: string;
  metin: string;
  sesUrl: string | null;
};

export async function yayinArsiviGetir(db: Db, adet = 3): Promise<ArsivYayin[]> {
  try {
    const { data } = await db
      .from("radyo_yayin")
      .select("id, tarih, slot, metin, ses_path")
      .eq("durum", "yayinda")
      .order("yayinlanan_at", { ascending: false })
      .limit(adet);
    if (!data?.length) return [];
    return await Promise.all(
      data.map(async (y) => {
        let sesUrl: string | null = null;
        if (y.ses_path) {
          const { data: imza } = await db.storage.from(BUCKET).createSignedUrl(y.ses_path, 3600);
          sesUrl = imza?.signedUrl ?? null;
        }
        return { id: y.id, tarih: y.tarih, slot: y.slot, metin: y.metin, sesUrl };
      })
    );
  } catch {
    return [];
  }
}

// /gorevler kartı için: bugünün son yayını (varsa) + imzalı ses URL'i.
export async function sonYayinGetir(
  db: Db,
  bugun: string
): Promise<{ slot: string; metin: string; sesUrl: string | null } | null> {
  try {
    const { data } = await db
      .from("radyo_yayin")
      .select("slot, metin, ses_path")
      .eq("tarih", bugun)
      .eq("durum", "yayinda")
      .order("yayinlanan_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    let sesUrl: string | null = null;
    if (data.ses_path) {
      const { data: imza } = await db.storage.from(BUCKET).createSignedUrl(data.ses_path, 3600);
      sesUrl = imza?.signedUrl ?? null;
    }
    return { slot: data.slot, metin: data.metin, sesUrl };
  } catch {
    return null;
  }
}

// ============================================================================
// G7 — RADYO KITLIĞI (canlı yayın penceresi). Mevcut radyoya DOKUNMADAN, bayrak
// açıkken bir "5 dakika açık, sonra kaybolur" kıtlık katmanı ekler. Bayrak
// kapalıyken (varsayılan) mevcut kalıcı radyo kartı/arşivi birebir korunur.
// ============================================================================
const RADYO_KITLIK_PENCERE_MS = 5 * 60_000;

export async function radyoKitlikAcikMi(db: Db): Promise<boolean> {
  const { data } = await db.from("settings").select("value").eq("key", "radyo_kitlik_acik").maybeSingle();
  return data?.value === "true";
}

// O an CANLI (yayına ≤5 dk önce geçmiş) yayın — yoksa null. kalanSn geri sayım.
export async function kitlikYayini(
  db: Db,
  simdi: Date
): Promise<{ id: string; metin: string; sesUrl: string | null; kalanSn: number } | null> {
  try {
    const { data } = await db
      .from("radyo_yayin")
      .select("id, metin, ses_path, yayinlanan_at")
      .eq("durum", "yayinda")
      .not("yayinlanan_at", "is", null)
      .order("yayinlanan_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data?.yayinlanan_at) return null;
    const gecen = simdi.getTime() - new Date(data.yayinlanan_at).getTime();
    if (gecen < 0 || gecen > RADYO_KITLIK_PENCERE_MS) return null; // pencere kapandı → kaybolur
    let sesUrl: string | null = null;
    if (data.ses_path) {
      const { data: imza } = await db.storage.from(BUCKET).createSignedUrl(data.ses_path, 600);
      sesUrl = imza?.signedUrl ?? null;
    }
    return { id: data.id, metin: data.metin, sesUrl, kalanSn: Math.max(0, Math.ceil((RADYO_KITLIK_PENCERE_MS - gecen) / 1000)) };
  } catch {
    return null;
  }
}

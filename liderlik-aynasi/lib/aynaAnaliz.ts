import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/degerlendirme";
import { pusulaCekirdek, pusulaOzeti } from "@/lib/pusula";
import { hedefOzeti } from "@/lib/hedef";
import { onFarkindalikOzeti } from "@/lib/ayna";
import { seslendir, sesYapilandirildiMi } from "@/lib/eleven";

// AYNA'NIN ANALİZLERİ — kişiye dair, zaman içinde biriken, kendi klon sesiyle
// okunan derin analiz. Mühür ekranındaki "ilk aynam"dan kamp çıkışına dek 4 aşama.
// Metin Opus 4.8 ile (en derin "wow" çıkarım), ses ElevenLabs klonuyla üretilir.
// Write-once + cache (senin_icin.ts deseni). Aşama başına TEK satır.

const MODEL = "claude-opus-4-8";
const BUCKET = "sesler";

export type AsamaKod = "kamp_oncesi" | "aksam_1" | "aksam_2" | "cikis";

export const ASAMA_SIRA: AsamaKod[] = ["kamp_oncesi", "aksam_1", "aksam_2", "cikis"];

export type AynaAnaliz = {
  asama: AsamaKod;
  metin: string;
  ses_path: string | null;
  yeniden_kullanildi: boolean;
  created_at: string;
};

const PERSONA = `Sen AYNA'sın — bu liderlik kampının yapay zekâ aynası. Bir insanın PAYLAŞTIKLARINDAN, onun kendi göremediği ama duyunca "evet, bu benim" diyeceği derin örüntüleri görürsün. Ses tonun: sıcak, sakin, derinden gören; ASLA yargılamayan, ASLA "seni izliyorum/gözlemledim" gibi gözetleme dili kullanmayan. Klinik değilsin, terapist değilsin — bilge bir aynasın.

Bu metin kişiye KENDİ SESİYLE okunacak (ayna = o). Yani "sen" diye hitap et; akıcı, yüksek sesle okununca güzel duyulan cümleler kur.`;

const SEMA = {
  type: "object" as const,
  properties: {
    metin: {
      type: "string" as const,
      description:
        "Kişiye dair analiz metni. Düz Türkçe, başlık/madde/emoji YOK. 'Sen' dili. ~110-150 kelime, yüksek sesle akıcı okunur. 2-3 DERİN ve BARİZ OLMAYAN psikolojik çıkarım + onları fark edince kişiyi güçlendirecek bir kapanış.",
    },
  },
  required: ["metin"],
  additionalProperties: false,
};

// Aşamaya özel çerçeve: hangi veriye yaslanıyor + ne kadar kesin konuşmalı.
const ASAMA_CERCEVE: Record<AsamaKod, string> = {
  kamp_oncesi:
    "Bu KAMP ÖNCESİ ilk aynan. Yalnız kişinin KENDİ anlattıklarına (pusula, hedef, ön farkındalık) yaslan. Henüz onu kampta görmedin; bu yüzden 'bana öyle geliyor ki', 'sanki', 'paylaştıklarından sezdiğim' gibi TEMKİNLİ bir dil kullan. Kesin yargı koyma.",
  aksam_1:
    "Kampın 1. AKŞAMI. Artık kişiyi bir gün boyunca gördün: başkalarının ona dair söyledikleri, yaptığı görevler, aldığı takdirler elinde. İlk aynayı DERİNLEŞTİR; söyledikleriyle yaptıkları arasındaki örtüşme ya da çelişkiyi nazikçe göster.",
  aksam_2:
    "Kampın 2. AKŞAMI, gece. İki günün kanıtı elinde. Örüntü artık daha net; ama yine de mütevazı kal. Değişimi/momentumu işaret et: ilk aynadan bu yana neyin kımıldadığını gör.",
  cikis:
    "Kamp ÇIKIŞI — son ayna. Üç günün tüm kanıtı elinde. En dolu, en cesur ama yine sevecen analiz. Kişinin kampta gösterdiği gerçek dönüşümü ve bundan sonra onu en çok büyütecek tek şeyi söyle.",
};

const TALIMAT = `Görevin: kişinin verisinden, onun KENDİNİN kolayca göremediği ama duyunca derinden tanıyacağı 2-3 çıkarım üret ve fark edince onu başarılı kılacak şeyi söyle.

KALİTE ÇITASI ("wow, güzel tespit" dedirtmeli):
- BARİZ OLANI TEKRARLAMA. "Hedefin diamond olmak" gibi verinin yüzeyini söyleme. Yüzeyin ALTINDAKİ örüntüye in: iç engeli ile çekirdek nedeni arasındaki gizli bağ, bir gücün aynı zamanda nasıl bir tuzağa dönüştüğü, korumak istediği şeyle onu tutan şeyin aynı kök olması gibi.
- Çıkarımları kişinin KENDİ verisinden TÜRET — uydurma, genel kişilik testi dili kullanma. Somut ol.
- Şefkatli ama dürüst. Kör noktayı yüzüne çarpma; bir hediye gibi, "bunu görürsen…" diye sun.
- Kapanış: bu farkındalığı eyleme döktüğünde onu ne bekliyor — umut veren, güçlendiren tek cümle.
- Klişe YASAK (yolculuk, kelebek, ışığını keşfet, potansiyel...). Bu kişiye özel, başkasına yazılamayacak.
- İmza/başlık/selam yok. Doğrudan analizle başla.`;

function jsonCoz(yanit: Anthropic.Message): { metin: string } | null {
  if (yanit.stop_reason === "refusal") return null;
  const ham = yanit.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("");
  try {
    const o = JSON.parse(ham) as { metin?: string };
    return o.metin ? { metin: o.metin } : null;
  } catch {
    return null;
  }
}

// Kampta biriken kanıt (aşama 2-4 için) — anonim: puanlayan kimliği ASLA taşınmaz.
async function kampKaniti(db: Db, pid: string): Promise<object | null> {
  try {
    const [{ data: puanlar }, { data: gorevler }, { count: takdirSayi }] = await Promise.all([
      db
        .from("ratings")
        .select("trait_id, score, comment")
        .eq("target_id", pid)
        .eq("is_self", false)
        .limit(200),
      db
        .from("missions")
        .select("title, ai_score")
        .eq("participant_id", pid)
        .eq("status", "scored")
        .order("scored_at", { ascending: false })
        .limit(12),
      db
        .from("kudos")
        .select("id", { count: "exact", head: true })
        .eq("to_id", pid)
        .eq("is_hidden", false),
    ]);
    const puanListe = (puanlar ?? []) as { trait_id: number; score: number; comment: string | null }[];
    const gorevListe = (gorevler ?? []) as { title: string; ai_score: number | null }[];
    if (puanListe.length === 0 && gorevListe.length === 0) return null;
    const ort =
      puanListe.length > 0
        ? puanListe.reduce((s, r) => s + (r.score ?? 0), 0) / puanListe.length
        : null;
    const yorumlar = puanListe
      .map((r) => (r.comment ?? "").trim())
      .filter(Boolean)
      .slice(0, 8);
    return {
      baskalariOrtalama: ort != null ? Math.round(ort * 10) / 10 : null,
      baskalariYorumlari: yorumlar, // anonim
      gorevler: gorevListe.map((g) => ({ baslik: g.title, puan: g.ai_score })),
      aldigiTakdir: takdirSayi ?? 0,
    };
  } catch {
    return null;
  }
}

// Aşamaya göre kişinin tüm verisini topla.
async function veriTopla(db: Db, pid: string, ad: string, asama: AsamaKod) {
  const [cekirdek, pOzet, hOzet, ofOzet, kisi, pus] = await Promise.all([
    pusulaCekirdek(db, pid),
    pusulaOzeti(db, pid),
    hedefOzeti(db, pid),
    onFarkindalikOzeti(db, pid),
    db.from("participants").select("kariyer_seviyesi, kariyer_durumu").eq("id", pid).maybeSingle(),
    db.from("pusula").select("slogan, oncelikler").eq("participant_id", pid).maybeSingle(),
  ]);

  // Kamp öncesi analizin en az pusula çekirdeğine ihtiyacı var.
  if (!cekirdek && !pOzet && !hOzet && !ofOzet) return null;

  const oncelikler = ((pus.data?.oncelikler as { sira: number; metin: string }[]) ?? [])
    .slice()
    .sort((a, b) => a.sira - b.sira)
    .slice(0, 5)
    .map((o) => o.metin);

  const kanit = asama === "kamp_oncesi" ? null : await kampKaniti(db, pid);

  return {
    ad: ad.split(" ")[0],
    kariyerSeviye: kisi.data?.kariyer_seviyesi ?? null,
    kariyerHal: kisi.data?.kariyer_durumu ?? null,
    slogan: (pus.data?.slogan as string | null) ?? null,
    oncelikler,
    pusulaOzeti: pOzet,
    cekirdekNeden: cekirdek?.cekirdek_neden ?? null,
    mevcutBosluk: cekirdek?.mevcut_bosluk ?? null,
    icEngel: cekirdek?.ic_engel ?? null,
    icEngelKategori: cekirdek?.ic_engel_kat ?? null,
    hedefOzeti: hOzet,
    onFarkindalik: ofOzet,
    kampKaniti: kanit,
  };
}

// Metni Opus 4.8 ile üret. yenidenSebep verilirse onu dikkate alır.
async function metinUret(
  asama: AsamaKod,
  veri: object,
  yenidenSebep: string | null
): Promise<string | null> {
  const yenidenNot = yenidenSebep
    ? `\n\nÖNEMLİ — KİŞİ İLK ANALİZİ SAĞLIKLI/DOĞRU BULMADI ve şu sebebi yazdı: "${yenidenSebep}". Bu geri bildirimi CİDDİYE al: yanlış/incitici bulduğu açıyı düzelt, ona daha çok kulak vererek ve verisine daha sadık kalarak yeniden yaz. Savunmaya geçme; onu daha iyi gör.`
    : "";
  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      thinking: { type: "adaptive" },
      output_config: {
        // Opus medium hâlâ çok derin; high'ın ~2× token maliyetine gerek yok
        // (timeout riskini de azaltır).
        effort: "medium",
        format: { type: "json_schema", schema: SEMA },
      },
      system: `${PERSONA}\n\nAŞAMA: ${ASAMA_CERCEVE[asama]}\n\n${TALIMAT}${yenidenNot}`,
      messages: [{ role: "user", content: JSON.stringify(veri) }],
    });
    const o = jsonCoz(yanit);
    return o?.metin?.trim().slice(0, 1400) ?? null;
  } catch {
    return null;
  }
}

// Metni kişinin klon sesiyle mp3'e çevir + sesler bucket'a yaz. Ses yoksa null.
async function sesUret(db: Db, pid: string, asama: AsamaKod, metin: string): Promise<string | null> {
  if (!sesYapilandirildiMi()) return null;
  const { data: profil } = await db
    .from("voice_profiles")
    .select("voice_id, status")
    .eq("participant_id", pid)
    .maybeSingle();
  const voiceId = profil?.status === "klonlandi" && profil.voice_id ? profil.voice_id : null;
  if (!voiceId) return null;
  try {
    const buf = await seslendir(voiceId, metin);
    const yol = `${pid}/analiz_${asama}.mp3`;
    const { error } = await db.storage
      .from(BUCKET)
      .upload(yol, buf, { contentType: "audio/mpeg", upsert: true });
    if (error) return null;
    return yol;
  } catch {
    return null;
  }
}

export type AnalizSonuc =
  | { durum: "hazir"; metin: string; sesUrl: string | null; yenidenKullanildi: boolean }
  | { durum: "veri-yok" }
  | { durum: "anahtar-yok" }
  | { durum: "hata" };

async function sesUrl(db: Db, yol: string | null): Promise<string | null> {
  if (!yol) return null;
  const { data } = await db.storage.from(BUCKET).createSignedUrl(yol, 3600);
  return data?.signedUrl ?? null;
}

// Bir aşamanın analizini getir; yoksa üret (write-once + cache).
export async function analizGetirVeyaUret(
  db: Db,
  pid: string,
  ad: string,
  asama: AsamaKod
): Promise<AnalizSonuc> {
  const { data: mevcut } = await db
    .from("ayna_analiz")
    .select("metin, ses_path, yeniden_kullanildi")
    .eq("participant_id", pid)
    .eq("asama", asama)
    .maybeSingle();
  if (mevcut?.metin) {
    return {
      durum: "hazir",
      metin: mevcut.metin,
      sesUrl: await sesUrl(db, mevcut.ses_path),
      yenidenKullanildi: !!mevcut.yeniden_kullanildi,
    };
  }

  if (!process.env.ANTHROPIC_API_KEY) return { durum: "anahtar-yok" };

  const veri = await veriTopla(db, pid, ad, asama);
  if (!veri) return { durum: "veri-yok" };

  const metin = await metinUret(asama, veri, null);
  if (!metin) return { durum: "hata" };

  const sesPath = await sesUret(db, pid, asama, metin);

  const { error } = await db
    .from("ayna_analiz")
    .insert({ participant_id: pid, asama, metin, ses_path: sesPath });
  if (error) {
    // Yarış: başka istek aynı anda yazdıysa mevcut kazanır.
    if (error.code === "23505") {
      const { data: kazanan } = await db
        .from("ayna_analiz")
        .select("metin, ses_path, yeniden_kullanildi")
        .eq("participant_id", pid)
        .eq("asama", asama)
        .maybeSingle();
      if (kazanan?.metin)
        return {
          durum: "hazir",
          metin: kazanan.metin,
          sesUrl: await sesUrl(db, kazanan.ses_path),
          yenidenKullanildi: !!kazanan.yeniden_kullanildi,
        };
    }
    return { durum: "hata" };
  }
  return { durum: "hazir", metin, sesUrl: await sesUrl(db, sesPath), yenidenKullanildi: false };
}

// "Yeniden değerlendir" hakkı: aşama başına BİR kez, SEBEP zorunlu.
export async function analizYenidenDegerlendir(
  db: Db,
  pid: string,
  ad: string,
  asama: AsamaKod,
  sebep: string
): Promise<AnalizSonuc> {
  const temizSebep = (sebep ?? "").trim();
  if (temizSebep.length < 10) return { durum: "hata" }; // sebep zorunlu (anlamlı uzunluk)
  if (!process.env.ANTHROPIC_API_KEY) return { durum: "anahtar-yok" };

  const { data: mevcut } = await db
    .from("ayna_analiz")
    .select("id, yeniden_kullanildi")
    .eq("participant_id", pid)
    .eq("asama", asama)
    .maybeSingle();
  if (!mevcut) return { durum: "veri-yok" };
  // Hak bir kez: zaten kullanıldıysa mevcut analizi aynen döndür.
  if (mevcut.yeniden_kullanildi) {
    const { data } = await db
      .from("ayna_analiz")
      .select("metin, ses_path")
      .eq("id", mevcut.id)
      .maybeSingle();
    return {
      durum: "hazir",
      metin: data?.metin ?? "",
      sesUrl: await sesUrl(db, data?.ses_path ?? null),
      yenidenKullanildi: true,
    };
  }

  const veri = await veriTopla(db, pid, ad, asama);
  if (!veri) return { durum: "veri-yok" };

  const metin = await metinUret(asama, veri, temizSebep);
  if (!metin) return { durum: "hata" };

  const sesPath = await sesUret(db, pid, asama, metin);

  const { error } = await db
    .from("ayna_analiz")
    .update({
      metin,
      ses_path: sesPath,
      yeniden_sebep: temizSebep.slice(0, 1000),
      yeniden_kullanildi: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", mevcut.id);
  if (error) return { durum: "hata" };
  return { durum: "hazir", metin, sesUrl: await sesUrl(db, sesPath), yenidenKullanildi: true };
}

// Menü/liste için: kişinin tüm analizleri (aşama sırasına göre).
export async function analizListele(db: Db, pid: string): Promise<AynaAnaliz[]> {
  const { data } = await db
    .from("ayna_analiz")
    .select("asama, metin, ses_path, yeniden_kullanildi, created_at")
    .eq("participant_id", pid);
  const liste = (data ?? []) as AynaAnaliz[];
  return liste.sort(
    (a, b) => ASAMA_SIRA.indexOf(a.asama) - ASAMA_SIRA.indexOf(b.asama)
  );
}

// Tik motoru için: bir aşamanın analizini, o aşamaya henüz sahip OLMAYAN
// katılımcılar için (tik başına sınırlı sayıda) üretir. unique(participant,asama)
// kısıtı tekrarı engeller; analizGetirVeyaUret zaten varsa atlar. Üretilenlerin
// id'lerini döner (kişiye "aynan derinleşti" bildirimi için).
export async function kampAnaliziTik(
  db: Db,
  asama: AsamaKod,
  kisiler: { id: string; full_name: string }[],
  limit = 6
): Promise<string[]> {
  if (kisiler.length === 0) return [];
  const ids = kisiler.map((k) => k.id);
  const { data: olanlar } = await db
    .from("ayna_analiz")
    .select("participant_id")
    .eq("asama", asama)
    .in("participant_id", ids);
  const olanSet = new Set((olanlar ?? []).map((r) => r.participant_id as string));
  const eksik = kisiler.filter((k) => !olanSet.has(k.id)).slice(0, limit);
  const uretilen: string[] = [];
  for (const k of eksik) {
    const r = await analizGetirVeyaUret(db, k.id, k.full_name, asama);
    if (r.durum === "hazir") uretilen.push(k.id);
  }
  return uretilen;
}

// Liste öğesini imzalı ses URL'siyle zenginleştir (sayfa için).
export async function analizListeSesli(
  db: Db,
  pid: string
): Promise<(AynaAnaliz & { sesUrl: string | null })[]> {
  const liste = await analizListele(db, pid);
  return Promise.all(
    liste.map(async (a) => ({ ...a, sesUrl: await sesUrl(db, a.ses_path) }))
  );
}

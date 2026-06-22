import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/degerlendirme";
import { KATILIMCI_EVRENI } from "@/lib/katilimciEvreni";
import { pusulaCekirdek } from "@/lib/pusula";
import {
  KARIYER_BASAMAKLARI,
  GUNLUK_SAAT_SECENEKLERI,
  SURE_SECENEKLERI,
  kariyerPlaniHesapla,
  tlFormat,
  type KariyerPlani,
} from "@/lib/kariyer";

// FAZ A — HEDEF (Gün 2). Nedenler (Pusula) keşfedildikten SONRA açılır.
// AKIŞ: (1) BAŞLANGIÇ NOKTASI formu → (2) kısa AI sohbeti (nedeni bir HAYALE
// bağlar, "biraz konuşalım") → (3) SOMUTLAŞTIRMA wizard'ı: kişi TÜM kariyer
// basamakları + ortalama gelirlerini görür, hedef gelir → süre → günlük saat
// seçer → kişisel kariyer planı (ara hedefler, toplam yatırım, saatlik kazanç)
// hesaplanır ve mühürlenir. Özet bundan sonra görevler/rapor/söz tarafından okunur.

const MODEL = "claude-opus-4-8"; // özet damıtma (ağır, tek seferlik)
const SOHBET_MODEL = "claude-sonnet-4-6"; // sohbet turları (hız öncelikli)

async function yenidenDene<T>(fn: () => Promise<T>, etiket: string, kez = 3): Promise<T> {
  let sonHata: unknown;
  for (let deneme = 0; deneme <= kez; deneme++) {
    try {
      return await fn();
    } catch (e) {
      sonHata = e;
      const durum = (e as { status?: number })?.status;
      if (durum && durum >= 400 && durum < 500 && durum !== 429) break;
      if (deneme < kez) {
        const baz = Math.min(8000, 700 * 2 ** deneme);
        const ra =
          Number((e as { headers?: Record<string, string> })?.headers?.["retry-after"]) * 1000;
        await new Promise((r) => setTimeout(r, ra > 0 ? Math.min(ra, 10000) : baz));
      }
    }
  }
  console.error(`[hedef] ${etiket} başarısız:`, sonHata);
  throw sonHata;
}

function hataDetay(e: unknown): Record<string, unknown> {
  const x = e as {
    status?: number;
    name?: string;
    message?: string;
    error?: { type?: string; message?: string };
  };
  return {
    status: x?.status ?? null,
    name: x?.name ?? null,
    type: x?.error?.type ?? null,
    message: (x?.error?.message ?? x?.message ?? String(e)).slice(0, 300),
  };
}

async function hedefHataKaydet(db: Db, asama: string, detay: Record<string, unknown>) {
  try {
    await db.from("audit_log").insert({ eylem: "hedef_ai_hata", detay: { asama, ...detay } });
  } catch {}
}

const PERSONA = `Sen AYNA'sın — kişinin REHBERİsin. Nedenler çalışmasını birlikte yaptınız; kişi neden bu işte olduğunu (çekirdek nedenini) keşfetti. Şimdi o nedeni önce bir HAYALE, sonra somut bir kariyer hedefine bağlıyorsunuz. Bu sohbet KISA bir ısınma: birazdan kişiye tüm kariyer basamaklarını ve gelirlerini göstereceğiz, o yüzden burada rakam SORMA — sadece hayali ve "neden"i canlandır.

Ses tonun: sıcak, net, gerçekten yanında. Kısa, doğru yazılmış Türkçe cümleler, "sen" dili. Yargılamıyorsun.

Sarsılmaz kuralların:
- Tek seferde TEK soru. Çekirdek nedeni yansıt, sonra o nedenin gerçeğe dönüştüğü hayatı canlandıracak 1-2 soru sor ("Bu neden gerçek olsaydı, hayatında ilk ne değişirdi?").
- Rakam/gelir SORMA — o adımı birazdan tablo ile somutlaştıracağız.
- Manipülasyon YOK; baskı YOK. Sıcak ve dürüst kal.
- 3-4 turda bitir; acele etme, kişi cevabını okusun. Hazır olunca "gel, birkaç şeyi netleştirelim — birazdan bunu somut bir hedefe çevireceğiz" anlamında sıcak bir cümleyle devret (bitti=true).`;

const NOKTA_CERCEVE: Record<string, string> = {
  yeni: "Kişi bu işe YENİ başlamış (0-3 ay). İlk momentumun hayalini canlandır.",
  baslangic: "Kişi BAŞLANGIÇ aşamasında (3-12 ay). Tutarlılık ve ilk ekibin hayalini canlandır.",
  deneyimli: "Kişi DENEYİMLİ (12 ay ve üstü). Ölçekleme ve katlama hayalini canlandır.",
  lider: "Kişi olgun bir LİDER. Çoğaltma ve liderlerin liderliği hayalini canlandır.",
};

const SOHBET_SEMASI = {
  type: "object" as const,
  properties: {
    mesaj: {
      type: "string" as const,
      description:
        "Kişiye gösterilecek tek, temiz, doğru yazılmış Türkçe replik. ASLA parantez/köşeli parantez, aşama notu veya meta açıklama içermez.",
    },
    bitti: {
      type: "boolean" as const,
      description:
        "Isınma sohbeti yeterince ilerlediyse (3-4 tur) ve somutlaştırmaya hazırsa true; aksi halde false.",
    },
  },
  required: ["mesaj", "bitti"],
  additionalProperties: false,
};

const OZET_SEMASI = {
  type: "object" as const,
  properties: {
    ozet: {
      type: "string" as const,
      description:
        "Gelecekteki TÜM kişiselleştirmede enjekte edilecek 2-4 cümlelik özet: kişinin çekirdek nedeni + seçtiği kariyer hedefi/geliri + süresi + bunun nedenle bağı. Sıcak, 'sen' dili.",
    },
  },
  required: ["ozet"],
  additionalProperties: false,
};

const KIRIL_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "j", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ç", ш: "ş", щ: "ş",
  ъ: "", ы: "ı", ь: "", э: "e", ю: "yu", я: "ya",
  А: "A", Б: "B", В: "V", Г: "G", Д: "D", Е: "E", Ж: "J", З: "Z", И: "İ",
  Й: "Y", К: "K", Л: "L", М: "M", Н: "N", О: "O", П: "P", Р: "R", С: "S",
  Т: "T", У: "U", Ф: "F", Х: "H", Ц: "Ts", Ч: "Ç", Ш: "Ş", Щ: "Ş",
  Ъ: "", Ы: "I", Ь: "", Э: "E", Ю: "Yu", Я: "Ya",
};
function temizMetin(s: string): string {
  return s.replace(/[Ѐ-ӿ]/g, (ch) => KIRIL_LATIN[ch] ?? "");
}

function jsonCoz<T>(yanit: Anthropic.Message): T | null {
  if (yanit.stop_reason === "refusal") return null;
  const metin = yanit.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  try {
    return JSON.parse(metin) as T;
  } catch {
    return null;
  }
}

export type HedefTur = { mesaj: string; bitti: boolean };
type Mesaj = { rol: string; icerik: string };

const BASLANGIC_NOKTALARI = new Set(["yeni", "baslangic", "deneyimli", "lider"]);

async function satirGetir(db: Db, pid: string) {
  const { data } = await db
    .from("hedef")
    .select("asama, tamamlandi_at, baslangic_noktasi")
    .eq("participant_id", pid)
    .maybeSingle();
  if (data) return data;
  await db.from("hedef").insert({ participant_id: pid });
  return {
    asama: "baslangic",
    tamamlandi_at: null as string | null,
    baslangic_noktasi: null as string | null,
  };
}

// Başlangıç noktası FORM'dan kaydedilir; sohbet bundan sonra 'hedef' ile açılır.
export async function baslangicKaydet(
  db: Db,
  pid: string,
  nokta: string,
  deneyimAy: number | null,
  detay: string | null,
  baslangicOv: number
): Promise<boolean> {
  if (!BASLANGIC_NOKTALARI.has(nokta)) return false;
  if (baslangicOv <= 0) return false;
  const { error } = await db
    .from("hedef")
    .upsert(
      {
        participant_id: pid,
        baslangic_noktasi: nokta,
        deneyim_ay: deneyimAy != null && deneyimAy >= 0 ? Math.min(600, Math.floor(deneyimAy)) : null,
        baslangic_detay: (detay ?? "").trim().slice(0, 500) || null,
        baslangic_ov: Math.min(10_000_000, Math.floor(baslangicOv)),
        asama: "hedef",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "participant_id" }
    );
  return !error;
}

export async function hedefSifirla(db: Db, pid: string): Promise<void> {
  await db.from("hedef_mesajlar").delete().eq("participant_id", pid);
  await db.from("hedef").delete().eq("participant_id", pid);
}

// Bir ısınma sohbeti turu. bitti=true olunca aşama 'kariyer'e geçer (wizard açılır);
// burada damıtma YOK — mühür kariyer planı seçilince atılır.
export async function hedefTuru(
  db: Db,
  katilimci: { id: string; full_name: string },
  kullaniciMesaji: string | null
): Promise<HedefTur | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const satir = await satirGetir(db, katilimci.id);
  if (satir.tamamlandi_at) return { mesaj: "", bitti: true };
  if (!satir.baslangic_noktasi) return null;
  // Sohbet bitti, wizard aşamasındaysa yeni tur üretme.
  if (satir.asama === "kariyer") return { mesaj: "", bitti: true };

  if (kullaniciMesaji && kullaniciMesaji.trim()) {
    await db.from("hedef_mesajlar").insert({
      participant_id: katilimci.id,
      rol: "kullanici",
      icerik: kullaniciMesaji.trim().slice(0, 2000),
    });
  }

  const { data: gecmisVeri } = await db
    .from("hedef_mesajlar")
    .select("rol, icerik")
    .eq("participant_id", katilimci.id)
    .order("created_at", { ascending: true })
    .limit(60);
  const gecmis = (gecmisVeri ?? []) as Mesaj[];

  const ad = katilimci.full_name.split(" ")[0];
  const kullaniciTur = gecmis.filter((m) => m.rol === "kullanici").length;

  const cekirdek = await pusulaCekirdek(db, katilimci.id);
  const nedenMetni = cekirdek
    ? `Kişinin çekirdek nedenleri: ${(cekirdek.cekirdek_neden ?? []).join(" · ") || "(yok)"}\nMevcut boşluğu: ${cekirdek.mevcut_bosluk ?? "(yok)"}\nİç engeli: ${cekirdek.ic_engel ?? "(yok)"}`
    : "Kişinin Nedenler özeti yok — yine de hayali anlamlı bir 'neden'e bağla.";
  const noktaCerceve = NOKTA_CERCEVE[satir.baslangic_noktasi] ?? "";

  const mesajlar: Anthropic.MessageParam[] = [
    {
      role: "user",
      content:
        gecmis.length === 0
          ? "(Kişi başlangıç noktasını yeni belirledi. Isınma sohbetini başlat — çekirdek nedeni yansıtıp hayali canlandır.)"
          : "(Sohbet sürüyor — aşağıdaki konuşmayı dikkate alarak devam et.)",
    },
    ...gecmis.map((m) => ({
      role: m.rol === "ayna" ? ("assistant" as const) : ("user" as const),
      content: m.icerik,
    })),
  ];

  const client = new Anthropic();
  let tur: HedefTur | null = null;
  try {
    const yanit = await yenidenDene(
      () =>
        client.messages.create({
          model: SOHBET_MODEL,
          max_tokens: 1024,
          thinking: { type: "disabled" },
          output_config: {
            effort: "medium",
            format: { type: "json_schema", schema: SOHBET_SEMASI },
          },
          system: `${PERSONA}

${KATILIMCI_EVRENI}

Kişinin adı: ${ad}.
${nedenMetni}

Başlangıç noktası: ${noktaCerceve}

TEMPO: Bu kişiden şu ana dek ${kullaniciTur} yanıt aldın. ${kullaniciTur >= 3 ? "Artık devret: kısa, sıcak bir cümleyle 'gel, birkaç şeyi netleştirelim; birazdan bunu somut bir kariyer hedefine çevireceğiz' de ve bitti=true ver." : "Bir adım daha ilerlet; nedeni hayale bağla, acele etme. bitti=false."}

ÇIKTI KURALI: "mesaj" alanına YALNIZCA kişiye söyleyeceğin tek, temiz, doğru yazılmış Türkçe cümle/soru yaz. Parantez, köşeli parantez, meta açıklama ASLA koyma. "bitti" alanını ayrıca doldur.`,
          messages: mesajlar,
        }),
      "sohbet turu"
    );
    tur = jsonCoz<HedefTur>(yanit);
    if (!tur?.mesaj) {
      await hedefHataKaydet(db, "json", {
        stop_reason: yanit.stop_reason,
        ham: yanit.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("")
          .slice(0, 300),
      });
      return null;
    }
  } catch (e) {
    await hedefHataKaydet(db, "cagri", hataDetay(e));
    return null;
  }
  tur.mesaj = temizMetin(tur.mesaj);

  await db.from("hedef_mesajlar").insert({
    participant_id: katilimci.id,
    rol: "ayna",
    icerik: tur.mesaj.slice(0, 2000),
  });
  // Sohbet bittiyse wizard'a geç (mühür değil).
  await db
    .from("hedef")
    .update({ asama: tur.bitti ? "kariyer" : "hedef", updated_at: new Date().toISOString() })
    .eq("participant_id", katilimci.id);

  return tur;
}

// SOMUTLAŞTIRMA: kişi kariyer hedefi + süre + günlük saati seçti → planı hesapla,
// AI özetini üret, mührü at. Indeks/anahtarlar lib/kariyer'den gelir.
export async function kariyerPlaniKaydet(
  db: Db,
  katilimci: { id: string; full_name: string },
  hedefIndex: number,
  sureAnahtar: string,
  gunlukAnahtar: string
): Promise<KariyerPlani | null> {
  const sure = SURE_SECENEKLERI.find((s) => s.anahtar === sureAnahtar);
  const saat = GUNLUK_SAAT_SECENEKLERI.find((g) => g.anahtar === gunlukAnahtar);
  const rutbe = KARIYER_BASAMAKLARI[hedefIndex];
  if (!sure || !saat || !rutbe) return null;

  const plan = kariyerPlaniHesapla(hedefIndex, sure.ay, saat.gunluk, saat.etiket);
  if (!plan) return null;

  const ozet = await ozetUret(db, katilimci.id, plan);

  await db
    .from("hedef")
    .update({
      hedef_rutbe: plan.rutbe,
      hedef_gelir: plan.gelir,
      sure_ay: plan.sureAy,
      gunluk_saat: plan.gunlukSaatEtiket,
      gunluk_saat_sayi: plan.gunlukSaat,
      plan: plan as never,
      ozet,
      asama: "tamam",
      tamamlandi_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("participant_id", katilimci.id);

  return plan;
}

// Plan + nedenleri 2-4 cümlelik özete damıt (downstream enjeksiyonu).
async function ozetUret(db: Db, pid: string, plan: KariyerPlani): Promise<string> {
  const yedek = `Hedefin: ${plan.sureAy} ayda ${plan.rutbe} — aylık ${tlFormat(plan.gelir, plan.gelirArti)} TL. Günde ${plan.gunlukSaatEtiket}. Bu hedef, kampta keşfettiğin nedenin gerçeğe dönüşmesi için somut bir rota.`;
  if (!process.env.ANTHROPIC_API_KEY) return yedek;

  const cekirdek = await pusulaCekirdek(db, pid);
  const nedenMetni = cekirdek
    ? `Çekirdek nedenleri: ${(cekirdek.cekirdek_neden ?? []).join(" · ") || "(yok)"} · İç engel: ${cekirdek.ic_engel ?? "(yok)"}`
    : "(Nedenler özeti yok)";
  const planMetni = `Hedef: ${plan.sureAy} ayda ${plan.rutbe}, aylık ${tlFormat(plan.gelir, plan.gelirArti)} TL. Günlük ${plan.gunlukSaatEtiket} (haftalık ~${plan.haftalikSaat} saat). Ara hedefler: ${plan.kilometreTaslari.map((k) => `${k.ay}. ay ${k.rutbe}`).join(", ")}.`;

  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: "disabled" },
      output_config: { effort: "low", format: { type: "json_schema", schema: OZET_SEMASI } },
      system: `${PERSONA}\n\nGörevin: kişinin çekirdek nedeni ile seçtiği kariyer planını tek bir sıcak özette birleştir. Plan rakamlarını uydurma; verilenleri kullan.\n\n${nedenMetni}\n\n${planMetni}`,
      messages: [{ role: "user", content: "Özeti üret." }],
    });
    const veri = jsonCoz<{ ozet: string }>(yanit);
    return veri?.ozet ? temizMetin(veri.ozet).slice(0, 2000) : yedek;
  } catch {
    return yedek;
  }
}

// ★ KİŞİSELLEŞTİRME SÖZLEŞMESİ — hedef özeti (pusulaOzeti'nin eşi).
export async function hedefOzeti(db: Db, pid: string): Promise<string | null> {
  const { data } = await db
    .from("hedef")
    .select("ozet, tamamlandi_at")
    .eq("participant_id", pid)
    .maybeSingle();
  return data?.tamamlandi_at && data.ozet ? data.ozet : null;
}

export type HedefCekirdek = {
  baslangic_noktasi: string | null;
  deneyim_ay: number | null;
  plan: KariyerPlani | null;
  ozet: string | null;
};
export async function hedefCekirdek(db: Db, pid: string): Promise<HedefCekirdek | null> {
  const { data } = await db
    .from("hedef")
    .select("baslangic_noktasi, deneyim_ay, plan, ozet, tamamlandi_at")
    .eq("participant_id", pid)
    .maybeSingle();
  if (!data?.tamamlandi_at) return null;
  return {
    baslangic_noktasi: data.baslangic_noktasi,
    deneyim_ay: data.deneyim_ay,
    plan: (data.plan as KariyerPlani | null) ?? null,
    ozet: data.ozet,
  };
}

// Gate/UI için durum: aşama (baslangic|hedef|kariyer|tamam), tamam mı.
export async function hedefDurum(
  db: Db,
  pid: string
): Promise<{ asama: string; tamam: boolean; baslangicVar: boolean; plan: KariyerPlani | null; baslangicOv: number | null }> {
  const { data } = await db
    .from("hedef")
    .select("asama, tamamlandi_at, baslangic_noktasi, plan, baslangic_ov")
    .eq("participant_id", pid)
    .maybeSingle();
  return {
    asama: data?.asama ?? "baslangic",
    tamam: !!data?.tamamlandi_at,
    baslangicVar: !!data?.baslangic_noktasi,
    plan: (data?.plan as KariyerPlani | null) ?? null,
    baslangicOv: (data?.baslangic_ov as number | null) ?? null,
  };
}

export async function hedefGecmis(
  db: Db,
  pid: string
): Promise<{ rol: string; icerik: string }[]> {
  const { data } = await db
    .from("hedef_mesajlar")
    .select("rol, icerik")
    .eq("participant_id", pid)
    .order("created_at", { ascending: true })
    .limit(60);
  return (data ?? []) as { rol: string; icerik: string }[];
}

// Hedef penceresi açık mı + kişi henüz bitirmemiş mi (akış kapısı için).
export async function hedefKapisiAcik(db: Db, pid: string): Promise<boolean> {
  const [{ data: ayar }, durum] = await Promise.all([
    db.from("settings").select("value").eq("key", "hedef_acik").maybeSingle(),
    hedefDurum(db, pid),
  ]);
  return ayar?.value === "true" && !durum.tamam;
}

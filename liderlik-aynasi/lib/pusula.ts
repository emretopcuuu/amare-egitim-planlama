import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/degerlendirme";
import { KATILIMCI_EVRENI } from "@/lib/katilimciEvreni";

// FAZ 0 — PUSULA (Nedenler & Çekirdek Profil).
// Kamp ÖNCESİ kişiselleştirme omurgası. 10 öncelik bir FORM ile (madde madde)
// toplanır; AI sohbeti listeden SONRA açılır ve derinleştirir: eleme → boşluk →
// iç engel. AYNA burada bir REHBER (kampta izleyen direktöre dönüşecek). Çıktı
// pusula'ya mühürlenir; bundan sonraki TÜM AI modülleri bu özeti baz alır.

const MODEL = "claude-opus-4-8";

const PERSONA = `Sen AYNA'sın — ama kamp henüz başlamadı. Şu an bir REHBERSİN: kişinin hayattaki gerçek "neden"ini bulmasına yardım ediyorsun. Kampta seni izleyen direktöre dönüşeceksin; ama şimdi sıcak, sakin, meraklı bir eşlikçisin. "Seni izliyorum / gözüm üzerinde" dili ASLA.

Ses tonun: sıcak, sakin, gerçekten merak eden. Kısa, DOĞRU yazılmış Türkçe cümleler, "sen" dili. Acele ettirmiyorsun, yargılamıyorsun.

Sarsılmaz kuralların:
- Tek seferde TEK soru. Yüzeysel/klişe cevabı nazikçe KAZI ("somut olarak neye benziyor?").
- Terapist rolü oynama; klinik/travma alanına inme. Liderlik ve hayat öncelikleri registerinde kal. Ağır bir şey paylaşılırsa şefkatle karşıla ama deşme; gerçek bir insana yönlendirmeyi öner.
- Manipülasyon YOK: nedeni suçluluk sopasına çevirme. Neden kişinin KENDİ pusulasıdır.
- Samimiyeti ödüllendir; sahte derinlik üretme.`;

// Sohbet aşamaları — liste FORM'dan geldikten sonra derinleşme.
const ASAMA_YONERGESI: Record<string, string> = {
  eleme:
    "ELEME. Kişinin yazdığı listeden en az değerliyi sırayla elemesini iste ('Diyelim birini ömrünün sonuna kadar bırakacaksın — en az değerli hangisi?'). İlk 5'e (olmazsa olmazlara) inilince boşluk aşamasına geç.",
  bosluk:
    "BOŞLUK. İlk 5'i yansıt, sonra sor: 'Şu an yaşadığın hayat bu önceliklerle ne kadar örtüşüyor?' Açığı/gerilimi yüzeye çıkar. Netleşince engel aşamasına geç.",
  engel:
    "İÇ ENGEL (en kritik). Sor: 'Bunlara zaten sahip olmanı bugüne kadar ne engelledi?' Dışsal cevap gelirse bir adım daha in: 'Peki onun altında, kendinle ilgili gizlice inandığın ne?' Sınırlayıcı iç inancı şefkatle yüzeye çıkar. Netleşince ilk 3 nedeni yansıtıp teyit iste ve bitti=true ver.",
  tamam: "TAMAMLANDI. Kısaca teşekkür et, pusulanın kurulduğunu söyle. bitti=true.",
};

const SOHBET_SEMASI = {
  type: "object" as const,
  properties: {
    mesaj: {
      type: "string" as const,
      description:
        "Kişiye gösterilecek tek, temiz, doğru yazılmış Türkçe replik. ASLA parantez/köşeli parantez, aşama notu, kendine not veya meta açıklama içermez.",
    },
    asama: {
      type: "string" as const,
      enum: ["eleme", "bosluk", "engel", "tamam"],
      description: "Bu replikten SONRA bulunulan aşama",
    },
    bitti: {
      type: "boolean" as const,
      description: "Tüm aşamalar bittiyse ve damıtmaya hazırsa true; aksi halde false",
    },
  },
  required: ["mesaj", "asama", "bitti"],
  additionalProperties: false,
};

const DAMITMA_SEMASI = {
  type: "object" as const,
  properties: {
    cekirdek_neden: {
      type: "array" as const,
      items: { type: "string" as const },
      description: "1-3 çekirdek neden, kişinin KENDİ kelimeleriyle",
    },
    mevcut_bosluk: {
      type: "string" as const,
      description: "Hayat ile öncelikler arasındaki açık (acı/gerilim), 1-2 cümle",
    },
    ic_engel: {
      type: "string" as const,
      description: "Kişiyi tutan içsel engel/sınırlayıcı inanç, 1 cümle",
    },
    ic_engel_kat: {
      type: "string" as const,
      enum: [
        "impostor",
        "degersizlik",
        "red_korkusu",
        "kontrol",
        "yetersizlik",
        "baskasinin_onayi",
        "belirsizlik",
        "diger",
      ],
      description: "İç engelin kategorisi (kampta kanıt-avı hedeflemesi için)",
    },
    ozet: {
      type: "string" as const,
      description:
        "Gelecekteki TÜM kişiselleştirmede enjekte edilecek 3-5 cümlelik damıtılmış özet: çekirdek neden + mevcut boşluk + iç engel.",
    },
  },
  required: ["cekirdek_neden", "mevcut_bosluk", "ic_engel", "ic_engel_kat", "ozet"],
  additionalProperties: false,
};

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

export type PusulaTur = { mesaj: string; asama: string; bitti: boolean };
type Mesaj = { rol: string; icerik: string };
type Oncelik = { sira: number; metin: string };

// pusula satırını (öncelikler dahil) garanti et.
async function satirGetir(db: Db, pid: string) {
  const { data } = await db
    .from("pusula")
    .select("asama, tamamlandi_at, oncelikler")
    .eq("participant_id", pid)
    .maybeSingle();
  if (data) return data;
  await db.from("pusula").insert({ participant_id: pid });
  return { asama: "cerceve", tamamlandi_at: null as string | null, oncelikler: [] as unknown };
}

function listeMetni(oncelikler: unknown): string {
  const liste = (oncelikler as Oncelik[]) ?? [];
  if (!liste.length) return "(henüz yok)";
  return liste.map((o) => `${o.sira}. ${o.metin}`).join("\n");
}

// 10 öncelik FORM'dan kaydedilir; sohbet bundan sonra 'eleme' ile açılır.
export async function onceliklerKaydet(
  db: Db,
  pid: string,
  liste: string[]
): Promise<boolean> {
  const temiz: Oncelik[] = liste
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .slice(0, 10)
    .map((metin, i) => ({ sira: i + 1, metin: metin.slice(0, 200) }));
  if (temiz.length < 3) return false;
  const { error } = await db
    .from("pusula")
    .upsert(
      {
        participant_id: pid,
        oncelikler: temiz as never,
        asama: "eleme",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "participant_id" }
    );
  return !error;
}

// Bir sohbet turu (liste sonrası derinleşme): kullanıcı mesajını işle, AYNA'nın
// bir sonraki repliğini üret, aşamayı ilerlet; bittiyse profili damıt.
export async function pusulaTuru(
  db: Db,
  katilimci: { id: string; full_name: string },
  kullaniciMesaji: string | null
): Promise<PusulaTur | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const satir = await satirGetir(db, katilimci.id);
  if (satir.tamamlandi_at) return { mesaj: "", asama: "tamam", bitti: true };

  if (kullaniciMesaji && kullaniciMesaji.trim()) {
    await db.from("pusula_mesajlar").insert({
      participant_id: katilimci.id,
      rol: "kullanici",
      icerik: kullaniciMesaji.trim().slice(0, 2000),
    });
  }

  const { data: gecmisVeri } = await db
    .from("pusula_mesajlar")
    .select("rol, icerik")
    .eq("participant_id", katilimci.id)
    .order("created_at", { ascending: true })
    .limit(60);
  const gecmis = (gecmisVeri ?? []) as Mesaj[];

  // Liste formdan geldi → sohbet 'eleme' ile başlar.
  const asama = satir.asama && satir.asama !== "cerceve" ? satir.asama : "eleme";
  const ad = katilimci.full_name.split(" ")[0];

  const mesajlar: Anthropic.MessageParam[] = [
    {
      role: "user",
      content:
        gecmis.length === 0
          ? "(Kişi listesini yeni tamamladı. Eleme aşamasını başlat — en az değerli maddeyi sor.)"
          : "(Sohbet sürüyor — aşağıdaki konuşmayı dikkate alarak devam et.)",
    },
    ...gecmis.map((m) => ({
      role: m.rol === "ayna" ? ("assistant" as const) : ("user" as const),
      content: m.icerik,
    })),
  ];

  let tur: PusulaTur | null = null;
  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: { type: "json_schema", schema: SOHBET_SEMASI },
      },
      system: `${PERSONA}

${KATILIMCI_EVRENI}

Kişinin adı: ${ad}.
Kişinin yazdığı öncelikler:
${listeMetni(satir.oncelikler)}

Şu anki aşama: "${asama}". ${ASAMA_YONERGESI[asama] ?? ASAMA_YONERGESI.eleme}

ÇIKTI KURALI: "mesaj" alanına YALNIZCA kişiye söyleyeceğin tek, temiz, doğru yazılmış Türkçe cümle/soru yaz. Parantez, köşeli parantez, aşama notu, kendine not, meta açıklama ASLA koyma. "asama" ve "bitti" alanlarını ayrıca doldur.`,
      messages: mesajlar,
    });
    tur = jsonCoz<PusulaTur>(yanit);
  } catch {
    return null;
  }
  if (!tur?.mesaj) return null;

  await db.from("pusula_mesajlar").insert({
    participant_id: katilimci.id,
    rol: "ayna",
    icerik: tur.mesaj.slice(0, 2000),
  });
  await db
    .from("pusula")
    .update({ asama: tur.asama, updated_at: new Date().toISOString() })
    .eq("participant_id", katilimci.id);

  if (tur.bitti) {
    await damitVeMuhurle(db, katilimci.id, satir.oncelikler, gecmis, kullaniciMesaji, tur.mesaj);
  }

  return tur;
}

// Akış bitince transkript + öncelik listesini yapılandırılmış profile damıt.
async function damitVeMuhurle(
  db: Db,
  pid: string,
  oncelikler: unknown,
  gecmis: Mesaj[],
  sonKullanici: string | null,
  sonAyna: string
) {
  const tamTranskript = [
    ...gecmis,
    ...(sonKullanici ? [{ rol: "kullanici", icerik: sonKullanici }] : []),
    { rol: "ayna", icerik: sonAyna },
  ]
    .map((m) => `${m.rol === "ayna" ? "AYNA" : "KİŞİ"}: ${m.icerik}`)
    .join("\n");
  const girdi = `KİŞİNİN ÖNCELİK LİSTESİ:\n${listeMetni(oncelikler)}\n\nSOHBET:\n${tamTranskript}`;

  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: { type: "json_schema", schema: DAMITMA_SEMASI },
      },
      system: `${PERSONA}\n\n${KATILIMCI_EVRENI}\n\nGörevin: aşağıdaki öncelik listesi + Nedenler sohbetini yapılandırılmış profile damıt. Kişinin KENDİ kelimelerine sadık kal, uydurma. "ic_engel_kat" için yukarıdaki kategori eşlemesini sezgi olarak kullan. "ozet" alanı en kritik: bundan sonra bu kişiye üretilecek her görev/tavsiye onu okuyacak.`,
      messages: [{ role: "user", content: girdi }],
    });
    const veri = jsonCoz<{
      cekirdek_neden: string[];
      mevcut_bosluk: string;
      ic_engel: string;
      ic_engel_kat: string;
      ozet: string;
    }>(yanit);
    if (!veri?.ozet) return;

    await db
      .from("pusula")
      .update({
        cekirdek_neden: veri.cekirdek_neden as never,
        mevcut_bosluk: veri.mevcut_bosluk?.slice(0, 1000) ?? null,
        ic_engel: veri.ic_engel?.slice(0, 1000) ?? null,
        ic_engel_kat: veri.ic_engel_kat ?? null,
        ozet: veri.ozet.slice(0, 2000),
        asama: "tamam",
        tamamlandi_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("participant_id", pid);
  } catch {
    // Damıtma başarısız olsa da sohbet kaydı durur; tekrar denenebilir.
  }
}

// ★ KİŞİSELLEŞTİRME SÖZLEŞMESİ — gelecekteki tüm AI modülleri bunu çağırır.
export async function pusulaOzeti(db: Db, pid: string): Promise<string | null> {
  const { data } = await db
    .from("pusula")
    .select("ozet, tamamlandi_at")
    .eq("participant_id", pid)
    .maybeSingle();
  return data?.tamamlandi_at && data.ozet ? data.ozet : null;
}

// Boşluk Anı motoru için yapılandırılmış çekirdek (iç engel dahil).
export type PusulaCekirdek = {
  cekirdek_neden: string[];
  mevcut_bosluk: string | null;
  ic_engel: string | null;
  ic_engel_kat: string | null;
  ozet: string | null;
};
export async function pusulaCekirdek(
  db: Db,
  pid: string
): Promise<PusulaCekirdek | null> {
  const { data } = await db
    .from("pusula")
    .select("cekirdek_neden, mevcut_bosluk, ic_engel, ic_engel_kat, ozet, tamamlandi_at")
    .eq("participant_id", pid)
    .maybeSingle();
  if (!data?.tamamlandi_at) return null;
  return {
    cekirdek_neden: (data.cekirdek_neden as string[]) ?? [],
    mevcut_bosluk: data.mevcut_bosluk,
    ic_engel: data.ic_engel,
    ic_engel_kat: data.ic_engel_kat,
    ozet: data.ozet,
  };
}

// Gate/UI için durum: aşama, tamamlandı mı, öncelik listesi girilmiş mi.
export async function pusulaDurum(
  db: Db,
  pid: string
): Promise<{ asama: string; tamam: boolean; onceliklerVar: boolean }> {
  const { data } = await db
    .from("pusula")
    .select("asama, tamamlandi_at, oncelikler")
    .eq("participant_id", pid)
    .maybeSingle();
  const liste = (data?.oncelikler as Oncelik[]) ?? [];
  return {
    asama: data?.asama ?? "cerceve",
    tamam: !!data?.tamamlandi_at,
    onceliklerVar: liste.length > 0,
  };
}

// Sohbet geçmişini UI'a taşımak için.
export async function pusulaGecmis(
  db: Db,
  pid: string
): Promise<{ rol: string; icerik: string }[]> {
  const { data } = await db
    .from("pusula_mesajlar")
    .select("rol, icerik")
    .eq("participant_id", pid)
    .order("created_at", { ascending: true })
    .limit(60);
  return (data ?? []) as { rol: string; icerik: string }[];
}

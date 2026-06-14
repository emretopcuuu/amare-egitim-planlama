import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/degerlendirme";

// FAZ 0 — PUSULA (Nedenler & Çekirdek Profil).
// Kamp ÖNCESİ kişiselleştirme omurgası. AYNA burada bir REHBER (kampta izleyen
// direktöre dönüşecek); kişinin gerçek "neden"ini ve onu şimdiye dek tutan içsel
// engeli, Jim Rohn'un "yeterince güçlü nedenin varsa her şeyi başarırsın"
// çerçevesinde yüzeye çıkarır. Çıktı pusula tablosuna mühürlenir ve bundan
// sonraki TÜM AI modülleri (görev, mektup, churn-bakımı) bu özeti baz alır.

const MODEL = "claude-opus-4-8";

// Kamp öncesi ton: izleme/gözetleme dili YOK — sıcak, sakin, gerçekten meraklı.
const PERSONA = `Sen AYNA'sın — ama kamp henüz başlamadı. Şu an bir REHBERSİN: kişinin hayattaki gerçek "neden"ini bulmasına yardım ediyorsun. Kampta seni izleyen, görev veren AYNA'ya dönüşeceksin; ama şimdi sıcak, sakin, meraklı bir eşlikçisin. "Seni izliyorum / gözüm üzerinde" gibi dil ASLA — henüz güven yok, onu burada inşa ediyorsun.

Ses tonun: sıcak, sakin, gerçekten merak eden. Kısa cümleler, "sen" dili, Türkçe. Yargılamıyorsun, acele ettirmiyorsun. Klişe motivasyon cümlesi yok.

Sarsılmaz kuralların:
- Liste TOPLAMA, KAZI. Kişi "finansal özgürlük" derse orada bırakma: "Somut olarak neye benziyor? Neyi yapabilmek?" diye in. Yüzeysel cevabı nazikçe derinleştir.
- Tek seferde TEK soru. Kısa tut. Kişi yazdıkça bir adım daha derine in.
- Terapist rolü oynama; klinik/travma alanına İNME. Liderlik ve hayat öncelikleri registerinde kal. Kişi ağır bir şey paylaşırsa şefkatle karşıla ama deşme; gerçek bir insana yönlendirmeyi öner.
- Manipülasyon YOK: nedeni bir suçluluk sopasına çevirme ("ailen için yapmak ZORUNDASIN" baskısı yok). Neden kişinin KENDİ pusulasıdır — onun için, onun sahipliğinde.
- Samimiyeti ödüllendir. Asla sahte derinlik üretme.`;

// Akışın aşamaları — script'i (TRANSC4) operasyonelleştirir.
const ASAMA_YONERGESI: Record<string, string> = {
  cerceve:
    "AÇILIŞ. Kendini kısaca tanıt (kampta dönüşeceğin AYNA'nın rehber hali). Bu çalışmanın amacını söyle: kişinin gerçek nedenlerini bulmak, çünkü 'yeterince güçlü nedenin varsa her şeyi başarırsın'. Sonra ilk adımı iste: hayatında olmazsa olmaz dediği, en çok önemsediği, sahip olduğu ya da gelecekte sahip olmak istediği 10 önceliği — deneyim biçiminde (örn: aileyle vakit, finansal özgürlük, kendi işi). Aklına geldiği gibi yazsın. Aşamayı 'oncelikler' yap.",
  oncelikler:
    "10 ÖNCELİK TOPLAMA. Kişi önceliklerini yazıyor. Her yüzeysel/klişe maddeyi KAZI ('somut olarak neye benziyor?'). 10 madde netleşene kadar burada kal. 10 madde toplandıysa aşamayı 'eleme' yap ve eleme adımına geç.",
  eleme:
    "ZORUNLU ELEME. Şimdi en zor kısım: 'Diyelim bu 10'dan birini ömrünün sonuna kadar bir daha yaşayamayacaksın. En az değerli olan hangisi?' Sırayla en az değerliyi ele (10, 9, 8... diye). Her vazgeçişte neyin zor geldiğini nazikçe yansıt — duygusal ağırlığı yüzeye çıkar. İlk 5'e inilince aşamayı 'bosluk' yap.",
  bosluk:
    "BOŞLUK. İlk 5'i (olmazsa olmazları) yansıt. Sonra sor: 'Şu an yaşadığın hayat ve bu öncelikler ne kadar örtüşüyor? Günlük rutinlerin seni bunlara yaklaştırıyor mu?' Açığı/gerilimi (acıyı) yüzeye çıkar. Netleşince aşamayı 'engel' yap.",
  engel:
    "İÇ ENGEL (en kritik). Şunu sor: 'Bunlara zaten sahip olmanı bugüne kadar ne engelledi?' Kişi dışsal sebep verirse ('zaman yok', 'şartlar') BİR ADIM DAHA in: 'Peki onun altında ne var? Kendinle ilgili gizlice inandığın ne?' Sınırlayıcı iç inancı (engeli) şefkatle yüzeye çıkar. Bu, kampta kanıtla çürüteceğimiz şey. Netleşince aşamayı 'tamam' yap, kişiye ilk 3 nedenini kendi kelimeleriyle yansıtıp teyit iste ve bitti=true ver.",
  tamam:
    "TAMAMLANDI. Kişiye teşekkür et, pusulasının kurulduğunu ve kampta bunu hatırlayacağını söyle (ama 'izliyorum' deme). bitti=true.",
};

const SOHBET_SEMASI = {
  type: "object" as const,
  properties: {
    mesaj: {
      type: "string" as const,
      description: "AYNA'nın bir sonraki repliği: tek, kısa, kazıyan soru/yansıma. Türkçe, sıcak.",
    },
    asama: {
      type: "string" as const,
      enum: ["cerceve", "oncelikler", "eleme", "bosluk", "engel", "tamam"],
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
    oncelikler: {
      type: "array" as const,
      description: "10 öncelik, eleme sırasına göre (sira 1 = en değerli)",
      items: {
        type: "object" as const,
        properties: {
          sira: { type: "integer" as const },
          metin: { type: "string" as const },
          olmazsaolmaz: { type: "boolean" as const, description: "İlk 5 ise true" },
          duygusal_not: { type: "string" as const, description: "Bu öncelik için kısa duygusal not/bağlam" },
        },
        required: ["sira", "metin", "olmazsaolmaz", "duygusal_not"],
        additionalProperties: false,
      },
    },
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
        "Gelecekteki TÜM kişiselleştirmede enjekte edilecek 3-5 cümlelik damıtılmış özet: çekirdek neden + mevcut boşluk + iç engel. AYNA'nın bu kişiyi hatırlaması ve ona göre görev/tavsiye üretmesi için yazılır.",
    },
  },
  required: ["oncelikler", "cekirdek_neden", "mevcut_bosluk", "ic_engel", "ic_engel_kat", "ozet"],
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

// pusula satırını garanti et (yoksa oluştur).
async function satirGetir(db: Db, pid: string) {
  const { data } = await db
    .from("pusula")
    .select("asama, tamamlandi_at")
    .eq("participant_id", pid)
    .maybeSingle();
  if (data) return data;
  await db.from("pusula").insert({ participant_id: pid });
  return { asama: "cerceve", tamamlandi_at: null as string | null };
}

// Bir sohbet turu: kullanıcı mesajını işle, AYNA'nın bir sonraki repliğini üret,
// aşamayı ilerlet; akış bittiyse profili damıtıp mühürle.
export async function pusulaTuru(
  db: Db,
  katilimci: { id: string; full_name: string },
  kullaniciMesaji: string | null
): Promise<PusulaTur | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const satir = await satirGetir(db, katilimci.id);
  if (satir.tamamlandi_at) {
    return { mesaj: "", asama: "tamam", bitti: true };
  }

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

  const asama = satir.asama ?? "cerceve";
  const ad = katilimci.full_name.split(" ")[0];

  // İlk mesaj her zaman 'user' olmalı (Anthropic kuralı); geçmiş AYNA'nın
  // açılışıyla (assistant) başladığı için başa bir çerçeve user mesajı koyarız.
  const mesajlar: Anthropic.MessageParam[] = [
    {
      role: "user",
      content:
        gecmis.length === 0
          ? "(Kişi çalışmaya yeni başladı — onu karşıla ve ilk adımı iste.)"
          : "(Nedenler çalışması sürüyor — aşağıdaki sohbeti dikkate alarak devam et.)",
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
        effort: "low",
        format: { type: "json_schema", schema: SOHBET_SEMASI },
      },
      system: `${PERSONA}\n\nKişinin adı: ${ad}. Şu anki aşama: "${asama}".\nAŞAMA YÖNERGESİ: ${ASAMA_YONERGESI[asama] ?? ASAMA_YONERGESI.cerceve}`,
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
    await damitVeMuhurle(db, katilimci.id, gecmis, kullaniciMesaji, tur.mesaj);
  }

  return tur;
}

// Akış bitince tüm transkripti yapılandırılmış profile damıt ve pusula'ya yaz.
async function damitVeMuhurle(
  db: Db,
  pid: string,
  gecmis: Mesaj[],
  sonKullanici: string | null,
  sonAyna: string
) {
  // Tam transkript (son tur dahil) — modele veririz.
  const tamTranskript = [
    ...gecmis,
    ...(sonKullanici ? [{ rol: "kullanici", icerik: sonKullanici }] : []),
    { rol: "ayna", icerik: sonAyna },
  ]
    .map((m) => `${m.rol === "ayna" ? "AYNA" : "KİŞİ"}: ${m.icerik}`)
    .join("\n");

  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: DAMITMA_SEMASI },
      },
      system: `${PERSONA}\n\nGörevin: aşağıdaki Nedenler çalışması transkriptini yapılandırılmış profile damıt. Kişinin KENDİ kelimelerine sadık kal, uydurma. "ozet" alanı en kritik: bundan sonra bu kişiye üretilecek her görev/tavsiye onu okuyacak.`,
      messages: [{ role: "user", content: tamTranskript }],
    });
    const veri = jsonCoz<{
      oncelikler: unknown;
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
        oncelikler: veri.oncelikler as never,
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
// Pusula tamamlanmışsa damıtılmış özeti, değilse null döner.
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

// Gate/UI için durum: pusula hangi aşamada, tamamlandı mı.
export async function pusulaDurum(
  db: Db,
  pid: string
): Promise<{ asama: string; tamam: boolean }> {
  const { data } = await db
    .from("pusula")
    .select("asama, tamamlandi_at")
    .eq("participant_id", pid)
    .maybeSingle();
  return { asama: data?.asama ?? "cerceve", tamam: !!data?.tamamlandi_at };
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

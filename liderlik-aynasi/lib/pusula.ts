import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/degerlendirme";
import { KATILIMCI_EVRENI } from "@/lib/katilimciEvreni";
import { kimlikBloguGetir } from "@/lib/kisiKimligi";
import { kritikAiHatasiBildir, type AiHataDetay } from "@/lib/uyari";
import { KARIYER_RANK, kariyerHalTuret } from "@/lib/persona";

// FAZ 0 — PUSULA (Nedenler & Çekirdek Profil).
// Kamp ÖNCESİ kişiselleştirme omurgası. 10 öncelik bir FORM ile (madde madde)
// toplanır; AI sohbeti listeden SONRA açılır ve derinleştirir: eleme → boşluk →
// iç engel. AYNA burada bir REHBER (kampta izleyen direktöre dönüşecek). Çıktı
// pusula'ya mühürlenir; bundan sonraki TÜM AI modülleri bu özeti baz alır.

const MODEL = "claude-opus-4-8";
// Sohbet turları (eleme→boşluk→engel): hız öncelikli. Sonnet 5 + düşünme
// kapalı + düşük efor = en düşük gecikme; yapılandırılmış çıktı korunur.
// Nihai profil DAMITMASI ağır ve tek seferlik olduğu için Opus'ta kalır.
const SOHBET_MODEL = "claude-sonnet-5";

// Canlı seansta ~160 kişi aynı anda; geçici Anthropic hıçkırığı (429/5xx/529
// overloaded/timeout) adaya "yanıt veremedim" göstermesin. Üstel backoff ile 3
// kez yeniden dene; varsa Retry-After başlığına uy. Kalıcı hata (4xx, 429 hariç)
// yeniden denenmez.
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
  console.error(`[pusula] ${etiket} başarısız:`, sonHata);
  throw sonHata;
}

// Hata ayrıntısını okunabilir + saklanabilir hale getir (KVKK: yalnız teknik bilgi).
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

// Gerçek sebebi audit_log'a yaz (Railway loglarına erişmeden teşhis için) +
// kritikse (kredi bitti/anahtar geçersiz) admin'e e-posta uyarısı gönder.
async function pusulaHataKaydet(db: Db, asama: string, detay: Record<string, unknown>) {
  try {
    await db.from("audit_log").insert({ eylem: "pusula_ai_hata", detay: { asama, ...detay } });
  } catch {}
  await kritikAiHatasiBildir(db, `pusula:${asama}`, detay as AiHataDetay);
}

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
    "ELEME. Kişinin yazdığı listeden en az değerliyi sırayla elemesini iste. İlk 5'e (olmazsa olmazlara) inilince ARTIK ELEME YAPTIRMA — fazladan eleme ya da ara soru ekleme; doğrudan tek bir kapanış sorusu sormak için 'engel' aşamasına geç (asama='engel'). ÖNEMLİ — TEKRARDAN KAÇIN: aynı kalıbı her turda tekrarlama. Soruyu çeşitlendir ve aralarda kısa bir insanlık/yansıtma cümlesi kat (ör. 'Bunu bırakmak cesaret ister.'). VURUCU ÇERÇEVE (kullan, soruyu ağırlaştır): eleme 'en kolay hangisi' değil, GERİ DÖNÜŞÜ OLMAYAN BİR KAYIP gibi hissettirilmeli. Sorularını şu ağırlıkta kur: bıraktığı şeye ÖMRÜNÜN SONUNA KADAR bir daha sahip olamayacak, onu hiç gerçekleştiremeyecek, o artık hayatının parçası olmayacak — bunu bilerek vazgeçmek zorunda olsaydı hangisinden vazgeçerdi? Liste daraldıkça (özellikle son birkaç madde) bu ağırlığı artır. Soru varyantları arasında dönüşümlü kullan: 'Bir tanesinden ömrünün sonuna kadar vazgeçmek zorunda olsaydın — bir daha asla ona sahip olamayacaksan, onu hiç yaşayamayacaksan — hangisinden vazgeçerdin?', 'Bunlardan birini sonsuza dek hayatından çıkarman gerekse, o hiç gerçekleşmeyecek olsa, hangisi olurdu?', 'Hangisi olmadan da hâlâ kendin kalabilirsin?', 'Bir tanesini bırakman şart olsaydı ve geri dönüşü olmasaydı, hangisi en az koparırdı seni?'. Kalan madde sayısını her seferinde tek tek saymana gerek yok; doğal aktığında say.",
  bosluk:
    "BOŞLUK. İlk 5'i yansıt, sonra sor: 'Şu an yaşadığın hayat bu önceliklerle ne kadar örtüşüyor?' Açığı/gerilimi yüzeye çıkar. Netleşince engel aşamasına geç.",
  engel:
    "İÇ ENGEL — SON VE TEK SORU (en kritik). Sor: 'Bunlara zaten sahip olmanı bugüne kadar ne engelledi? Onun altında, kendinle ilgili gizlice inandığın ne olabilir?' Bu, sohbetin SON sorusudur — ikinci bir derinleşme/ara sorusu SORMA. Kişi yanıtlar yanıtlamaz AYNI turda ilk 3 önceliğini ve söylediği engeli tek sıcak cümlede yansıt, kısaca teyit al ve bitti=true ver.",
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

// Hızlı model nadiren Türkçe sözcüklere fonetik eşi KİRİL harf sızdırıyor
// (ör. "ettin" → "ettин"). Türkçe çıktıda Kiril meşru değildir; fonetik Latin
// karşılığına çevir (eşi yoksa düşür). Deterministik güvenlik ağı.
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

export type PusulaTur = { mesaj: string; asama: string; bitti: boolean; sloganAdaylar?: string[] };
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
  // 10 madde ZORUNLU (istemci de kilitler; sunucu da garanti eder).
  if (temiz.length < 10) return false;
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

// KARİYER KONUMU (Pusula öncesi) — kişi kampa girişte kendi rakamlarını yazar.
// 4 ham veriden kariyer_durumu (A/B/C/A+) TÜRETİLİR ve participants'a mühürlenir.
// Bundan sonra AYNA görevleri bu persona eksenini de okur.
export type KariyerGirdi = {
  suanki: unknown;
  enYuksek: unknown;
  gecenAy: unknown;
  kidemAy: unknown;
};
export async function kariyerKaydet(
  db: Db,
  pid: string,
  g: KariyerGirdi
): Promise<boolean> {
  // Geçerli basamak değeri ya da null. Geçersiz/boş → null (zorunlu değil).
  const seviye = (v: unknown): string | null =>
    typeof v === "string" && KARIYER_RANK[v] ? v : null;
  const suanki = seviye(g.suanki);
  // Mevcut seviye olmadan momentum türetilemez — en azından o gerekli.
  if (!suanki) return false;

  const enYuksek = seviye(g.enYuksek);
  const gecenAy = seviye(g.gecenAy);
  const kidemHam = Number(g.kidemAy);
  const kidemAy =
    Number.isFinite(kidemHam) && kidemHam >= 0 && kidemHam <= 600
      ? Math.round(kidemHam)
      : null;

  const persona = kariyerHalTuret({ suanki, enYuksek, gecenAy, kidemAy });

  const { error } = await db
    .from("participants")
    .update({
      kariyer_seviyesi: suanki,
      en_yuksek_kariyer: enYuksek,
      gecen_ay_kariyer: gecenAy,
      kidem_ay: kidemAy,
      kariyer_durumu: persona?.hal ?? null,
    })
    .eq("id", pid);
  return !error;
}

// Kariyer konumu girilmiş mi (form kapısı için).
export async function kariyerDurum(
  db: Db,
  pid: string
): Promise<{ var: boolean; suanki: string | null }> {
  const { data } = await db
    .from("participants")
    .select("kariyer_seviyesi")
    .eq("id", pid)
    .maybeSingle();
  return { var: !!data?.kariyer_seviyesi, suanki: data?.kariyer_seviyesi ?? null };
}

// Pusula'yı en baştan başlat: sohbet + öncelikleri temizler. Kişi yanlış bir
// şey yaptıysa (yanlış liste, yanlış eleme) sıfırdan başlayabilsin.
// DİKKAT: KVKK rızası (consent_at) artık en baştaki Hazırlık adımında alınıyor,
// Pusula'da DEĞİL — o yüzden burada SİLİNMEZ. (Eskiden rıza Pusula'da alınırdı;
// silmek bir kalıntıydı ve "nedenleri yeniden yap" diyen kişiyi en baştaki KVKK
// ekranına düşürüp tüm onboarding'i sıfır noktasına atıyordu.)
export async function pusulaSifirla(db: Db, pid: string): Promise<void> {
  await db.from("pusula_mesajlar").delete().eq("participant_id", pid);
  await db.from("pusula").delete().eq("participant_id", pid);
}

// Son elemeyi GERİ AL: en son (kullanıcı eleme → AYNA yanıtı) çiftini sil.
// Eleme aşaması lineer bir AI sohbeti olduğu için "geri alma" = son turu silmek;
// böylece bir önceki AYNA sorusu yeniden son mesaj olur ve kişi yeniden seçebilir.
// Yalnız desen (en son AYNA, ondan önce kullanıcı) tutarsa siler; aksi halde no-op.
export async function pusulaGeriAl(db: Db, pid: string): Promise<boolean> {
  const { data } = await db
    .from("pusula_mesajlar")
    .select("id, rol")
    .eq("participant_id", pid)
    .order("created_at", { ascending: false })
    .limit(2);
  const son = (data ?? []) as { id: number; rol: string }[];
  // En son AYNA repliği + ondan önceki kullanıcı elemesi olmalı.
  if (son.length < 2 || son[0].rol !== "ayna" || son[1].rol !== "kullanici") return false;
  const { error } = await db
    .from("pusula_mesajlar")
    .delete()
    .in("id", [son[0].id, son[1].id]);
  if (error) return false;
  // Eleme içinde geri alındığı için aşama 'eleme'de tutulur.
  await db
    .from("pusula")
    .update({ asama: "eleme", updated_at: new Date().toISOString() })
    .eq("participant_id", pid);
  return true;
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
  const kullaniciTur = gecmis.filter((m) => m.rol === "kullanici").length;

  const mesajlar: Anthropic.MessageParam[] = [
    {
      role: "user",
      content:
        gecmis.length === 0
          ? "(Kişi listesini yeni tamamladı. Eleme aşamasını başlat — en az değerli maddeyi sor.)"
          : "(Sohbet sürüyor — aşağıdaki konuşmayı dikkate alarak devam et.)",
    },
    ...gecmis
      .filter((m) => m.icerik.trim()) // savunma: geçmişte boşluk-only kayıt kalmışsa API'yi kırma
      .map((m) => ({
        role: m.rol === "ayna" ? ("assistant" as const) : ("user" as const),
        content: m.icerik,
      })),
  ];

  const client = new Anthropic();
  const kimlikM = await kimlikBloguGetir(db, katilimci.id);
  let tur: PusulaTur | null = null;
  try {
    const yanit = await yenidenDene(
      () =>
        client.messages.create({
      model: SOHBET_MODEL,
      // Replik yarıda kesilmesin: effort düşünme bütçesi + çıktı aynı tavanı
      // paylaşır; tavanı yükseltip tam cümle garantile.
      max_tokens: 2000,
      thinking: { type: "disabled" },
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: SOHBET_SEMASI },
      },
      system: `${PERSONA}

Kişinin adı: ${ad}.
Kişinin yazdığı öncelikler:
${listeMetni(satir.oncelikler)}

Şu anki aşama: "${asama}". ${ASAMA_YONERGESI[asama] ?? ASAMA_YONERGESI.eleme}

TEMPO — KISA TUT: Bu kişiden şu ana dek ${kullaniciTur} yanıt aldın. Akış nettir: listeyi 5'e indir (eleme) → TEK kapanış sorusu (engel) → bitir. Son 5'e inince fazladan eleme ya da ara soru EKLEME. ${kullaniciTur >= 5 ? "Artık kapat: kapanış sorusunu henüz sormadıysan onu sor; sorduysan ilk 3 önceliği + engeli yansıt, teyit alıp bitti=true ver." : "Listeyi 5'e indir; 5'e inince tek kapanış sorusuna geç."}

ÇIKTI KURALI: "mesaj" alanına YALNIZCA kişiye söyleyeceğin tek, temiz, doğru yazılmış Türkçe cümle/soru yaz. Her cümle büyük harfle başlasın, noktalama doğru olsun. Parantez, köşeli parantez, aşama notu, kendine not, meta açıklama ASLA koyma. "asama" ve "bitti" alanlarını ayrıca doldur.${kimlikM}`,
      messages: mesajlar,
        }),
      "sohbet turu"
    );
    tur = jsonCoz<PusulaTur>(yanit);
    if (!tur?.mesaj?.trim()) {
      await pusulaHataKaydet(db, "json", {
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
    await pusulaHataKaydet(db, "cagri", hataDetay(e));
    return null;
  }
  tur.mesaj = temizMetin(tur.mesaj); // Kiril homoglif glitch'ini temizle

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
    await damitVeMuhurle(client, db, katilimci.id, satir.oncelikler, gecmis, kullaniciMesaji, tur.mesaj);
    // Damıtma bitti → slogan adaylarını ekle (kullanıcı seçsin)
    const { data: sloganVeri } = await db
      .from("pusula")
      .select("slogan_adaylar")
      .eq("participant_id", katilimci.id)
      .maybeSingle();
    const adaylar = sloganVeri?.slogan_adaylar as string[] | undefined;
    if (adaylar?.length) tur.sloganAdaylar = adaylar;
  }

  return tur;
}

// Akış bitince transkript + öncelik listesini yapılandırılmış profile damıt.
async function damitVeMuhurle(
  client: Anthropic,
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
    const yanit = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: { type: "json_schema", schema: DAMITMA_SEMASI },
      },
      // Sistem tamamen SABİT (kişi verisi messages'ta) → tek önbellek bloğu;
      // birbirine yakın çalışan damıtmalar girdiyi yeniden okumaz.
      system: [
        {
          type: "text" as const,
          text: `${PERSONA}\n\n${KATILIMCI_EVRENI}\n\nGörevin: aşağıdaki öncelik listesi + Nedenler sohbetini yapılandırılmış profile damıt. Kişinin KENDİ kelimelerine sadık kal, uydurma. "ic_engel_kat" için yukarıdaki kategori eşlemesini sezgi olarak kullan. "ozet" alanı en kritik: bundan sonra bu kişiye üretilecek her görev/tavsiye onu okuyacak.`,
          cache_control: { type: "ephemeral" as const },
        },
      ],
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
    // Kiril homoglif glitch'ini damıtılan metinlerde de temizle.
    veri.ozet = temizMetin(veri.ozet);
    if (veri.ic_engel) veri.ic_engel = temizMetin(veri.ic_engel);
    if (veri.mevcut_bosluk) veri.mevcut_bosluk = temizMetin(veri.mevcut_bosluk);
    veri.cekirdek_neden = (veri.cekirdek_neden ?? []).map(temizMetin);

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

    // Kişisel slogan adayları: damıtılmış profili baz alarak 3 vurucu 1. tekil cümle.
    await sloganUret(client, pid, veri, db);
  } catch {
    // Damıtma başarısız olsa da sohbet kaydı durur; tekrar denenebilir.
  }
}

const SLOGAN_SEMASI = {
  type: "object" as const,
  properties: {
    adaylar: {
      type: "array" as const,
      items: { type: "string" as const },
      description: "Exactly 3 slogan candidates",
    },
  },
  required: ["adaylar"],
  additionalProperties: false,
};

async function sloganUret(
  client: Anthropic,
  pid: string,
  veri: { cekirdek_neden: string[]; mevcut_bosluk: string; ic_engel: string; ozet: string },
  db: Db
) {
  try {
    const yanit = await client.messages.create({
      model: SOHBET_MODEL,
      max_tokens: 512,
      thinking: { type: "disabled" },
      output_config: { effort: "low", format: { type: "json_schema", schema: SLOGAN_SEMASI } },
      system: `Sen bir Türkçe kopya yazarısın. Kullanıcının kişisel liderlik pusulasından 3 farklı slogan adayı üreteceksin.

SLOGAN KURALLARI:
- Maksimum 8-10 Türkçe kelime
- Birinci tekil şahıs ("Ben…" veya eylemle başlayan)
- Kişinin KENDİ cevaplarından gelen somut kelimeler kullan — genel klişe YOK
- Her aday farklı bir açı: (1) ne için var olduğun, (2) kim olmakta olduğun, (3) iç engeli aşan bildirge
- Vurucu, asla unutmayacağın, sıradan değil

Kişinin profili:
Çekirdek nedenler: ${veri.cekirdek_neden.join(" · ")}
Mevcut boşluk: ${veri.mevcut_bosluk}
İç engel: ${veri.ic_engel}

"adaylar" alanına tam olarak 3 slogan yaz.`,
      messages: [{ role: "user", content: "Sloganları üret." }],
    });
    const cikti = jsonCoz<{ adaylar: string[] }>(yanit);
    if (!cikti?.adaylar?.length) return;
    const temiz = cikti.adaylar.slice(0, 3).map(temizMetin);
    await db
      .from("pusula")
      .update({ slogan_adaylar: temiz as never })
      .eq("participant_id", pid);
  } catch {
    // Slogan üretilemezse kullanıcı elle yazar — kritik değil.
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

// FAZ 0 kapısı: kamp özellikleri (görevler, değerlendirme, duvar...) yalnız
// kişi kampı (oda QR / kamp kodu) fiziksel olarak açana kadar kilitlidir; ondan
// önce kişi hazırlık (Pusula) hub'ına yönlendirilir. Onboarding HEP AÇIK olduğu
// için ayrı bir "pusula penceresi" bayrağına bağlı değil — admin pencere açıp
// kapamakla uğraşmaz. (Öz-değerlendirme kamp öncesi /degerlendir/[kendiId]
// üzerinden erişilir; bu kapının dışındadır.)
export async function kampKilitliMi(db: Db, pid: string): Promise<boolean> {
  const { data: kisi } = await db
    .from("participants")
    .select("camp_unlocked_at")
    .eq("id", pid)
    .maybeSingle();
  return !kisi?.camp_unlocked_at;
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

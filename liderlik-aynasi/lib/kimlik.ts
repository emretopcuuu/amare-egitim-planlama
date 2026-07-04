import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/degerlendirme";

// Özellik 2 — KİMLİK CÜMLESİ TAKİBİ. Yanıtlardan kendini-sınırlayan kimlik
// kalıpları damıtılır ("ben zaten çekingenim", "ben satamam" gibi). Motor bu
// inancı davranışla ÇÜRÜTEN görevler kurar (gorevUret'e sessiz direktif +
// missions.kimlik_cumle_id izi); o görevlerden puan ≥7 alan yanıtlardan tek
// cümlelik karşı-kanıtlar birikir. Kişinin her 10. puanlı görevinde cümle +
// kanıtlar bir YÜZLEŞME kartı olarak yüzüne tutulur: "Bunu hâlâ söyleyebilir
// misin?" — kişi bırakırsa cümle mühürlenir (birakildi_at).
// Tüm damıtma/kanıt adımları FAIL-OPEN: düşerse puanlama akışı etkilenmez.

/** Kişi başına aynı anda izlenen en fazla aktif cümle. */
const AKTIF_CUMLE_UST = 3;
/** Yüzleşme için gereken en az karşı-kanıt sayısı. */
const YUZLESME_KANIT_ALT = 2;
/** Bir cümlede biriktirilen en fazla kanıt (jsonb şişmesin). */
const KANIT_UST = 6;

const KIMLIK_SEMASI = {
  type: "object" as const,
  properties: {
    var: {
      type: "boolean" as const,
      description:
        "Yanıtta kişinin KENDİSİ hakkında kurduğu, kendini sınırlayan bir KİMLİK cümlesi var mı? ('ben zaten çekingenim', 'ben böyleyim, değişmem', 'bende o özgüven yok' gibi kalıcı öz-tanım). Anlık duygu/durum ifadesi ('bugün yorgunum', 'bu görev zordu') KİMLİK DEĞİLDİR → false.",
    },
    cumle: {
      type: "string" as const,
      description:
        "Varsa: kalıbın birinci tekil ağızdan, kısa ve net hâli (ör. 'Ben zaten çekingenim.'). Kişinin kelimelerine sadık kal, klinikleştirme. Yoksa boş string.",
    },
  },
  required: ["var", "cumle"],
  additionalProperties: false,
};

const KANIT_SEMASI = {
  type: "object" as const,
  properties: {
    kanit: {
      type: "string" as const,
      description:
        "Kişinin bu yanıtta ANLATTIĞI, verilen kimlik cümlesini davranışla çürüten somut anın TEK cümlelik özeti, ikinci tekil ağızdan ve geçmiş zamanda (ör. 'Az tanıdığın birine ilk adımı sen attın ve sohbeti sen açtın.'). Yanıt cümleyi gerçekten çürütmüyorsa boş string.",
    },
  },
  required: ["kanit"],
  additionalProperties: false,
};

// ayna.ts'teki jsonCoz'un yereli — modüller arası bağımlılık kurmamak için
// bilinçli küçük kopya (aynı desen: refusal → null, bozuk JSON → null).
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

/** Görev yanıtından kendini-sınırlayan kimlik cümlesi damıt; varsa ve kişinin
 * aktif cümle sayısı tavanın altındaysa deftere ekle. Puanlamaya PARALEL
 * çağrılır (Haiku, ucuz); her hata sessizce yutulur (fail-open). */
export async function kimlikCumlesiIsle(
  db: Db,
  pid: string,
  gorevId: string,
  gorev: { title: string; kind: string },
  yanitMetni: string
): Promise<void> {
  try {
    const { count: aktifSayi } = await db
      .from("kimlik_cumleleri")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", pid)
      .is("yuzlesme_at", null)
      .is("birakildi_at", null);
    if ((aktifSayi ?? 0) >= AKTIF_CUMLE_UST) return;

    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      thinking: { type: "disabled" },
      output_config: { format: { type: "json_schema", schema: KIMLIK_SEMASI } },
      system:
        "Bir liderlik kampı görev yanıtını okuyorsun. Görevin: kişinin kendisi hakkında kurduğu, kendini SINIRLAYAN kalıcı bir kimlik cümlesi olup olmadığını tespit etmek. Titiz ol — anlık duygu, tek seferlik zorlanma ya da alçakgönüllülük kimlik kalıbı DEĞİLDİR; yanlış pozitif üretme. Yalnızca JSON döndür.",
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            gorev: { baslik: gorev.title, tur: gorev.kind },
            yanit: yanitMetni.slice(0, 600),
          }),
        },
      ],
    });
    const veri = jsonCoz<{ var: boolean; cumle: string }>(yanit);
    if (!veri?.var) return;
    const cumle = (veri.cumle ?? "").trim().slice(0, 200);
    if (cumle.length < 5) return;

    // Aynı kalıbı iki kez izleme (bırakılmışsa da yeniden açma — o savaş kazanıldı).
    const { data: mevcutlar } = await db
      .from("kimlik_cumleleri")
      .select("cumle")
      .eq("participant_id", pid);
    const varMi = (mevcutlar ?? []).some(
      (m) => m.cumle.trim().toLocaleLowerCase("tr") === cumle.toLocaleLowerCase("tr")
    );
    if (varMi) return;

    await db.from("kimlik_cumleleri").insert({
      participant_id: pid,
      cumle,
      kaynak_mission_id: gorevId,
    });
  } catch {
    // fail-open
  }
}

/** Puan ≥7 alan bir çürütme görevinin (missions.kimlik_cumle_id) yanıtından tek
 * cümlelik karşı-kanıt damıtıp cümlenin karsit_kanitlar dizisine ekler.
 * Oku-append-yaz yeterli: yanıtlar kişi-başı seri geldiği için yarış kritik değil. */
export async function kimlikKanitEkle(
  db: Db,
  kimlikCumleId: string,
  gorev: { title: string; body: string },
  yanitMetni: string
): Promise<void> {
  try {
    const { data: kayit } = await db
      .from("kimlik_cumleleri")
      .select("id, cumle, karsit_kanitlar, birakildi_at")
      .eq("id", kimlikCumleId)
      .maybeSingle();
    if (!kayit || kayit.birakildi_at) return;
    const mevcut = Array.isArray(kayit.karsit_kanitlar)
      ? (kayit.karsit_kanitlar as string[])
      : [];
    if (mevcut.length >= KANIT_UST) return;

    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 250,
      thinking: { type: "disabled" },
      output_config: { format: { type: "json_schema", schema: KANIT_SEMASI } },
      system:
        "Kişi şu kimlik cümlesiyle kendini sınırlıyor ve az önce bu inancı çürütme fırsatı olan bir görevi başarıyla tamamladı. Yanıtından, cümleyi DAVRANIŞLA çürüten somut anı tek cümleye damıt. Yalnızca JSON döndür.",
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            kimlikCumlesi: kayit.cumle,
            gorev: { baslik: gorev.title, metin: gorev.body.slice(0, 400) },
            yanit: yanitMetni.slice(0, 600),
          }),
        },
      ],
    });
    const veri = jsonCoz<{ kanit: string }>(yanit);
    const kanit = (veri?.kanit ?? "").trim().slice(0, 200);
    if (kanit.length < 5) return;

    await db
      .from("kimlik_cumleleri")
      .update({ karsit_kanitlar: [...mevcut, kanit] })
      .eq("id", kayit.id);
  } catch {
    // fail-open
  }
}

export type KimlikYuzlesme = { id: string; cumle: string; kanitlar: string[] };

/** Yüzleşme anı: kişinin ≥2 karşı-kanıt biriktirmiş EN ESKİ aktif cümlesini
 * seçer, yuzlesme_at ile damgalar (bir cümle yalnız bir kez yüzleştirilir) ve
 * UI kartı için döndürür. Uygun cümle yoksa null. */
export async function kimlikYuzlesmeSec(db: Db, pid: string): Promise<KimlikYuzlesme | null> {
  const { data } = await db
    .from("kimlik_cumleleri")
    .select("id, cumle, karsit_kanitlar")
    .eq("participant_id", pid)
    .is("yuzlesme_at", null)
    .is("birakildi_at", null)
    .order("created_at", { ascending: true });
  const aday = (data ?? [])
    .map((r) => ({
      id: r.id,
      cumle: r.cumle,
      kanitlar: Array.isArray(r.karsit_kanitlar) ? (r.karsit_kanitlar as string[]) : [],
    }))
    .find((r) => r.kanitlar.length >= YUZLESME_KANIT_ALT);
  if (!aday) return null;
  const { error } = await db
    .from("kimlik_cumleleri")
    .update({ yuzlesme_at: new Date().toISOString() })
    .eq("id", aday.id);
  if (error) return null;
  return aday;
}

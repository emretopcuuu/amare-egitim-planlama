import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { aynaClient } from "@/lib/aynaClient";
import type { Db } from "@/lib/degerlendirme";

// Özellik 3 — SICAK AN YAKALAMA. Check-in / görev yanıtı / koçu mesajındaki
// güçlü duygu sinyalini ucuz bir Haiku geçişiyle yakalar ve participants.sicak_an
// önbelleğine yazar ("en taze kazanır"). tik.ts tazeyse (<45 dk) o kişiye öncelik
// verir ve duyguya dokunan mikro-görev üretir (görev aralığı/pik-saat kısıtlarını
// onun için atlar; günlük kota + bekleyen-görev-yok + sessizlik kapıları KALIR).
// Tamamı FAIL-OPEN: tespit düşerse ana akış hiçbir şey hissetmez.

export type SicakAnTuru = "kirilganlik" | "cosku" | "hayal_kirikligi";
export type SicakAnKaynagi = "checkin" | "gorev" | "kocu";

export type SicakAn = {
  tur: SicakAnTuru;
  kaynak: SicakAnKaynagi;
  /** Duygunun tek cümlelik özeti (görev üretimine bağlam olur). */
  ozet: string;
  /** Yakalanma anı (ISO) — tazelik penceresi buradan ölçülür. */
  at: string;
};

/** Sinyal bu kadar dakikadan eskiyse "soğumuş" sayılır: tüketilmez, temizlenir. */
export const SICAK_AN_TAZELIK_DK = 45;

const SICAK_AN_TURLERI: readonly string[] = ["kirilganlik", "cosku", "hayal_kirikligi"];

const SICAK_AN_SEMASI = {
  type: "object" as const,
  properties: {
    sinyal: {
      type: "boolean" as const,
      description:
        "Metinde GÜÇLÜ ve TAZE bir duygu sinyali var mı? Sıradan/nötr/rutin bir anlatımsa false. Yalnız belirgin kırılganlık, coşku ya da hayal kırıklığı true olur.",
    },
    tur: {
      type: "string" as const,
      enum: ["kirilganlik", "cosku", "hayal_kirikligi"],
      description:
        "Baskın duygu: 'kirilganlik' (savunmasızlık, utanç, korkuyu itiraf), 'cosku' (zafer, heyecan, gurur patlaması), 'hayal_kirikligi' (ret, düşüş, beklentinin boşa çıkması).",
    },
    ozet: {
      type: "string" as const,
      description:
        "Duygunun TEK kısa cümlelik özeti, üçüncü ağızdan (ör. 'ekibin önünde konuşmaktan utandığını itiraf etti'). Sinyal yoksa boş string.",
    },
  },
  required: ["sinyal", "tur", "ozet"],
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

/** Ham jsonb değeri hâlâ taze bir sıcak an mı? Taze ise tipli döner, değilse null.
 * (Bayat kaydı TEMİZLEMEZ — temizlik çağıranın işi; bu saf bir okumadır.) */
export function sicakAnTaze(ham: unknown, simdi: Date): SicakAn | null {
  const a = ham as Partial<SicakAn> | null;
  if (!a || typeof a !== "object" || !a.at || !a.ozet || !a.tur) return null;
  if (!SICAK_AN_TURLERI.includes(a.tur)) return null;
  const yasDk = (simdi.getTime() - new Date(a.at).getTime()) / 60_000;
  if (Number.isNaN(yasDk) || yasDk > SICAK_AN_TAZELIK_DK) return null;
  return a as SicakAn;
}

/** Metinden duygu sinyali damıt ve varsa participants.sicak_an'a yaz (üzerine
 * yazar — en taze kazanır). KRİZ tespit edilen metin için ÇAĞIRMA (çağıran
 * kapıyı kurar) — kriz akışı ayrı ve dokunulmazdır. Tamamen fail-open. */
export async function sicakAnYakala(
  db: Db,
  pid: string,
  kaynak: SicakAnKaynagi,
  metin: string
): Promise<void> {
  try {
    const temiz = metin.trim();
    if (temiz.length < 10) return; // tek kelimelik yanıttan sinyal çıkmaz
    const client = aynaClient();
    const yanit = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      thinking: { type: "disabled" },
      output_config: { format: { type: "json_schema", schema: SICAK_AN_SEMASI } },
      system:
        "Bir liderlik kampı katılımcısının az önce yazdığı metni okuyorsun. Görevin: metinde GÜÇLÜ bir duygu sinyali (kırılganlık / coşku / hayal kırıklığı) olup olmadığını dürüstçe tespit etmek. Sıradan, bilgilendirici ya da ılık metinlere sinyal deme — yanlış pozitif, gereksiz görev üretir. Yalnızca JSON döndür.",
      messages: [
        {
          role: "user",
          content: JSON.stringify({ kaynak, metin: temiz.slice(0, 600) }),
        },
      ],
    });
    const veri = jsonCoz<{ sinyal: boolean; tur: string; ozet: string }>(yanit);
    if (!veri?.sinyal || !SICAK_AN_TURLERI.includes(veri.tur)) return;
    const ozet = (veri.ozet ?? "").trim().slice(0, 200);
    if (!ozet) return;
    const an: SicakAn = {
      tur: veri.tur as SicakAnTuru,
      kaynak,
      ozet,
      at: new Date().toISOString(),
    };
    await db.from("participants").update({ sicak_an: an }).eq("id", pid);
  } catch {
    // fail-open: sinyal yakalanamadıysa hiçbir şey olmamış gibi devam
  }
}

/** Sıcak an önbelleğini temizle (tüketildi ya da soğudu). Best-effort. */
export async function sicakAnTemizle(db: Db, pid: string): Promise<void> {
  await db.from("participants").update({ sicak_an: null }).eq("id", pid);
}

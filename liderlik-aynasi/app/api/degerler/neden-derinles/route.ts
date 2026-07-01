import "server-only";
import { getSession } from "@/lib/auth/session";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const YEDEK_SORULAR: Record<number, string> = {
  2: "Bu değer sana ne kazandırıyor? Hayatında somut olarak ne değiştiriyor?",
  3: "Bu değer olmadan nasıl biri olurdun? İçinde ne eksik kalırdı?",
};

export async function POST(req: Request) {
  if (!(await getSession())) return Response.json({ soru: null }, { status: 401 });

  const { deger, tur, oncekiCevaplar } = (await req.json()) as {
    deger: string;
    tur: 2 | 3;
    oncekiCevaplar: string[];
  };

  // Çok kısa/muğlak cevaplarda yedek soruya dön
  const anlamliCevap = oncekiCevaplar.find((c) => c.trim().length >= 10);
  if (!deger || !anlamliCevap) {
    return Response.json({ soru: YEDEK_SORULAR[tur] ?? null });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ soru: YEDEK_SORULAR[tur] ?? null });
  }

  try {
    const client = new Anthropic();
    const gecmis = oncekiCevaplar.map((c, i) => `${i + 1}. "${c}"`).join("\n");
    const turTalimat =
      tur === 2
        ? "Bu kişinin daha derine inmesini sağlayacak bir soru sor. Cevaptaki kelimeleri aynen tekrarlama — arka plandaki ihtiyaca veya duyguya dokunmaya çalış."
        : "Bu kişinin bu değerin özündeki en derin motivasyonunu bulmasını sağlayacak son soruyu sor. Bu değer olmadan hayatında ne eksik olurdu?";

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `Sen bir koçsun. Kişi "${deger}" değeri hakkında şunları söyledi:\n${gecmis}\n\n${turTalimat}\n\nKural: Soru kısa (max 12 kelime), Türkçe, içten, soru işaretiyle bitmeli. Sadece soruyu yaz.`,
        },
      ],
    });

    const soru = msg.content[0].type === "text" ? msg.content[0].text.trim() : null;
    // Çok uzun veya hatalı çıktıda yedek kullan
    if (!soru || soru.length > 120 || !soru.endsWith("?")) {
      return Response.json({ soru: YEDEK_SORULAR[tur] });
    }
    return Response.json({ soru });
  } catch {
    return Response.json({ soru: YEDEK_SORULAR[tur] ?? null });
  }
}

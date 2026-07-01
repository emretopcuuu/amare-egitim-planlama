import "server-only";
import { getSession } from "@/lib/auth/session";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const YEDEK_SORULAR: Record<number, string> = {
  2: "Peki bu sana neden bu kadar önemli? Daha derine git — gerçek nedeni bul.",
  3: "Son soru: Bu değer olmadan nasıl biri olurdun? Hayatında ne eksik kalırdı?",
};

export async function POST(req: Request) {
  if (!(await getSession())) return Response.json({ soru: null }, { status: 401 });

  const { deger, tur, oncekiCevaplar } = (await req.json()) as {
    deger: string;
    tur: 2 | 3;
    oncekiCevaplar: string[];
  };

  if (!deger || !oncekiCevaplar?.length) {
    return Response.json({ soru: YEDEK_SORULAR[tur] ?? null });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ soru: YEDEK_SORULAR[tur] ?? null });
  }

  try {
    const client = new Anthropic();
    const gecmis = oncekiCevaplar.map((c, i) => `${i + 1}. Cevap: "${c}"`).join("\n");
    const turMetin =
      tur === 2
        ? "Kişinin cevabını daha da derinleştiren, içsel motivasyona ulaşmak için 'peki bu neden önemli?' ruhunda yeni bir soru sor."
        : "Kişinin değerinin özünü ortaya çıkaran son ve en güçlü soruyu sor. Bu değer olmadan ne kaybederlerdi, kim olurlardı?";

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 120,
      messages: [
        {
          role: "user",
          content: `Sen derin bir koç ve değer araştırmacısısın. Bir kişi "${deger}" değeriyle ilgili şunları söyledi:\n\n${gecmis}\n\n${turMetin}\n\nSoruyu Türkçe, kısa (1 cümle, maksimum 20 kelime), samimi ve içten yaz. Soru işaretiyle bitir. Başka hiçbir şey yazma — sadece soruyu.`,
        },
      ],
    });

    const soru = msg.content[0].type === "text" ? msg.content[0].text.trim() : null;
    return Response.json({ soru: soru || YEDEK_SORULAR[tur] });
  } catch {
    return Response.json({ soru: YEDEK_SORULAR[tur] ?? null });
  }
}

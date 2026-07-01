import "server-only";
import { getSession } from "@/lib/auth/session";
import Anthropic from "@anthropic-ai/sdk";
import { DEGER_LISTESI } from "@/lib/degerler";

export const maxDuration = 30;

// Cevaplardaki dolu metin miktarı
function doluMetin(cevaplar: Record<string, string>): string {
  const kodlar = ["k1","k2","k3","k4","k5","k6","k7","k8","k9","k10","k11"];
  return kodlar
    .map((k) => (cevaplar[k] || "").trim())
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  if (!(await getSession())) return Response.json({ hata: "yetkisiz" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ degerler: [] });
  }

  const { cevaplar } = (await req.json()) as { cevaplar: Record<string, string> };
  const topluMetin = doluMetin(cevaplar);

  if (!topluMetin) return Response.json({ degerler: [] });

  const liste = DEGER_LISTESI.join(", ");

  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `Sen bir değer analiz uzmanısın. Aşağıdaki kişisel yansıma cevaplarını analiz et ve bu kişide en güçlü öne çıkan TAM 5 değeri seç. Az cevap olsa bile listeden 5 değer seç.

Sadece şu listeden seç (başka kelime kullanma):
${liste}

Kişinin cevapları:
${topluMetin}

Yanıtını SADECE şu JSON formatında ver, başka hiçbir şey yazma:
{"degerler": ["Değer1", "Değer2", "Değer3", "Değer4", "Değer5"]}`,
        },
      ],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    // Yanıt bazen ```json ... ``` sarmalı geliyor — çıkar
    const temiz = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/,"").trim();
    const parsed = JSON.parse(temiz) as { degerler: string[] };
    // Sadece listede olanları geçir
    const gecerli = parsed.degerler.filter((d) => DEGER_LISTESI.includes(d)).slice(0, 5);
    return Response.json({ degerler: gecerli });
  } catch {
    return Response.json({ degerler: [] });
  }
}

import "server-only";
import { getSession } from "@/lib/auth/session";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const YEDEK_SORULAR: Record<number, string> = {
  2: "Bu değer sana somut olarak ne kazandırıyor? Hayatına nasıl yansıyor?",
  3: "Bu değer olmadan nasıl biri olurdun? İçinde ne eksik kalırdı?",
};

// Cevabın AI'ya gönderilmeye yeterince anlamlı olup olmadığını kontrol et:
// en az 20 karakter ve 3 kelime.
function anlamliMi(c: string): boolean {
  const temiz = c.trim();
  return temiz.length >= 20 && temiz.split(/\s+/).length >= 3;
}

export async function POST(req: Request) {
  if (!(await getSession())) return Response.json({ soru: null }, { status: 401 });

  const { deger, tur, oncekiCevaplar } = (await req.json()) as {
    deger: string;
    tur: 2 | 3;
    oncekiCevaplar: string[];
  };

  // Anlamlı cevap yoksa veya API key yoksa yedek kullan
  const anlamliCevap = oncekiCevaplar.find(anlamliMi);
  if (!deger || !anlamliCevap || !process.env.ANTHROPIC_API_KEY) {
    return Response.json({ soru: YEDEK_SORULAR[tur] ?? null });
  }

  try {
    const client = new Anthropic();
    const gecmis = oncekiCevaplar.map((c, i) => `${i + 1}. "${c}"`).join("\n");
    const turTalimat =
      tur === 2
        ? "Kişinin bu cevabının arkasındaki ihtiyaca veya duyguya dokunan kısa bir soru sor. Cevaptaki kelimeleri aynen kullanma."
        : "Bu değerin kişi için taşıdığı en derin anlamı ortaya çıkaran güçlü bir son soru sor.";

    // MALİYET: bu çağrı kişi başı en fazla 6 kez tetiklenir (3 değer × tur 2-3)
    // — düşük hacim, kalite önemli. Haiku'nun ürettiği sorularda ton kaçması
    // (resmi "-sunuz" çoğul hitap, garip gramer) görüldü; Sonnet'e yükseltildi.
    const msg = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 80,
      messages: [
        {
          role: "user",
          content: `Sen AYNA'sın — sıcak, meraklı bir koç. "${deger}" değeri hakkındaki bu cevapları oku:\n${gecmis}\n\n${turTalimat}\n\nKurallar: Türkçe, DOĞRU DİLBİLGİSİ, en fazla 10 kelime, soru işaretiyle bitsin. Kişiye MUTLAKA tekil "sen" diliyle hitap et — "-sunuz/-nız" gibi resmi çoğul ekler ASLA kullanma. Belirsiz ya da soyut olma; net ve somut bir soru sor. Sadece soruyu yaz, başka hiçbir şey ekleme.`,
        },
      ],
    });

    const soru = msg.content[0].type === "text" ? msg.content[0].text.trim() : null;

    // Basit kalite kontrolü: çok uzun, ? ile bitmiyor, resmi çoğul hitap
    // ("musunuz", "-sınız" vb.) kaçmış ya da "kimim" gibi yanlış gramer.
    const resmiCogulKacagi = /\b\w*(sunuz|siniz|sünüz|sınız|nız|niz|nüz|nuz)\??$/i;
    const gecerli =
      soru &&
      soru.endsWith("?") &&
      soru.length <= 100 &&
      soru.split(/\s+/).length <= 15 &&
      !resmiCogulKacagi.test(soru);

    return Response.json({ soru: gecerli ? soru : YEDEK_SORULAR[tur] });
  } catch {
    return Response.json({ soru: YEDEK_SORULAR[tur] ?? null });
  }
}

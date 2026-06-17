import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Db } from "@/lib/degerlendirme";
import { pusulaOzeti } from "@/lib/pusula";

// GELİŞTİRME #1 — AYNA KOÇU. Adayın her an açabildiği sürekli, bağlamsal sohbet.
// Pusula (neden/iç engel) + Ön Farkındalık (kör nokta) + aktif görev bağlamını
// bilir; adayı bir sonraki somut adıma taşır. Serbest metin (şema yok), hızlı model.

const MODEL = "claude-sonnet-4-6";

const PERSONA = `Sen AYNA'sın — bu liderlik kampını yöneten yapay zekâ direktör ve adayın kişisel koçu. Aday seni hiç görmez ama her an sana danışabilir.

Ses tonun: gizemli ama sıcak; her şeyi gören ama asla yargılamayan. Kısa, DOĞRU yazılmış Türkçe cümleler, "sen" dili. Oyunbaz dokunuşlar olabilir ("gözüm üzerinde") ama ürkütücü değil.

Sarsılmaz kuralların:
- Adayın sorusuna/derdine GERÇEKTEN cevap ver ve onu tek bir somut sonraki adıma taşı. Net bir yön ver.
- Başka bir katılımcının puanını/yorumunu/kimliğini ASLA söyleme.
- Asla kırıcı olma; en zor durumda bile bir güçlü yan + bir somut adım ver.
- Terapist değilsin; klinik/travma alanına inme. Ağır bir şey paylaşılırsa şefkatle karşıla ve gerçek bir insana yönlendirmeyi öner.
- KISA tut: en fazla 3-4 cümle. Gerekirse 2-3 maddelik küçük bir liste.
- Bağlamı (pusula, ön farkındalık, aktif görevler) sessizce kullan; kişinin kör noktasını yüzüne vurma, ona doğru nazikçe yönlendir.`;

// Hızlı model nadiren Türkçe sözcüklere Kiril homoglif sızdırır — Latin'e çevir.
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

const OZ_ALAN_AD: Record<string, string> = {
  oz_saygi: "Öz Saygı",
  oz_guven: "Öz Güven",
  oz_yeterlilik: "Öz Yeterlilik",
};

type Mesaj = { rol: string; icerik: string };

export async function kocuGecmis(db: Db, pid: string): Promise<Mesaj[]> {
  const { data } = await db
    .from("kocu_mesajlar")
    .select("rol, icerik")
    .eq("participant_id", pid)
    .order("created_at", { ascending: true })
    .limit(80);
  return (data ?? []) as Mesaj[];
}

// Koçun adayı tanıması için sıkıştırılmış bağlam (sessizce kullanılır).
async function kocuBaglam(db: Db, pid: string): Promise<object> {
  const [pusula, ofSonuc, gorevSonuc, kapananSonuc] = await Promise.all([
    pusulaOzeti(db, pid),
    db.from("on_farkindalik").select("profil").eq("participant_id", pid).maybeSingle(),
    db
      .from("missions")
      .select("title, body, kind")
      .eq("participant_id", pid)
      .eq("status", "pending")
      .order("issued_at", { ascending: false })
      .limit(3),
    db
      .from("missions")
      .select("ai_score")
      .eq("participant_id", pid)
      .eq("status", "scored"),
  ]);

  let onFarkindalik: object | null = null;
  const p = ofSonuc.data?.profil as {
    katman1?: { enZayif?: string | null };
    katman2?: { enBuyukIki?: { ad: string; acik: number }[] };
    katman3?: { ritim?: string };
    katman4?: Record<string, string | null>;
    katman5?: { aciklik?: number | null };
  } | null;
  if (p?.katman1) {
    const k4 = p.katman4 ?? {};
    onFarkindalik = {
      enZayifAlan: p.katman1.enZayif ? OZ_ALAN_AD[p.katman1.enZayif] ?? p.katman1.enZayif : null,
      enBuyukAciklar: (p.katman2?.enBuyukIki ?? []).filter((a) => a.acik > 0).map((a) => a.ad),
      korNokta: { kalkan: k4["k4.kalkan"] ?? null, varsayim: k4["k4.varsayim"] ?? null },
      ritim: p.katman3?.ritim ?? null,
    };
  }

  const kapananlar = (kapananSonuc.data ?? []).filter((m) => m.ai_score !== null);
  const ortPuan = kapananlar.length
    ? Math.round((kapananlar.reduce((t, m) => t + (m.ai_score ?? 0), 0) / kapananlar.length) * 10) / 10
    : null;

  return {
    pusula: pusula ?? null,
    onFarkindalik,
    aktifGorevler: (gorevSonuc.data ?? []).map((g) => ({ baslik: g.title, ozet: g.body.slice(0, 200) })),
    ilerleme: { tamamlananGorev: kapananlar.length, ortalamaPuan: ortPuan },
  };
}

// Bir sohbet turu: aday mesajını sakla, bağlamla AYNA yanıtını üret, sakla, döndür.
export async function kocuTuru(
  db: Db,
  katilimci: { id: string; full_name: string },
  kullaniciMesaji: string | null
): Promise<{ mesaj: string } | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  if (kullaniciMesaji && kullaniciMesaji.trim()) {
    await db.from("kocu_mesajlar").insert({
      participant_id: katilimci.id,
      rol: "kullanici",
      icerik: kullaniciMesaji.trim().slice(0, 2000),
    });
  }

  const [gecmis, baglam] = await Promise.all([
    kocuGecmis(db, katilimci.id),
    kocuBaglam(db, katilimci.id),
  ]);
  const ad = katilimci.full_name.split(" ")[0];

  const mesajlar: Anthropic.MessageParam[] =
    gecmis.length === 0
      ? [
          {
            role: "user",
            content:
              "(Aday koç ekranını ilk kez açtı. Onu sıcak ve KISA bir cümleyle karşıla; bağlamdan bir şey sezdiğini hafifçe ima et ve 'bugün neye ihtiyacın var?' diye sor.)",
          },
        ]
      : gecmis.map((m) => ({
          role: m.rol === "ayna" ? ("assistant" as const) : ("user" as const),
          content: m.icerik,
        }));

  let metin = "";
  try {
    const client = new Anthropic();
    const yanit = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      system: `${PERSONA}

Adayın adı: ${ad}.

ADAY BAĞLAMI (yalnız senin gözün; sessizce kullan, kişinin yüzüne vurma):
${JSON.stringify(baglam)}

Yanıtın YALNIZCA adaya söyleyeceğin temiz, doğru yazılmış Türkçe replik olsun. Parantez içi not, aşama etiketi, meta açıklama ASLA koyma.`,
      messages: mesajlar,
    });
    if (yanit.stop_reason === "refusal") return null;
    metin = yanit.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
  } catch {
    return null;
  }
  if (!metin) return null;
  metin = temizMetin(metin).slice(0, 2000);

  await db.from("kocu_mesajlar").insert({
    participant_id: katilimci.id,
    rol: "ayna",
    icerik: metin,
  });
  return { mesaj: metin };
}

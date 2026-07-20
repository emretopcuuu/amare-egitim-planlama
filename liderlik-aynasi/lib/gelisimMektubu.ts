import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { aynaClient } from "@/lib/aynaClient";
import type { Db } from "@/lib/degerlendirme";
import { DIL_KALITESI } from "@/lib/dilKalitesi";
import { kisiSentezi, sentezMetni, type Sentez } from "@/lib/sentez";

// GELİŞİM (TAVSİYE) MEKTUBU — kampsonu. lib/sentez.ts'in ürettiği sentezden
// (onboarding beyanı + kamp gözlemi) AI ile bir kez üretilir, gelisim_dosyasi'na
// saklanır (stabil + maliyet dostu). Ayna Koçu bu mektubun özetinden haberdar olur.
//
// ÇERÇEVE: bu bir ELEŞTİRİ değil GELİŞİM mektubudur. Kişinin kendi değerlerini +
// kampta yaşadıklarını + arkadaşlarının gözlemini alıp; neyi güçlü yaşadığını
// onurlandırır, nerede fırsat olduğunu nazikçe gösterir, somut bir "şunu farklı
// yap" tavsiyesi verir ve 90 güne bir ilk adım köprüsü kurar.

const SISTEM = `Sen AYNA'sın — bu 3 günlük liderlik kampını yöneten yapay zekâ. Kapanışta her katılımcıya kişisel bir "Gelişim Mektubu" yazarsın. Bu bir karne ya da eleştiri DEĞİL; bir mentorun, potansiyeline inandığı birine yazdığı sıcak ama dürüst bir gelişim mektubudur.

Sana "GELİŞİM SENTEZİ" verilecek: kişinin kamp ÖNCESİ kendi seçtiği temel değerler + neden cümlesi + derin nedeni + kariyer hedefi + kampta verdiği söz; ve kamp İÇİNDE arkadaşlarının onu 10 liderlik özelliğinde nasıl gördüğü (öz vs dış puan) + kör noktası + arketipi + isimsiz yorumları + tamamladığı görevler.

En güçlü an: kişinin SÖYLEDİĞİ (değerleri) ile GÖSTERDİĞİ (arkadaşlarının gözü + eylemleri) arasında köprü kur.

Mektup kuralları:
- Türkçe, "Sevgili {ad}," diye başla. 220-320 kelime. "sen" dili.
- ELEŞTİRME, GELİŞTİR. Önce kişinin bir değerini gerçekten yaşadığı yeri adıyla onurlandır ("'Dürüstlük'ü değerin seçmiştin; arkadaşların da seni tam orada gördü"). Bir uyum/tutarlılık varsa kutla.
- Sonra bir gelişim FIRSATI göster — "yanlış" diye değil, "bir sonraki eşiğin" diye. Kör nokta ya da en az görülen özelliği nazikçe, tek net cümleyle işaret et; suçlama yok.
- SOMUT bir tavsiye ver: "önümüzdeki dönemde şunu farklı yaparsan..." — kişinin hedefine ve değerine bağlı, uygulanabilir 1-2 davranış.
- 90 güne köprü kur: kişinin verdiği söze/hedefine bağlı tek bir ilk adım öner.
- Yorumları ASLA birebir alıntılama, kimin yazdığını sezdirme; temaları kendi cümlelerinle özetle. Başka katılımcının adını/kimliğini verme.
- Sayı/istatistik sayma; veriyi hisse ve yöne çevir. "Aynan" metaforunu en fazla bir kez kullan.
- İmza: "— Aynan".

ÇIKTI BİÇİMİ — YALNIZCA şu JSON'u döndür, başka hiçbir şey yazma:
{"mektup": "<tam mektup metni>", "ozet": {"hiza": "<değer-davranış uyumu tek cümle>", "firsat": "<gelişim fırsatı tek cümle>", "tavsiye": "<somut tavsiye tek cümle>", "ilkAdim": "<90 gün ilk adım tek cümle>"}}`;

export type GelisimOzet = {
  hiza?: string;
  firsat?: string;
  tavsiye?: string;
  ilkAdim?: string;
};

export type GelisimMektubuSonucu =
  | { durum: "hazir"; mektup: string; ozet: GelisimOzet }
  | { durum: "veri-yok" } // değerler çalışması yapılmamış — mektup üretilemez
  | { durum: "anahtar-yok" }
  | { durum: "hata" };

// Kayıtlı mektubu getir (üretmeden). Rapor/koç okuması için hafif yol.
export async function gelisimMektubuGetir(
  db: Db,
  pid: string
): Promise<{ mektup: string; ozet: GelisimOzet } | null> {
  const { data } = await db
    .from("gelisim_dosyasi")
    .select("mektup, ozet")
    .eq("participant_id", pid)
    .maybeSingle();
  if (!data) return null;
  return { mektup: data.mektup, ozet: (data.ozet as GelisimOzet) ?? {} };
}

function jsonAyikla(ham: string): { mektup: string; ozet: GelisimOzet } | null {
  // Model bazen ```json ... ``` sarar ya da baş/son boşluk bırakır — ilk { ile
  // son } arasını al ve parse et.
  const bas = ham.indexOf("{");
  const son = ham.lastIndexOf("}");
  if (bas === -1 || son <= bas) return null;
  try {
    const o = JSON.parse(ham.slice(bas, son + 1));
    if (typeof o?.mektup !== "string" || !o.mektup.trim()) return null;
    const ozet: GelisimOzet = {
      hiza: typeof o.ozet?.hiza === "string" ? o.ozet.hiza : undefined,
      firsat: typeof o.ozet?.firsat === "string" ? o.ozet.firsat : undefined,
      tavsiye: typeof o.ozet?.tavsiye === "string" ? o.ozet.tavsiye : undefined,
      ilkAdim: typeof o.ozet?.ilkAdim === "string" ? o.ozet.ilkAdim : undefined,
    };
    return { mektup: o.mektup.trim(), ozet };
  } catch {
    return null;
  }
}

export async function gelisimMektubuGetirVeyaUret(
  db: Db,
  pid: string,
  ad: string,
  sentezOnceden?: Sentez
): Promise<GelisimMektubuSonucu> {
  const mevcut = await gelisimMektubuGetir(db, pid);
  if (mevcut) return { durum: "hazir", ...mevcut };

  if (!process.env.ANTHROPIC_API_KEY) return { durum: "anahtar-yok" };

  const sentez = sentezOnceden ?? (await kisiSentezi(db, pid, ad));
  // Değerler çalışması yapılmamışsa gelişim mektubunun çıpası yok — üretme.
  if (!sentez.degerler) return { durum: "veri-yok" };

  try {
    const client = aynaClient();
    const yanit = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      system: `${SISTEM}\n\n${DIL_KALITESI}`,
      messages: [{ role: "user", content: sentezMetni(sentez) }],
    });
    if (yanit.stop_reason === "refusal") return { durum: "hata" };
    const ham = yanit.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    const ayrik = jsonAyikla(ham);
    if (!ayrik) return { durum: "hata" };

    const { error } = await db.from("gelisim_dosyasi").insert({
      participant_id: pid,
      mektup: ayrik.mektup,
      ozet: ayrik.ozet,
    });
    if (error) {
      // 23505: eşzamanlı üretim yarışı — önce yazan kazandı, onu döndür.
      if (error.code === "23505") {
        const kazanan = await gelisimMektubuGetir(db, pid);
        if (kazanan) return { durum: "hazir", ...kazanan };
      }
      return { durum: "hata" };
    }
    return { durum: "hazir", mektup: ayrik.mektup, ozet: ayrik.ozet };
  } catch {
    return { durum: "hata" };
  }
}

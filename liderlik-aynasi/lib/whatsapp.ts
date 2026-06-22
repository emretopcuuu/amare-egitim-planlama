import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { WA_SABLONLAR, type WaSablon } from "@/lib/whatsappSablonlari";

// WhatsApp gönderimi Twilio üzerinden. Tek dokunuş noktası burası — sağlayıcı
// değişirse yalnız bu modül güncellenir (lib/eposta.ts deseni gibi).
//
// Proaktif (kullanıcı yazmadan) WhatsApp mesajı yalnız Meta'nın onayladığı
// şablonlarla gider. Onaylı şablonların ContentSid'leri settings tablosunda
// tutulur (kayıt scripti yazar) — bkz. scripts/whatsappKaydet.ts.

export function whatsAppYapilandirildiMi(): boolean {
  return (
    !!process.env.TWILIO_ACCOUNT_SID &&
    !!process.env.TWILIO_AUTH_TOKEN &&
    !!process.env.TWILIO_WHATSAPP_FROM
  );
}

// Tüm onaylı şablon ContentSid'lerini settings'ten oku (anahtar → HX...).
export async function sablonSidleri(db: Db): Promise<Record<string, string>> {
  const anahtarlar = WA_SABLONLAR.map((s) => s.ayarAnahtari);
  const { data } = await db.from("settings").select("key, value").in("key", anahtarlar);
  const harita: Record<string, string> = {};
  for (const r of data ?? []) {
    const sablon = WA_SABLONLAR.find((s) => s.ayarAnahtari === r.key);
    if (sablon && r.value) harita[sablon.anahtar] = r.value;
  }
  return harita;
}

export async function sablonSidGetir(db: Db, sablon: WaSablon): Promise<string | null> {
  const { data } = await db
    .from("settings")
    .select("value")
    .eq("key", sablon.ayarAnahtari)
    .maybeSingle();
  return data?.value || null;
}

// E.164 telefonu Twilio WhatsApp adresine çevirir; geçersizse null.
export function whatsAppAdresi(telefon: string | null | undefined): string | null {
  if (!telefon) return null;
  const t = telefon.trim();
  if (!/^\+[1-9]\d{7,14}$/.test(t)) return null;
  return `whatsapp:${t}`;
}

// Tek bir onaylı şablon mesajı gönderir. Başarılıysa true.
export async function whatsAppGonder(
  telefon: string,
  contentSid: string,
  degiskenler: Record<string, string>
): Promise<boolean> {
  const adres = whatsAppAdresi(telefon);
  if (!adres) return false;

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const govde = new URLSearchParams({
    To: adres,
    From: process.env.TWILIO_WHATSAPP_FROM!,
    ContentSid: contentSid,
    ContentVariables: JSON.stringify(degiskenler),
  });

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        },
        body: govde,
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

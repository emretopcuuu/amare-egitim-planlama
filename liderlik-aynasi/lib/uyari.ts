import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { uyariEpostasiGonder } from "@/lib/eposta";

// KRİTİK AI HATA ALARMI
// AYNA'nın yapay zekâ çağrıları (Anthropic) KALICI bir nedenle düşerse —
// özellikle KREDİ BİTMESİ ya da ANAHTAR GEÇERSİZ — admin'e anında e-posta gider.
// Böylece katılımcılar "yanıt veremedim" görmeden önce admin haberdar olur.
//
// Spam koruması: aynı kategori için en fazla KISMA_DK dakikada bir mail. Kredi
// bittiğinde 150 kişi aynı anda tetiklese de tek mail gider (settings'te son
// gönderim zamanı tutulur).

const KISMA_DK = 30;

export type AiHataDetay = {
  status?: number | null;
  type?: string | null;
  message?: string | null;
};

type Kategori = "kredi" | "kimlik" | "diger";

// Geçici hatalar (429/5xx/timeout) mail tetiklemez — yalnız insan müdahalesi
// gerektiren kalıcı hatalar (para/anahtar) "kredi"/"kimlik" sayılır.
function kategorile(d: AiHataDetay): Kategori {
  const msg = (d.message ?? "").toLowerCase();
  if (
    msg.includes("credit balance") ||
    msg.includes("too low") ||
    msg.includes("billing") ||
    msg.includes("purchase credits") ||
    d.type === "billing_error"
  )
    return "kredi";
  if (d.status === 401 || d.type === "authentication_error") return "kimlik";
  return "diger";
}

const KONU: Record<Exclude<Kategori, "diger">, string> = {
  kredi: "🔴 AYNA durdu: Anthropic kredisi bitti",
  kimlik: "🔴 AYNA durdu: API anahtarı geçersiz",
};

const ACIKLAMA: Record<Exclude<Kategori, "diger">, string> = {
  kredi:
    "Anthropic API kredisi tükendi. AYNA'nın TÜM yapay zekâ özellikleri (Pusula, görev üretimi, koç, rapor, ses mektubu…) şu an çalışmıyor. Anthropic Console → Plans & Billing'den kredi yükleyin; kredi girer girmez deploy gerekmeden kendiliğinden düzelir.",
  kimlik:
    "Anthropic API anahtarı reddedildi (401). Railway'deki ANTHROPIC_API_KEY değerinin geçerli olduğunu kontrol edin.",
};

/** Kritik bir AI hatasını admin'e e-posta ile bildirir (kısma korumalı).
 *  Alarm yolunun kendisi asla ana akışı bozmaz — her şey try içinde yutulur. */
export async function kritikAiHatasiBildir(
  db: Db,
  kaynak: string,
  detay: AiHataDetay
): Promise<void> {
  const kategori = kategorile(detay);
  if (kategori === "diger") return;

  const anahtar = `uyari_son_${kategori}`;
  try {
    const { data } = await db
      .from("settings")
      .select("value")
      .eq("key", anahtar)
      .maybeSingle();
    const son = data?.value ? Number(data.value) : 0;
    const simdi = Date.now();
    if (Number.isFinite(son) && simdi - son < KISMA_DK * 60_000) return;

    const konu = KONU[kategori];
    const ham = (detay.message ?? "").slice(0, 300);
    const metin = `${ACIKLAMA[kategori]}\n\nKaynak: ${kaynak}\nTeknik ayrıntı: ${ham}`;
    const html = `<div style="font-family:system-ui,Segoe UI,sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#dc2626;margin:0 0 12px">${konu}</h2>
        <p style="line-height:1.6;color:#1e293b">${ACIKLAMA[kategori]}</p>
        <p style="font-size:13px;color:#64748b;margin:16px 0 4px">Kaynak: <b>${kaynak}</b></p>
        <pre style="font-size:12px;background:#f1f5f9;padding:10px;border-radius:8px;white-space:pre-wrap;color:#475569;margin:0">${ham}</pre>
      </div>`;

    const ok = await uyariEpostasiGonder(konu, metin, html);
    if (ok) {
      await db.from("settings").upsert({
        key: anahtar,
        value: String(simdi),
        updated_at: new Date().toISOString(),
      });
    }
  } catch {
    // alarm yolu sessizce başarısız olsun; ana akışı asla bozmasın
  }
}

/** AI çağrısı hatasını HEM audit_log'a yazar HEM kritikse admin'e bildirir.
 *  Kendi *HataKaydet helper'ı olmayan modüller (ör. görev üretimi) için. */
export async function aiHataYakala(
  db: Db,
  kaynak: string,
  e: unknown
): Promise<void> {
  const x = e as {
    status?: number;
    name?: string;
    message?: string;
    error?: { type?: string; message?: string };
  };
  const detay: AiHataDetay = {
    status: x?.status ?? null,
    type: x?.error?.type ?? x?.name ?? null,
    message: (x?.error?.message ?? x?.message ?? String(e)).slice(0, 300),
  };
  try {
    await db
      .from("audit_log")
      .insert({ eylem: "ai_hata", detay: { kaynak, ...detay } });
  } catch {}
  await kritikAiHatasiBildir(db, kaynak, detay);
}

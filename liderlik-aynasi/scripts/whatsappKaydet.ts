// PD101 WhatsApp ŞABLON KAYIT SCRIPTİ
// WA_SABLONLAR'daki her şablonu Twilio Content API'ye oluşturur, WhatsApp (Meta)
// onayına gönderir ve dönen ContentSid'i settings tablosuna yazar (uygulama
// gönderirken oradan okur). Onay asenkrondur (dakikalar–24 saat); bu script
// onayı BAŞLATIR, durumu Twilio Console'dan ya da tekrar çalıştırarak izlersin.
//
// Çalıştırma (.env.local otomatik okunur):
//   npx tsx scripts/whatsappKaydet.ts
// Gerekli env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
//              SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (veya SUPABASE_SECRET_KEY)

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { WA_SABLONLAR, twilioTipleri } from "../lib/whatsappSablonlari";

// .env.local'i en iyi çabayla yükle (Next dışı çalışmada otomatik gelmez).
// npm run ile çalışırken cwd paket köküdür; doğrudan tsx için de oradan dener.
try {
  const metin = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const satir of metin.split("\n")) {
    const eslesme = satir.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (eslesme && !process.env[eslesme[1]]) {
      process.env[eslesme[1]] = eslesme[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {
  /* .env.local yoksa env'den okunur */
}

const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!SID || !TOKEN) {
  console.error("✖ TWILIO_ACCOUNT_SID ve TWILIO_AUTH_TOKEN gerekli.");
  process.exit(1);
}

const yetki = `Basic ${Buffer.from(`${SID}:${TOKEN}`).toString("base64")}`;
// Supabase opsiyonel: service-role anahtarı yoksa (yerelde boş olabilir) script
// yine Twilio'ya kaydeder ve ContentSid'leri yazdırır; settings'e elle/MCP ile yazılır.
const db = SUPA_URL && SUPA_KEY ? createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } }) : null;

async function contentOlustur(sablon: (typeof WA_SABLONLAR)[number]): Promise<string> {
  const res = await fetch("https://content.twilio.com/v1/Content", {
    method: "POST",
    headers: { authorization: yetki, "content-type": "application/json" },
    body: JSON.stringify({
      friendly_name: sablon.friendlyName,
      language: sablon.dil,
      variables: sablon.ornek,
      types: twilioTipleri(sablon),
    }),
  });
  const veri = await res.json();
  if (!res.ok) throw new Error(`Content oluşturma başarısız: ${JSON.stringify(veri)}`);
  return veri.sid as string;
}

async function onayaGonder(contentSid: string, sablon: (typeof WA_SABLONLAR)[number]) {
  const res = await fetch(
    `https://content.twilio.com/v1/Content/${contentSid}/ApprovalRequests/whatsapp`,
    {
      method: "POST",
      headers: { authorization: yetki, "content-type": "application/json" },
      body: JSON.stringify({ name: sablon.friendlyName, category: sablon.kategori }),
    }
  );
  const veri = await res.json();
  if (!res.ok) throw new Error(`Onay isteği başarısız: ${JSON.stringify(veri)}`);
  return veri;
}

async function main() {
  console.log(`\n📤 PD101 WhatsApp şablonları kaydediliyor (${WA_SABLONLAR.length} adet)\n`);

  const sidler: Record<string, string> = {};
  for (const sablon of WA_SABLONLAR) {
    // Zaten kayıtlıysa (settings'te sid var) tekrar oluşturma.
    if (db) {
      const { data: mevcut } = await db
        .from("settings")
        .select("value")
        .eq("key", sablon.ayarAnahtari)
        .maybeSingle();
      if (mevcut?.value) {
        console.log(`• ${sablon.friendlyName}: zaten kayıtlı (${mevcut.value}) — atlandı`);
        continue;
      }
    }

    try {
      const contentSid = await contentOlustur(sablon);
      const onay = await onayaGonder(contentSid, sablon);
      sidler[sablon.ayarAnahtari] = contentSid;
      if (db) {
        await db.from("settings").upsert({
          key: sablon.ayarAnahtari,
          value: contentSid,
          updated_at: new Date().toISOString(),
        });
      }
      console.log(
        `✓ ${sablon.friendlyName}: ${contentSid} → onaya gönderildi (durum: ${onay.status ?? "submitted"})`
      );
    } catch (e) {
      console.error(`✖ ${sablon.friendlyName}: ${(e as Error).message}`);
    }
  }

  if (!db && Object.keys(sidler).length > 0) {
    console.log("\n⚠ Supabase yazılmadı (service-role yok). Bu ContentSid'leri settings'e ekle:");
    for (const [k, v] of Object.entries(sidler)) console.log(`  ${k} = ${v}`);
  }

  console.log(
    "\nOnay asenkron. Durumu Twilio Console > Content Template Builder'dan izle.\n" +
      "Onaylananlar uygulamadan otomatik gönderilebilir.\n"
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

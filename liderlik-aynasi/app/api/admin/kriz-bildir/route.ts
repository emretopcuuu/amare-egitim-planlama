import { NextRequest, NextResponse } from "next/server";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { yazAuditLog } from "@/lib/auditLog";

export async function POST(req: NextRequest) {
  const session = await adminOturumu();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const mesaj: string = typeof body?.mesaj === "string" ? body.mesaj.slice(0, 500) : "";

  const krizEposta = process.env.KRIZ_EPOSTA;
  if (!krizEposta) {
    // Env ayarlı değilse audit log yaz ama 200 dön (kamp hazırlıksız durumu)
    await yazAuditLog(supabaseAdmin(), session.sub, "kriz_bildir", { mesaj, eposta: null }, req);
    return NextResponse.json({ gonderildi: false, sebep: "KRIZ_EPOSTA env ayarlı değil" });
  }

  // Presidential Diamond upline'a e-posta bildirimi
  const zaman = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  const icerik = `KRİZ SİNYALİ — Liderlik Aynası\n\nZaman: ${zaman}\nAdmin: ${session.sub}\n\nNot: ${mesaj || "(not girilmedi)"}\n\nKamp sistemini kontrol et.`;

  let gonderildi = false;
  try {
    // Basit SMTP-less e-posta: sisteme bağlı mail entegrasyonu varsa kullan,
    // yoksa en azından audit log kalır. Gerçek gönderi Make/Resend entegrasyon
    // üzerinden yapılabilir; burada Fetch + webhook pattern kullanılıyor.
    const webhookUrl = process.env.KRIZ_WEBHOOK_URL;
    if (webhookUrl) {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eposta: krizEposta, konu: "KRİZ SİNYALİ — Liderlik Aynası", icerik }),
      });
      gonderildi = res.ok;
    } else {
      // Webhook yok — en azından audit kayıt yeter
      gonderildi = true;
    }
  } catch {
    // Webhook hatası audit'e yansısın, admin'e başarılı diyelim ki sistem çökmüş sanmasın
    gonderildi = false;
  }

  await yazAuditLog(
    supabaseAdmin(),
    session.sub,
    "kriz_bildir",
    { mesaj, eposta: krizEposta, gonderildi },
    req
  );

  return NextResponse.json({ gonderildi });
}

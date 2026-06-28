import { adminOturumu } from "@/lib/auth/admin";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

const ONAY = "YENİ KAMP";

// Çok katılımcılı kampta cascade silme uzun sürebilir — varsayılan fonksiyon
// süresine sığmayıp UI'da yanlış "başarısız" göstermesin diye süreyi uzatıyoruz.
export const maxDuration = 60;

// #4 — Yeni kamp hazırla (güvenli sıfırlama). TÜM katılımcı verisini ve kamp
// durumunu siler; yapı (özellikler, dalga satırları, admin) korunur. Yardımcı
// görevli YAPAMAZ — yalnız tam yetkili admin + yazılı onay.
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }
  const session = await getSession();
  if (session?.rol !== "admin") {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || body.onay !== ONAY) {
    return Response.json({ hata: "Onay metni hatalı." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db.rpc("yeni_kamp_hazirla");
  if (error) {
    // Doğru mesaj — eskiden CSV import'tan ödünç "İçe aktarma başarısız" yazıyordu.
    return Response.json(
      { hata: "Sıfırlama tamamlanamadı. Lütfen tekrar dene." },
      { status: 500 }
    );
  }
  // İz bırak (kim, ne zaman sıfırladı).
  try {
    await db.from("audit_log").insert({ eylem: "yeni_kamp_hazirla", detay: { kim: session.ad } });
  } catch {}

  return Response.json({ ok: true });
}

import { clearSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export async function POST() {
  await clearSession();
  return Response.json({ ok: true });
}

// GET: sunucu bileşeninden redirect ile çağrılabilir (çerez silme için).
// ?cikis=1 → GirisForm hatırlanan kodu siler + sessiz yeniden girişi atlar
// (yoksa çıkış yapan kişi anında geri girer).
export async function GET() {
  await clearSession();
  redirect("/giris?cikis=1");
}

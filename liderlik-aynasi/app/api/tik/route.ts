import { supabaseAdmin } from "@/lib/supabase/server";
import { tikCalistir } from "@/lib/tik";

export const maxDuration = 60;

// AYNA'nın kalp atışı. Supabase pg_cron 5 dakikada bir çağırır (gizli başlıkla).
// GERÇEK zamanla çalışır; mantık lib/tik.ts'te (admin prova yolu da onu kullanır).
export async function POST(req: Request) {
  const beklenen = process.env.AYNA_TIK_SECRET;
  if (!beklenen || req.headers.get("x-ayna-anahtar") !== beklenen) {
    return Response.json({ hata: "Yetkisiz." }, { status: 401 });
  }

  // Admin'in elle bastığı test tiki sessiz saati yok sayar (gece prova yapılabilsin);
  // cron'dan gelen olağan tikler kurala uyar.
  const testModu = req.headers.get("x-ayna-test") === "1";

  const sonuc = await tikCalistir(supabaseAdmin(), new Date(), testModu);
  return Response.json(sonuc);
}

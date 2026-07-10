import { supabaseAdmin } from "@/lib/supabase/server";
import { tikCalistir } from "@/lib/tik";
import { provaDurum, provaSanalSaat } from "@/lib/prova";

// #4: kümelenmiş paralel dağıtım (lib/tik.ts) tik'i 60s içinde tutmayı hedefler
// ama etkinlik-sonrası patlamada bir küme yavaş AI'ya denk gelirse pay kalsın
// diye 120s. Netlify standart fonksiyon tavanına (bkz. plan) kadar geçerli.
export const maxDuration = 120;

// AYNA'nın kalp atışı. Supabase pg_cron 5 dakikada bir çağırır (gizli başlıkla).
// GERÇEK zamanla çalışır; mantık lib/tik.ts'te (admin prova yolu da onu kullanır).
export async function POST(req: Request) {
  const beklenen = process.env.AYNA_TIK_SECRET;
  if (!beklenen || req.headers.get("x-ayna-anahtar") !== beklenen) {
    return Response.json({ hata: "Yetkisiz." }, { status: 401 });
  }

  const db = supabaseAdmin();

  // PROVA KAMPI aktifse cron tiki de SANAL saatle çalışır — yoksa gerçek-zaman
  // tiki prova akışıyla çakışır. Prova kapalıyken olağan gerçek-zaman davranışı.
  const durum = await provaDurum(db);
  if (durum.aktif) {
    const sanal = provaSanalSaat(durum, new Date());
    if (sanal) {
      const sonuc = await tikCalistir(db, sanal, true, true);
      return Response.json(sonuc);
    }
  }

  // Admin'in elle bastığı test tiki sessiz saati yok sayar; cron tikleri kurala uyar.
  const testModu = req.headers.get("x-ayna-test") === "1";
  const sonuc = await tikCalistir(db, new Date(), testModu);
  return Response.json(sonuc);
}

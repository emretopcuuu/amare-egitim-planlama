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

  // ÇAKIŞMA KİLİDİ: etkinlik-sonrası patlamada bir tik yavaş AI'ya takılıp 5 dk'yı
  // aşarsa bir sonraki cron tiki üstüne biner ve aynı kişilere ÇİFT görev/ÇİFT push
  // üretir (maxDuration Railway'de uygulanmaz). Taze (<8 dk) bir kilit varsa bu tiki
  // atla; kilit start-zamanı taşır, iş bitince silinir. Kilit çift-tetiklemeye karşı
  // savunmadır; 8 dk'dan eski (çökmüş tik) kilidi bir sonraki tik devralır.
  const KILIT = "tik_kilit";
  const { data: mevcutKilit } = await db.from("settings").select("value").eq("key", KILIT).maybeSingle();
  if (mevcutKilit?.value) {
    const yasMs = Date.now() - new Date(mevcutKilit.value).getTime();
    if (yasMs >= 0 && yasMs < 8 * 60_000) {
      return Response.json({ ozet: "Önceki tik hâlâ çalışıyor — atlandı", atlandi: true });
    }
  }
  await db.from("settings").upsert({ key: KILIT, value: new Date().toISOString() });

  try {
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
  } finally {
    // Kilidi her durumda bırak (hata/erken dönüş dahil) — bir sonraki tik beklemesin.
    await db.from("settings").delete().eq("key", KILIT);
  }
}

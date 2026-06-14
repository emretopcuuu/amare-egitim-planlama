import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { karakterUretimBaslat } from "@/lib/karakter";
import { higgsYapilandirildiMi } from "@/lib/higgs";

export const maxDuration = 60;

// Admin toplu "üret": seçili katılımcılar için karakter videosu üretimini başlatır.
// Üretimi anında tetikler (uretiliyor + request_id); tamamlanmayı tik poll'u bitirir.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "admin") {
    return Response.json({ hata: "Yetki yok" }, { status: 401 });
  }
  if (!higgsYapilandirildiMi()) {
    return Response.json({ hata: "Higgsfield yapılandırılmadı" }, { status: 503 });
  }

  const govde = (await req.json().catch(() => null)) as { idler?: unknown } | null;
  const idler = Array.isArray(govde?.idler)
    ? govde!.idler.filter((x): x is string => typeof x === "string").slice(0, 50)
    : [];
  if (idler.length === 0) {
    return Response.json({ hata: "Katılımcı seçilmedi" }, { status: 400 });
  }

  const db = supabaseAdmin();
  let baslatildi = 0;
  let hata = 0;
  let girdiYok = 0;
  for (const pid of idler) {
    const sonuc = await karakterUretimBaslat(db, pid);
    if (sonuc === "uretiliyor") baslatildi++;
    else if (sonuc === "girdi_yok") girdiYok++;
    else hata++;
  }

  return Response.json({ ok: true, baslatildi, hata, girdiYok });
}

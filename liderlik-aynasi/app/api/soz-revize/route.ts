import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sozRevizeEt, taniklar } from "@/lib/soz";
import { katilimciyaBildir } from "@/lib/push";

// [B#13] SÖZ REVİZYONU — kişi mühürlü sözünü BİR KEZ yeniler. Başarılıysa
// KABUL etmiş şahitlerine "sözünü yeniledi" haberi gider.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "yetkisiz" }, { status: 401 });
  }
  let g: { metin?: unknown };
  try {
    g = await req.json();
  } catch {
    return Response.json({ hata: "geçersiz" }, { status: 400 });
  }
  if (typeof g.metin !== "string" || !g.metin.trim()) {
    return Response.json({ hata: "geçersiz" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const ok = await sozRevizeEt(db, session.sub, g.metin);
  if (!ok) return Response.json({ ok: false, sebep: "zaten_yenilendi" });

  const ilkAd = session.ad.split(" ")[0];
  const sahitler = (await taniklar(db, session.sub)).filter((t) => t.durum === "kabul");
  for (const s of sahitler) {
    await katilimciyaBildir(
      db,
      s.witness_id,
      "🤝 Şahidin sözünü yeniledi",
      `${ilkAd} yolun 30. gününde sözünü güncelledi. Yeni sözünü gör.`,
      "/sahitlik"
    ).catch(() => {});
  }
  return Response.json({ ok: true });
}

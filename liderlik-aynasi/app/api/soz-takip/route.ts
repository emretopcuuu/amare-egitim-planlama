import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { checkin, takipDurum, haftalikSayilar, kayitBildir } from "@/lib/sozTakip";
import { hedefCekirdek } from "@/lib/hedef";
import { haftalikGorusmeKotasi } from "@/lib/oyunPlani";

// 90 gün takip — GET: durum (seri, son14, kaçırılan) + haftalık sayılar/kota.
// POST: günlük check-in (yapıldı + FAZ 3/4: görüşme sayısı + kayıt sayısı).
export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "yetkisiz" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const [durum, hafta, hedef] = await Promise.all([
    takipDurum(db, session.sub),
    haftalikSayilar(db, session.sub),
    hedefCekirdek(db, session.sub),
  ]);
  const kota = haftalikGorusmeKotasi(hedef?.plan?.haftalikSaat ?? null);
  return Response.json({ ...durum, hafta, kota });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "yetkisiz" }, { status: 401 });
  }
  let g: { yapildi?: unknown; notlar?: unknown; gorusmeSayisi?: unknown; kayitSayisi?: unknown };
  try {
    g = await req.json();
  } catch {
    return Response.json({ hata: "geçersiz" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const kayitSayisi = typeof g.kayitSayisi === "number" ? g.kayitSayisi : 0;
  const ok = await checkin(
    db,
    session.sub,
    g.yapildi !== false,
    typeof g.notlar === "string" ? g.notlar : null,
    typeof g.gorusmeSayisi === "number" ? g.gorusmeSayisi : null,
    kayitSayisi
  );
  if (!ok) return Response.json({ hata: "kayit" }, { status: 500 });

  // KAYIT ZİLİ (#6) — kayıt girildiyse şahitlere anında müjde push'u.
  if (kayitSayisi > 0) {
    try {
      await kayitBildir(db, session.sub, session.ad);
    } catch {
      // push yapılandırılmamış olabilir — check-in yine de kaydedildi
    }
  }

  const [durum, hafta, hedef] = await Promise.all([
    takipDurum(db, session.sub),
    haftalikSayilar(db, session.sub),
    hedefCekirdek(db, session.sub),
  ]);
  const kota = haftalikGorusmeKotasi(hedef?.plan?.haftalikSaat ?? null);
  return Response.json({ ok: true, durum, hafta, kota, kayitZili: kayitSayisi > 0 });
}

import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  hedefTuru,
  hedefDurum,
  hedefGecmis,
  baslangicKaydet,
  hedefSifirla,
  kariyerPlaniKaydet,
} from "@/lib/hedef";
import { tr } from "@/lib/i18n/tr";

// FAZ A Hedef — GET: durum + geçmiş. POST: başlangıç / sohbet turu / kariyer / sıfırla.

export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.hedef.hata }, { status: 401 });
  }
  const db = supabaseAdmin();
  const [durum, gecmis] = await Promise.all([
    hedefDurum(db, session.sub),
    hedefGecmis(db, session.sub),
  ]);
  return Response.json({ durum, gecmis });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.hedef.hata }, { status: 401 });
  }

  let govde: {
    mesaj?: unknown;
    baslangic?: { nokta?: unknown; deneyimAy?: unknown; detay?: unknown };
    kariyer?: { hedefIndex?: unknown; sure?: unknown; gunluk?: unknown };
    sifirla?: unknown;
  };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.hedef.hata }, { status: 400 });
  }

  const db = supabaseAdmin();
  const katilimci = { id: session.sub, full_name: session.ad };

  // 0) Sıfırla: baştan başla.
  if (govde.sifirla === true) {
    await hedefSifirla(db, session.sub);
    return Response.json({ ok: true });
  }

  // 1) Başlangıç noktası FORM'u: kaydet, sohbet 'hedef' ile açılır.
  if (govde.baslangic && typeof govde.baslangic.nokta === "string") {
    const deneyimAy =
      typeof govde.baslangic.deneyimAy === "number" ? govde.baslangic.deneyimAy : null;
    const detay = typeof govde.baslangic.detay === "string" ? govde.baslangic.detay : null;
    const ok = await baslangicKaydet(db, session.sub, govde.baslangic.nokta, deneyimAy, detay);
    if (!ok) return Response.json({ hata: tr.hedef.hata }, { status: 400 });
    return Response.json({ ok: true });
  }

  // 2) SOMUTLAŞTIRMA: kariyer hedefi + süre + günlük saat → plan hesapla + mühürle.
  if (govde.kariyer && typeof govde.kariyer.hedefIndex === "number") {
    const sure = typeof govde.kariyer.sure === "string" ? govde.kariyer.sure : "";
    const gunluk = typeof govde.kariyer.gunluk === "string" ? govde.kariyer.gunluk : "";
    const plan = await kariyerPlaniKaydet(
      db,
      katilimci,
      govde.kariyer.hedefIndex,
      sure,
      gunluk
    );
    if (!plan) return Response.json({ hata: tr.hedef.hata }, { status: 400 });
    return Response.json({ ok: true, plan });
  }

  // 3) Isınma sohbeti turu: açılış (mesaj yok) veya kullanıcı yanıtı.
  const mesaj = typeof govde.mesaj === "string" ? govde.mesaj : null;
  const tur = await hedefTuru(db, katilimci, mesaj);
  if (!tur) return Response.json({ hata: tr.hedef.aiHata }, { status: 503 });
  return Response.json(tur);
}

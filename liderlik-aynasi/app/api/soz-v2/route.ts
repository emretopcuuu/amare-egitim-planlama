import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { katilimciyaBildir } from "@/lib/push";
import {
  sozGetir,
  sozSekillendir,
  sozMetinKaydet,
  taniklar,
  tanikEkle,
  tanikSil,
  tanikKabul,
  tanikRet,
  bekleyenImzalar,
  sozV2KapisiAcik,
  TANIK_HEDEF,
  type SozAksiyon,
} from "@/lib/soz";

// SÖZ v2 — GET: söz durumu + şahitler + bekleyen imzalar + seçilebilir liderler.
// POST: sekillendir / kaydet / tanikEkle / tanikSil / imza.

export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "yetkisiz" }, { status: 401 });
  }
  const db = supabaseAdmin();
  const [acik, soz, tanikList, bekleyen, { data: liderler }] = await Promise.all([
    sozV2KapisiAcik(db),
    sozGetir(db, session.sub),
    taniklar(db, session.sub),
    bekleyenImzalar(db, session.sub),
    db
      .from("participants")
      .select("id, full_name, team")
      .eq("role", "participant")
      .neq("id", session.sub)
      .order("full_name"),
  ]);
  return Response.json({ acik, soz, taniklar: tanikList, bekleyenImzalar: bekleyen, liderler: liderler ?? [] });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: "yetkisiz" }, { status: 401 });
  }
  let g: {
    sekillendir?: unknown;
    kaydet?: { metin?: unknown; aksiyonlar?: unknown };
    tanikEkle?: unknown;
    tanikSil?: unknown;
    imza?: unknown;
    kabul?: unknown; // şahit daveti KABUL (sahibiId)
    ret?: unknown; // şahit daveti RET (sahibiId)
  };
  try {
    g = await req.json();
  } catch {
    return Response.json({ hata: "geçersiz" }, { status: 400 });
  }
  const db = supabaseAdmin();

  if (g.sekillendir === true) {
    const sonuc = await sozSekillendir(db, session.sub, session.ad);
    return Response.json(sonuc);
  }

  if (g.kaydet && typeof g.kaydet.metin === "string") {
    const aksiyonlar = Array.isArray(g.kaydet.aksiyonlar)
      ? (g.kaydet.aksiyonlar as SozAksiyon[])
      : [];
    const ok = await sozMetinKaydet(db, session.sub, g.kaydet.metin, aksiyonlar);
    return Response.json({ ok });
  }

  if (typeof g.tanikEkle === "string") {
    const r = await tanikEkle(db, session.sub, g.tanikEkle);
    if (r.ok) {
      // Seçilen şahide ANINDA haber ver — uygulamayı açmasa da yakalansın.
      try {
        await katilimciyaBildir(
          db,
          g.tanikEkle,
          "🤝 Bir söze şahit gösterildin",
          `${session.ad} seni sözüne şahit gösterdi. Sözünü aç, gör ve imzala.`,
          "/sahitlik"
        );
      } catch {
        // yut — bildirim düşse de şahitlik kaydı durur
      }
    }
    return Response.json(r, { status: r.ok ? 200 : 409 });
  }

  if (typeof g.tanikSil === "string") {
    await tanikSil(db, session.sub, g.tanikSil);
    return Response.json({ ok: true });
  }

  // KABUL: oturum sahibi (lider), kendisini şahit gösteren kişinin davetini kabul
  // eder → gerçek şahit olur, imza damgalanır. ("imza" eski isim, aynı işi yapar.)
  const kabulHedef =
    typeof g.kabul === "string" ? g.kabul : typeof g.imza === "string" ? g.imza : null;
  if (kabulHedef) {
    const ok = await tanikKabul(db, kabulHedef, session.sub);
    // [FAZ 8 · Madde 15] KABUL ANI: söz SAHİBİNE haber ver. 5/5 kabul tamamlanınca
    // "sözün tam mühürlendi" töreni push'u.
    if (ok) {
      const ilkAd = session.ad.split(" ")[0];
      const { count: kabulEden } = await db
        .from("soz_tanik")
        .select("id", { count: "exact", head: true })
        .eq("soz_sahibi", kabulHedef)
        .eq("durum", "kabul");
      const tumu = (kabulEden ?? 0) >= TANIK_HEDEF;
      await katilimciyaBildir(
        db,
        kabulHedef,
        tumu ? "🔒 Sözün mühürlendi" : "🤝 Bir şahidin kabul etti",
        tumu
          ? `${ilkAd} de kabul etti — ${TANIK_HEDEF} şahidin tamamlandı. Sözün artık tam mühürlü.`
          : `${ilkAd} sözüne şahit olmayı kabul etti. Mührün güçleniyor.`,
        "/sozum"
      ).catch(() => {});
    }
    return Response.json({ ok });
  }

  // RET: lider daveti reddeder → slot boşalır. Söz sahibine "yerine yeni şahit
  // seç" haberi gider; sahibin yolculuk kapısı yeniden şahit seçimine döner.
  if (typeof g.ret === "string") {
    const ok = await tanikRet(db, g.ret, session.sub);
    if (ok) {
      const ilkAd = session.ad.split(" ")[0];
      await katilimciyaBildir(
        db,
        g.ret,
        "🤝 Bir şahit yerine yeni birini seç",
        `${ilkAd} şu an şahidin olamadı. Yerine başka bir lider seç — sözün 5 şahitle mühürlensin.`,
        "/sozum"
      ).catch(() => {});
    }
    return Response.json({ ok });
  }

  return Response.json({ hata: "geçersiz" }, { status: 400 });
}

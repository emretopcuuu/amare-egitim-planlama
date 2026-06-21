import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  sozGetir,
  sozSekillendir,
  sozMetinKaydet,
  taniklar,
  tanikEkle,
  tanikSil,
  tanikImzala,
  bekleyenImzalar,
  sozV2KapisiAcik,
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
    return Response.json(r, { status: r.ok ? 200 : 409 });
  }

  if (typeof g.tanikSil === "string") {
    await tanikSil(db, session.sub, g.tanikSil);
    return Response.json({ ok: true });
  }

  // İmza: oturum sahibi (lider), kendisini şahit gösteren kişinin sözünü imzalar.
  if (typeof g.imza === "string") {
    const ok = await tanikImzala(db, g.imza, session.sub);
    return Response.json({ ok });
  }

  return Response.json({ hata: "geçersiz" }, { status: 400 });
}

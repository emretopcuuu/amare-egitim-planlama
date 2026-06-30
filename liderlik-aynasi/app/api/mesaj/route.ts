import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { mesajGonder, okunmamisMesaj, uyeSohbeti, yonetimSohbeti, YONETIM } from "@/lib/icMesaj";

export const dynamic = "force-dynamic";

// GET: ?sohbet=<id|"yonetim"> → o sohbetin mesajları (canlı yoklama).
//      (parametre yoksa) → okunmamış iç mesaj sayısı (menü/çip rozeti).
export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return NextResponse.json({ okunmamis: 0 }, { status: 401 });
  }
  const db = supabaseAdmin();
  const sohbet = new URL(req.url).searchParams.get("sohbet");
  if (sohbet) {
    if (sohbet === YONETIM) {
      return NextResponse.json({ mesajlar: await yonetimSohbeti(db, session.sub) });
    }
    // Aynı gruptan mı? (yetki sızması olmasın)
    const [{ data: ben }, { data: diger }] = await Promise.all([
      db.from("participants").select("team").eq("id", session.sub).maybeSingle(),
      db.from("participants").select("team, role").eq("id", sohbet).maybeSingle(),
    ]);
    if (!ben?.team || !diger || diger.role !== "participant" || diger.team !== ben.team) {
      return NextResponse.json({ mesajlar: [] }, { status: 403 });
    }
    return NextResponse.json({ mesajlar: await uyeSohbeti(db, session.sub, sohbet) });
  }
  return NextResponse.json({ okunmamis: await okunmamisMesaj(db, session.sub) });
}

// Katılımcı mesaj gönderir: grup arkadaşına (hedef=id) veya yönetime (hedef="yonetim").
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return NextResponse.json({ tamam: false }, { status: 401 });
  }
  let gov4: { hedef?: string; govde?: string };
  try {
    gov4 = (await req.json()) as { hedef?: string; govde?: string };
  } catch {
    return NextResponse.json({ tamam: false, hata: "Geçersiz istek." }, { status: 400 });
  }
  const { hedef, govde } = gov4;
  if (!hedef || typeof govde !== "string") {
    return NextResponse.json({ tamam: false, hata: "Eksik alan." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: ben } = await db
    .from("participants")
    .select("full_name, team")
    .eq("id", session.sub)
    .maybeSingle();
  if (!ben) return NextResponse.json({ tamam: false }, { status: 401 });

  if (hedef === YONETIM) {
    const r = await mesajGonder(db, session.sub, ben.full_name, { yonetim: true }, govde);
    return NextResponse.json(r, { status: r.tamam ? 200 : 400 });
  }

  // Grup arkadaşı: alıcı GERÇEKTEN aynı takımda mı? (yetki sızması olmasın)
  const { data: alici } = await db
    .from("participants")
    .select("id, team, role")
    .eq("id", hedef)
    .maybeSingle();
  if (
    !alici ||
    alici.role !== "participant" ||
    !ben.team ||
    alici.team !== ben.team ||
    alici.id === session.sub
  ) {
    return NextResponse.json({ tamam: false, hata: "Bu kişiye mesaj gönderemezsin." }, { status: 403 });
  }

  const r = await mesajGonder(db, session.sub, ben.full_name, { aliciId: hedef }, govde);
  return NextResponse.json(r, { status: r.tamam ? 200 : 400 });
}

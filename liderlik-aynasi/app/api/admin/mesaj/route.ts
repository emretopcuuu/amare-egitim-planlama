import { NextResponse } from "next/server";
import { yetkiliOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { mesajGonder, adminKisiSohbeti, adminOkunmamis } from "@/lib/icMesaj";

export const dynamic = "force-dynamic";

// GET: ?sohbet=<kisiId> → yönetim↔kişi sohbeti (canlı yoklama).
//      (parametre yoksa) → yönetime gelen toplam okunmamış (nav rozeti).
export async function GET(req: Request) {
  const session = await yetkiliOturumu();
  if (!session) return NextResponse.json({ okunmamis: 0 }, { status: 401 });
  const db = supabaseAdmin();
  const sohbet = new URL(req.url).searchParams.get("sohbet");
  if (sohbet) {
    return NextResponse.json({ mesajlar: await adminKisiSohbeti(db, sohbet) });
  }
  return NextResponse.json({ okunmamis: await adminOkunmamis(db) });
}

// Kamp yönetimi bir katılımcıya cevap yazar. Mesaj katılımcıya bildirim olarak
// düşer ("Kamp yönetiminden mesaj"). Gönderen = yönetim (gonderen_admin=true).
export async function POST(req: Request) {
  const session = await yetkiliOturumu();
  if (!session) return NextResponse.json({ tamam: false }, { status: 401 });

  let veri: { kisiId?: string; govde?: string };
  try {
    veri = (await req.json()) as { kisiId?: string; govde?: string };
  } catch {
    return NextResponse.json({ tamam: false, hata: "Geçersiz istek." }, { status: 400 });
  }
  const { kisiId, govde } = veri;
  if (!kisiId || typeof govde !== "string") {
    return NextResponse.json({ tamam: false, hata: "Eksik alan." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: alici } = await db
    .from("participants")
    .select("id, role")
    .eq("id", kisiId)
    .maybeSingle();
  if (!alici || alici.role !== "participant") {
    return NextResponse.json({ tamam: false, hata: "Katılımcı bulunamadı." }, { status: 404 });
  }

  const r = await mesajGonder(db, session.sub, session.ad ?? "Yönetim", { aliciId: kisiId }, govde, true);
  return NextResponse.json(r, { status: r.tamam ? 200 : 400 });
}

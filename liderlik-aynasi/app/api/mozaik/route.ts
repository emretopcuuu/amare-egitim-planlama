import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { mozaikAcikMi, parcaEkle } from "@/lib/mozaik";
import { tr } from "@/lib/i18n/tr";

// B3 — Mozaik parçası yükleme ucu (multipart). Katılımcının grubunun mozaiğine
// tek foto parçası ekler → 'sesler' bucket mozaik/{grup}-{pid}.{ext}. Kişi başına
// tek parça (upsert). Yalnız mozaik_acik iken.

export const maxDuration = 60;

const AZAMI = 6 * 1024 * 1024; // 6 MB

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return NextResponse.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const db = supabaseAdmin();
  if (!(await mozaikAcikMi(db))) {
    return NextResponse.json({ hata: tr.mozaik.kapali }, { status: 403 });
  }

  const { data: kisi } = await db
    .from("participants")
    .select("team")
    .eq("id", session.sub)
    .maybeSingle();
  const grup = kisi?.team?.trim();
  if (!grup) return NextResponse.json({ hata: tr.mozaik.grupYok }, { status: 400 });

  const form = await req.formData();
  const dosya = form.get("dosya");
  if (!(dosya instanceof File) || dosya.size === 0) {
    return NextResponse.json({ hata: tr.mozaik.hata }, { status: 400 });
  }
  if (dosya.size > AZAMI) return NextResponse.json({ hata: tr.mozaik.buyuk }, { status: 413 });

  let uzanti: string | null = null;
  if (dosya.type === "image/jpeg") uzanti = "jpg";
  else if (dosya.type === "image/png") uzanti = "png";
  else if (dosya.type === "image/webp") uzanti = "webp";
  if (!uzanti) return NextResponse.json({ hata: tr.mozaik.hata }, { status: 415 });

  const yol = `mozaik/${session.sub}.${uzanti}`;
  const yukleme = await db.storage
    .from("sesler")
    .upload(yol, dosya, { contentType: dosya.type, upsert: true });
  if (yukleme.error) {
    console.error("[mozaik] upload error:", yukleme.error.message);
    return NextResponse.json({ hata: tr.mozaik.hata }, { status: 500 });
  }

  const ok = await parcaEkle(db, session.sub, grup, yol);
  if (!ok) return NextResponse.json({ hata: tr.mozaik.hata }, { status: 500 });
  return NextResponse.json({ ok: true });
}

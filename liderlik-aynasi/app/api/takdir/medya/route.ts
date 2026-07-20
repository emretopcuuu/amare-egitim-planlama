import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// A9 + A3 — Takdir medyası ucu (multipart). Foto (image) ya da kısa ses kaydı
// alır → 'sesler' bucket'ında takdir/{pid}-{uuid}.{ext} → { yol } döner. Takdir
// gönderimi (POST /api/takdir) bu yolu foto_path/ses_path olarak taşır.
// Not: yalnız yol döner, kayıt burada YAZILMAZ (takdir asıl POST'ta oluşur).

export const maxDuration = 60;

const FOTO_AZAMI = 6 * 1024 * 1024; // 6 MB
const SES_AZAMI = 6 * 1024 * 1024; // ~30 sn webm/mp4

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return NextResponse.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }

  const form = await req.formData();
  const tur = form.get("tur"); // "foto" | "ses"
  const dosya = form.get("dosya");
  if ((tur !== "foto" && tur !== "ses") || !(dosya instanceof File) || dosya.size === 0) {
    return NextResponse.json({ hata: tr.takdir.hata }, { status: 400 });
  }

  const azami = tur === "foto" ? FOTO_AZAMI : SES_AZAMI;
  if (dosya.size > azami) {
    return NextResponse.json({ hata: tr.takdir.medyaBuyuk }, { status: 413 });
  }

  // Uzantı gerçek MIME'den — güvenli, whitelist'li.
  let uzanti: string | null = null;
  if (tur === "foto") {
    if (dosya.type === "image/jpeg") uzanti = "jpg";
    else if (dosya.type === "image/png") uzanti = "png";
    else if (dosya.type === "image/webp") uzanti = "webp";
  } else {
    if (dosya.type.includes("mp4")) uzanti = "mp4";
    else if (dosya.type.includes("webm")) uzanti = "webm";
  }
  if (!uzanti) return NextResponse.json({ hata: tr.takdir.hata }, { status: 415 });

  const db = supabaseAdmin();
  const yol = `takdir/${session.sub}-${crypto.randomUUID()}.${uzanti}`;
  const yukleme = await db.storage
    .from("sesler")
    .upload(yol, dosya, { contentType: dosya.type, upsert: false });
  if (yukleme.error) {
    console.error("[takdir-medya] upload error:", yukleme.error.message);
    return NextResponse.json({ hata: tr.takdir.hata }, { status: 500 });
  }
  return NextResponse.json({ yol });
}

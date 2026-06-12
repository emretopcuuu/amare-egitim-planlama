import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";

// Giriş yapan katılımcının hayalet silüetine kısa ömürlü imzalı URL.
// Göl sahnesi bunu doku olarak yükler: sudaki yansıma kişinin kendisi olur.
export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return NextResponse.json({ url: null }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data: profil } = await db
    .from("voice_profiles")
    .select("face_path")
    .eq("participant_id", session.sub)
    .maybeSingle();
  if (!profil?.face_path) return NextResponse.json({ url: null });

  const { data: imzali } = await db.storage
    .from("sesler")
    .createSignedUrl(profil.face_path, 3600);
  return NextResponse.json({ url: imzali?.signedUrl ?? null });
}

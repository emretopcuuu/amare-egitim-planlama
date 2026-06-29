import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  analizGetirVeyaUret,
  analizYenidenDegerlendir,
  ASAMA_SIRA,
  type AsamaKod,
} from "@/lib/aynaAnaliz";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Opus + ElevenLabs üretimi uzun sürebilir.

function asamaCoz(v: string | null): AsamaKod {
  return (ASAMA_SIRA as string[]).includes(v ?? "")
    ? (v as AsamaKod)
    : "kamp_oncesi";
}

// Karta dokununca: aşamanın analizini üret/getir (write-once + cache).
export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return NextResponse.json({ durum: "yetkisiz" }, { status: 401 });
  }
  const asama = asamaCoz(new URL(req.url).searchParams.get("asama"));
  const sonuc = await analizGetirVeyaUret(supabaseAdmin(), session.sub, session.ad, asama);
  return NextResponse.json(sonuc);
}

// "Yeniden değerlendir" — sebep ZORUNLU, aşama başına bir kez.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return NextResponse.json({ durum: "yetkisiz" }, { status: 401 });
  }
  let govde: { asama?: string; sebep?: string } = {};
  try {
    govde = await req.json();
  } catch {
    return NextResponse.json({ durum: "hata" }, { status: 400 });
  }
  const sebep = (govde.sebep ?? "").trim();
  if (sebep.length < 10) {
    return NextResponse.json({ durum: "sebep-gerekli" }, { status: 400 });
  }
  const asama = asamaCoz(govde.asama ?? null);
  const sonuc = await analizYenidenDegerlendir(
    supabaseAdmin(),
    session.sub,
    session.ad,
    asama,
    sebep
  );
  return NextResponse.json(sonuc);
}

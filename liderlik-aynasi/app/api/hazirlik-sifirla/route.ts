import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { pusulaSifirla } from "@/lib/pusula";
import { sesSil, sesYapilandirildiMi } from "@/lib/eleven";

export const dynamic = "force-dynamic";

// Hazırlık adımını kişinin kendisi için SIFIRLAYIP baştan yaptırma (kamp öncesi).
// "nedenler" → Pusula sohbeti + öncelikler temizlenir (çekirdek profil yeniden
// kurulur). "ses" → ses/foto ritüeli kaydı silinir, klon (varsa) temizlenir →
// ritüel yeniden oynar. Yalnız kamp AÇILMADAN ve kişinin kendi verisi üzerinde.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let govde: { ne?: string } = {};
  try {
    govde = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Kamp fiziksel olarak açıldıysa hazırlık sıfırlamasına izin verme.
  const { data: kisi } = await db
    .from("participants")
    .select("camp_unlocked_at")
    .eq("id", session.sub)
    .maybeSingle();
  if (kisi?.camp_unlocked_at) {
    return NextResponse.json({ ok: false, hata: "Kamp açık" }, { status: 409 });
  }

  if (govde.ne === "nedenler") {
    await pusulaSifirla(db, session.sub);
    return NextResponse.json({ ok: true, yol: "/pusula" });
  }

  if (govde.ne === "ses") {
    // Klonu (varsa) temizle — tekrar tekrar sıfırlamada slot dolmasın.
    const { data: profil } = await db
      .from("voice_profiles")
      .select("voice_id")
      .eq("participant_id", session.sub)
      .maybeSingle();
    if (profil?.voice_id && sesYapilandirildiMi()) {
      await sesSil(profil.voice_id); // hata yutar
    }
    await db.from("voice_profiles").delete().eq("participant_id", session.sub);
    return NextResponse.json({ ok: true, yol: "/" });
  }

  return NextResponse.json({ ok: false }, { status: 400 });
}

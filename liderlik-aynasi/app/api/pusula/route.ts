import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { pusulaTuru, pusulaDurum, pusulaGecmis } from "@/lib/pusula";
import { tr } from "@/lib/i18n/tr";

// FAZ 0 Nedenler çalışması — çok-turlu sohbet uç noktası.
// GET: devam ettirme (geçmiş + durum). POST: bir tur (rıza + AYNA repliği).

export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.pusula.hata }, { status: 401 });
  }
  const db = supabaseAdmin();
  const [durum, gecmis] = await Promise.all([
    pusulaDurum(db, session.sub),
    pusulaGecmis(db, session.sub),
  ]);
  return Response.json({ durum, gecmis });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.pusula.hata }, { status: 401 });
  }

  let govde: { mesaj?: unknown; basla?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.pusula.hata }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Açık rıza: çalışma başlatılırken psikolojik veri saklama onayı verilir.
  if (govde.basla === true) {
    await db
      .from("participants")
      .update({ consent_at: new Date().toISOString() })
      .eq("id", session.sub)
      .is("consent_at", null);
  }

  const mesaj =
    typeof govde.mesaj === "string" && govde.mesaj.trim() ? govde.mesaj : null;

  const tur = await pusulaTuru(db, { id: session.sub, full_name: session.ad }, mesaj);
  if (!tur) {
    return Response.json({ hata: tr.pusula.aiHata }, { status: 503 });
  }
  return Response.json(tur);
}

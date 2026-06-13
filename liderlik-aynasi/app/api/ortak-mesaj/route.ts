import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { katilimciyaBildir } from "@/lib/push";
import { tr } from "@/lib/i18n/tr";

const MESAJ_MAX = 500;

// Ortağına mesaj: kişinin ait olduğu ikilide mesaj bırakır + ortağına push.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.hata }, { status: 401 });
  }

  let govde: { mesaj?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.ortak.hata }, { status: 400 });
  }
  const mesaj =
    typeof govde.mesaj === "string" ? govde.mesaj.trim().slice(0, MESAJ_MAX) : "";
  if (mesaj.length < 1) {
    return Response.json({ hata: tr.ortak.hata }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: ikili } = await db
    .from("pairs")
    .select("id, a_id, b_id")
    .or(`a_id.eq.${session.sub},b_id.eq.${session.sub}`)
    .maybeSingle();
  if (!ikili) {
    return Response.json({ hata: tr.ortak.hata }, { status: 404 });
  }

  const { error } = await db.from("pair_messages").insert({
    pair_id: ikili.id,
    from_id: session.sub,
    message: mesaj,
  });
  if (error) {
    return Response.json({ hata: tr.ortak.hata }, { status: 500 });
  }

  // Ortağa haber ver
  const ortakId = ikili.a_id === session.sub ? ikili.b_id : ikili.a_id;
  await katilimciyaBildir(
    db,
    ortakId,
    "🤝 Ortağından mesaj",
    mesaj.length > 80 ? mesaj.slice(0, 77) + "…" : mesaj,
    "/ortak"
  );

  return Response.json({ ok: true });
}

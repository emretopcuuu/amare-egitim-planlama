import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { gorevYansit } from "@/lib/ayna";
import { krizDiliVarMi, krizUyarisiGonder, KRIZ_YONLENDIRME } from "@/lib/guvenlik";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 60;

// GELİŞTİRME #1 — Yansıma Kapanışı. Aday görevi tamamlayıp puanını aldıktan
// sonra tek cümlelik iç-yansımasını yazar; AYNA buna tek cümleyle ayna tutar
// ve hem yansıma hem cevap göreve mühürlenir.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }

  let govde: { gorevId?: unknown; yansima?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.gorevler.hata }, { status: 400 });
  }
  const { gorevId, yansima } = govde;
  if (typeof gorevId !== "string" || typeof yansima !== "string" || yansima.trim().length < 2) {
    return Response.json({ hata: tr.gorevler.hata }, { status: 400 });
  }
  const yansimaMetni = yansima.trim().slice(0, 800);

  const db = supabaseAdmin();
  const { data: gorev } = await db
    .from("missions")
    .select("id, kind, title, body, status, response_text, reflected_at")
    .eq("id", gorevId)
    .eq("participant_id", session.sub)
    .maybeSingle();
  if (!gorev) return Response.json({ hata: tr.gorevler.hata }, { status: 404 });
  // Yansıma yalnız tamamlanmış (puanlanmış/teslim) görevde ve tek kez.
  if (gorev.status !== "scored" && gorev.status !== "submitted") {
    return Response.json({ hata: tr.gorevler.hata }, { status: 409 });
  }

  const yansit = await gorevYansit(
    db,
    session.sub,
    { title: gorev.title, body: gorev.body, kind: gorev.kind },
    gorev.response_text ?? "",
    yansimaMetni
  );

  // GÜVENLİK SINIRI: yansımada gerçek kriz sinyali → admin bayrağı + kişiye
  // insan-mentor yönlendirmesi (koç sınırı). Akışı bozmaz.
  const kriz = krizDiliVarMi(yansimaMetni);
  if (kriz) {
    await krizUyarisiGonder(db, session.sub, session.ad, "gorev-yansima", yansimaMetni);
  }

  const yanitMesaji = (yansit ?? tr.gorevler.yansimaTesekkur) + (kriz ? `\n\n${KRIZ_YONLENDIRME}` : "");

  await db
    .from("missions")
    .update({
      reflection_text: yansimaMetni,
      reflection_reply: yanitMesaji,
      reflected_at: new Date().toISOString(),
    })
    .eq("id", gorev.id);

  return Response.json({ yansit: yanitMesaji, ...(kriz ? { guvenlik: true } : {}) });
}

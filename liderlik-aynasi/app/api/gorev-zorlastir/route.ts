import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { gorevZorlastir } from "@/lib/ayna";
import type { Zorluk } from "@/lib/davranis";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 60;

// GELİŞTİRME #6 — "Daha ileri git". Aday aktif görevini kendi isteğiyle bir
// kademe zorlaştırır; AYNA aynı temayı koruyup ask'i cesurlaştırır.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }

  let govde: { gorevId?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.gorevler.hata }, { status: 400 });
  }
  if (typeof govde.gorevId !== "string") {
    return Response.json({ hata: tr.gorevler.hata }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: gorev } = await db
    .from("missions")
    .select("id, kind, title, body, status, difficulty")
    .eq("id", govde.gorevId)
    .eq("participant_id", session.sub)
    .maybeSingle();
  if (!gorev || gorev.status !== "pending") {
    return Response.json({ hata: tr.gorevler.hata }, { status: 409 });
  }
  // Söz/senkron gibi özel türler zorlaştırılmaz; zaten en üst kademedeyse de yok.
  if (gorev.kind === "soz" || gorev.kind === "senkron" || (gorev.difficulty ?? 2) >= 3) {
    return Response.json({ hata: tr.gorevler.zorlastirOlmaz }, { status: 409 });
  }

  const yeniZorluk = Math.min(3, (gorev.difficulty ?? 2) + 1) as Zorluk;
  const yeni = await gorevZorlastir(
    { title: gorev.title, body: gorev.body, kind: gorev.kind },
    yeniZorluk
  );
  if (!yeni) return Response.json({ hata: tr.gorevler.hata }, { status: 503 });

  await db
    .from("missions")
    .update({ title: yeni.title, body: yeni.body, difficulty: yeniZorluk })
    .eq("id", gorev.id)
    .eq("status", "pending");

  return Response.json({ ok: true });
}

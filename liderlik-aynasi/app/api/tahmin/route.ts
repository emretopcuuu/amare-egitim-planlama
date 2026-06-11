import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { aktifOzellikler } from "@/lib/degerlendirme";
import { tr } from "@/lib/i18n/tr";

// Tahmin tek seferliktir: insert kullanılır, PK çakışması 409 döner.
// Raporlar görünür olduktan sonra tahmin kabul edilmez (oyunun amacı kalmaz).
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  if (session.rol !== "participant") {
    return Response.json({ hata: "Yalnızca katılımcılar tahmin yapabilir." }, { status: 403 });
  }

  let govde: { enYuksekId?: unknown; enDusukId?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.tahmin.hataSunucu }, { status: 400 });
  }

  const { enYuksekId, enDusukId } = govde;
  if (
    typeof enYuksekId !== "number" ||
    typeof enDusukId !== "number" ||
    enYuksekId === enDusukId
  ) {
    return Response.json({ hata: tr.tahmin.ayniOzellikHata }, { status: 400 });
  }

  const db = supabaseAdmin();
  const [ozellikler, { data: ayar }] = await Promise.all([
    aktifOzellikler(db),
    db.from("settings").select("value").eq("key", "reports_visible").maybeSingle(),
  ]);

  if (ayar?.value === "true") {
    return Response.json({ hata: tr.tahmin.hataSunucu }, { status: 409 });
  }

  const gecerli = new Set(ozellikler.map((o) => o.id));
  if (!gecerli.has(enYuksekId) || !gecerli.has(enDusukId)) {
    return Response.json({ hata: tr.tahmin.hataSunucu }, { status: 400 });
  }

  const { error } = await db.from("predictions").insert({
    participant_id: session.sub,
    top_trait_id: enYuksekId,
    bottom_trait_id: enDusukId,
  });

  if (error) {
    // 23505: zaten tahmin var — tek seferlik kuralı
    const durum = error.code === "23505" ? 409 : 500;
    return Response.json({ hata: tr.tahmin.hataSunucu }, { status: durum });
  }

  return Response.json({ ok: true });
}

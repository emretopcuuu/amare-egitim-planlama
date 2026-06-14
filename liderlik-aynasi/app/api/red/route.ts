import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// FAZ 3 — Reddi Kutla. Alınan "Hayır" veri olarak kaydedilir; sayaç artar.
async function sayilar(db: ReturnType<typeof supabaseAdmin>, pid: string) {
  const haftaBasi = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [{ count: toplam }, { count: hafta }] = await Promise.all([
    db.from("redler").select("id", { count: "exact", head: true }).eq("participant_id", pid),
    db
      .from("redler")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", pid)
      .gte("created_at", haftaBasi),
  ]);
  return { toplam: toplam ?? 0, hafta: hafta ?? 0 };
}

export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.red.hata }, { status: 401 });
  }
  const s = await sayilar(supabaseAdmin(), session.sub);
  return Response.json(s);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.red.hata }, { status: 401 });
  }
  let aciklama: string | null = null;
  try {
    const b = await req.json();
    if (typeof b?.aciklama === "string" && b.aciklama.trim()) {
      aciklama = b.aciklama.trim().slice(0, 500);
    }
  } catch {
    // gövde opsiyonel
  }

  const db = supabaseAdmin();
  const { error } = await db
    .from("redler")
    .insert({ participant_id: session.sub, aciklama });
  if (error) return Response.json({ hata: tr.red.hata }, { status: 500 });

  const s = await sayilar(db, session.sub);
  const reframe = tr.red.reframeler[(s.toplam - 1) % tr.red.reframeler.length];
  return Response.json({ ...s, reframe });
}

import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// Kapanış Sözü'nü aç/kapat: katılımcılara söz ekranı açılır (kamp kapanışı).
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }
  let govde: { acik?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.kapanisSoz.hata }, { status: 400 });
  }
  if (typeof govde.acik !== "boolean") {
    return Response.json({ hata: tr.kapanisSoz.hata }, { status: 400 });
  }
  const { error } = await supabaseAdmin().from("settings").upsert({
    key: "kapanis_soz_acik",
    value: String(govde.acik),
    updated_at: new Date().toISOString(),
  });
  if (error) return Response.json({ hata: tr.kapanisSoz.hata }, { status: 500 });
  return Response.json({ ok: true });
}

import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// Program maddesi ekle/sil. Duyuruyu (push) /api/tik üstlenir.
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }

  let govde: {
    baslangic?: unknown;
    baslik?: unknown;
    yer?: unknown;
    ipucu?: unknown;
    acilmaDk?: unknown;
  };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.admin.program.hata }, { status: 400 });
  }

  const { baslangic, baslik, yer, ipucu, acilmaDk } = govde;
  if (
    typeof baslangic !== "string" ||
    Number.isNaN(Date.parse(baslangic)) ||
    typeof baslik !== "string" ||
    !baslik.trim() ||
    typeof acilmaDk !== "number" ||
    !Number.isInteger(acilmaDk) ||
    acilmaDk < 0 ||
    acilmaDk > 720
  ) {
    return Response.json({ hata: tr.admin.program.hata }, { status: 400 });
  }

  const { error } = await supabaseAdmin().from("schedule_items").insert({
    starts_at: new Date(baslangic).toISOString(),
    title: baslik.trim().slice(0, 120),
    location: typeof yer === "string" && yer.trim() ? yer.trim().slice(0, 120) : null,
    teaser:
      typeof ipucu === "string" && ipucu.trim() ? ipucu.trim().slice(0, 200) : null,
    reveal_minutes: acilmaDk,
  });
  if (error) {
    return Response.json({ hata: tr.admin.program.hata }, { status: 500 });
  }
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return Response.json({ hata: tr.admin.program.hata }, { status: 400 });
  }
  const { error } = await supabaseAdmin().from("schedule_items").delete().eq("id", id);
  if (error) {
    return Response.json({ hata: tr.admin.program.hata }, { status: 500 });
  }
  return Response.json({ ok: true });
}

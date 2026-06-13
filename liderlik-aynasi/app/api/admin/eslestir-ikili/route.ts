import { randomInt } from "node:crypto";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// Akran ikililerini (yeniden) oluştur: katılımcıları rastgele karıştırıp
// ikişerli eşle. Tek kalan kişi eşsiz kalır (admin tekrar çalıştırabilir).
export async function POST() {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }

  const db = supabaseAdmin();
  const { data: kisiler, error } = await db
    .from("participants")
    .select("id")
    .eq("role", "participant");
  if (error) {
    return Response.json({ hata: tr.admin.ikili.hata }, { status: 500 });
  }

  // Fisher-Yates karıştırma (kripto rastgelelik)
  const idler = (kisiler ?? []).map((k) => k.id);
  for (let i = idler.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [idler[i], idler[j]] = [idler[j], idler[i]];
  }

  const ikililer: { a_id: string; b_id: string }[] = [];
  for (let i = 0; i + 1 < idler.length; i += 2) {
    ikililer.push({ a_id: idler[i], b_id: idler[i + 1] });
  }

  // Eski ikilileri (ve mesajları cascade ile) temizle, yenilerini yaz
  await db.from("pairs").delete().not("id", "is", null);
  if (ikililer.length > 0) {
    const { error: yazHata } = await db.from("pairs").insert(ikililer);
    if (yazHata) {
      return Response.json({ hata: tr.admin.ikili.hata }, { status: 500 });
    }
  }

  return Response.json({ ok: true, ikiliSayisi: ikililer.length });
}

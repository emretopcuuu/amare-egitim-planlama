import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { aktifOzellikler } from "@/lib/degerlendirme";
import { katilimciyaBildir } from "@/lib/push";

// FAZ 0 akıllı hatırlatma (öneri 2b): kamp öncesi hazırlığı EKSİK kalanlara,
// neyin eksik olduğuna göre kişiselleştirilmiş push gönderir. Admin tetikler.
export async function POST() {
  const session = await getSession();
  if (!session || session.rol !== "admin") {
    return Response.json({ hata: "Yetkisiz" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const ozellikler = await aktifOzellikler(db);
  const [{ data: kisiler }, { data: puslar }, { data: ozPuanlar }] = await Promise.all([
    db
      .from("participants")
      .select("id, profil_foto_path")
      .eq("role", "participant")
      .is("camp_unlocked_at", null),
    db.from("pusula").select("participant_id").not("tamamlandi_at", "is", null),
    db.from("ratings").select("rater_id").eq("wave", 1).eq("is_self", true),
  ]);

  const pusulaSet = new Set((puslar ?? []).map((p) => p.participant_id));
  const ozSay = new Map<string, number>();
  for (const r of ozPuanlar ?? []) ozSay.set(r.rater_id, (ozSay.get(r.rater_id) ?? 0) + 1);

  let gonderildi = 0;
  for (const k of kisiler ?? []) {
    const pusulaOk = pusulaSet.has(k.id);
    const ozOk = (ozSay.get(k.id) ?? 0) >= ozellikler.length;
    const fotoOk = !!k.profil_foto_path;
    if (pusulaOk && ozOk && fotoOk) continue;

    // Eksiğe göre tek, net dürtü.
    const govde = !pusulaOk
      ? "Pusulan henüz hazır değil — birkaç dakika ayır, kampa hazır gel. 🧭"
      : !ozOk
        ? "Kendini puanlamayı tamamla; hazırlığın eksik kalmasın. ⭐"
        : "Profil fotoğrafını ekle, hazırlığın tamamlansın. 📸";
    await katilimciyaBildir(db, k.id, "Kampa hazırlık", govde, "/pusula");
    gonderildi++;
  }

  return Response.json({ ok: true, gonderildi });
}

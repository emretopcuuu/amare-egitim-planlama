import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { gorevUret, istanbulSaati } from "@/lib/ayna";
import { katilimciyaBildir } from "@/lib/push";
import { kampGunu } from "@/lib/kampProgrami";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 60;

// GELİŞTİRME #2 (2.tur): Canlı müdahale konsolu. Admin tek kişiye anında görev
// verir, bekleyen görevini iptal eder ya da özel bir fısıltı (push) gönderir —
// AYNA motorunu (tik.ts) elle geçer. Yalnız admin.
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const hedefId = typeof body?.hedefId === "string" ? body.hedefId : "";
  const eylem = body?.eylem;
  if (!hedefId || !eylem) {
    return Response.json({ hata: tr.admin.mudahale.hata }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: kisi } = await db
    .from("participants")
    .select("id, full_name, team")
    .eq("id", hedefId)
    .eq("role", "participant")
    .maybeSingle();
  if (!kisi) return Response.json({ hata: tr.admin.mudahale.hata }, { status: 404 });

  if (eylem === "gorev") {
    const bugun = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
    const gun = kampGunu(bugun) ?? 2;
    const { saat } = istanbulSaati();
    const gorev = await gorevUret(db, kisi, gun, saat, "kamp", null);
    if (!gorev) return Response.json({ hata: tr.admin.mudahale.uretilemedi }, { status: 503 });
    // #8 micro_sprint: sure_saat 0.5 = 30 dk
    const dueAt = new Date(Date.now() + gorev.sure_saat * 3_600_000);
    const { error } = await db.from("missions").insert({
      participant_id: kisi.id,
      trait_id: gorev.trait_id,
      kind: gorev.kind,
      title: gorev.title,
      body: gorev.body,
      difficulty: gorev.difficulty,
      neden: gorev.neden,
      micro_sprint: gorev.micro_sprint,
      due_at: dueAt.toISOString(),
    });
    if (error) return Response.json({ hata: tr.admin.mudahale.hata }, { status: 500 });
    await katilimciyaBildir(db, kisi.id, `🤖 AYNA'dan yeni görev: ${gorev.title}`, gorev.body.slice(0, 117));
    return Response.json({ ok: true, baslik: gorev.title });
  }

  if (eylem === "iptal") {
    const { data, error } = await db
      .from("missions")
      .update({ status: "expired" })
      .eq("participant_id", hedefId)
      .eq("status", "pending")
      .select("id");
    if (error) return Response.json({ hata: tr.admin.mudahale.hata }, { status: 500 });
    return Response.json({ ok: true, sayi: (data ?? []).length });
  }

  if (eylem === "fisilti") {
    const mesaj = typeof body?.mesaj === "string" ? body.mesaj.trim().slice(0, 300) : "";
    if (!mesaj) return Response.json({ hata: tr.admin.mudahale.hata }, { status: 400 });
    await katilimciyaBildir(db, hedefId, "👁 AYNA", mesaj);
    return Response.json({ ok: true });
  }

  // Manuel kamp açma/kilitleme — oda QR'ı çalışmadığında (oturum/domain sorunu)
  // görevli kampı tek tıkla açar. Mühür kalkar; kişi anında kamp akışına girer.
  if (eylem === "ac") {
    const { error } = await db
      .from("participants")
      .update({ camp_unlocked_at: new Date().toISOString() })
      .eq("id", hedefId)
      .is("camp_unlocked_at", null);
    if (error) return Response.json({ hata: tr.admin.mudahale.hata }, { status: 500 });
    return Response.json({ ok: true });
  }

  if (eylem === "kilitle") {
    const { error } = await db
      .from("participants")
      .update({ camp_unlocked_at: null })
      .eq("id", hedefId);
    if (error) return Response.json({ hata: tr.admin.mudahale.hata }, { status: 500 });
    return Response.json({ ok: true });
  }

  return Response.json({ hata: tr.admin.mudahale.hata }, { status: 400 });
}

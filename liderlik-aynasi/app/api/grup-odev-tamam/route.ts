import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { katilimciyaBildir } from "@/lib/push";
import { tr } from "@/lib/i18n/tr";

// GRUP ÖDEVİ TAMAM (öneri #4): grup ödevi artık çıkmaz sokak değil. Bir üye
// "biz bunu yaptık" der + kısa kanıt yazar → ödev kapanır, gruptaki HERKESE
// toplu kıvılcım yazılır (senkron görev deseni). Kolektif başarı hissi.
const GRUP_ODEV_KIVILCIMI = 12;
// #8 bireysel katkı: ödevi FİİLEN yapıp kanıtı yazan (kapatan) kişiye liderlik
// bonusu — herkese eşit dağıtımın "bedavacılık" tarafını dengeler; adım atan
// ödüllenir, kolektif taban korunur.
const KAPATAN_BONUSU = 10;
const KANIT_MAX = 400;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { odevId?: unknown; kanit?: unknown } | null;
  const odevId = typeof body?.odevId === "string" ? body.odevId : "";
  const kanit = typeof body?.kanit === "string" ? body.kanit.trim().slice(0, KANIT_MAX) : "";
  if (!odevId || kanit.length < 3) {
    return Response.json({ hata: tr.grup.tamamHata }, { status: 400 });
  }

  const db = supabaseAdmin();
  const [{ data: ben }, { data: odev }] = await Promise.all([
    db.from("participants").select("team").eq("id", session.sub).maybeSingle(),
    db.from("grup_odev").select("id, takim, baslik, aktif").eq("id", odevId).maybeSingle(),
  ]);
  // Yetki: yalnız o ödevin takımındaki kişi + ödev hâlâ aktif olmalı.
  if (!odev || !ben?.team || odev.takim !== ben.team) {
    return Response.json({ hata: tr.grup.tamamHata }, { status: 403 });
  }
  if (!odev.aktif) {
    return Response.json({ ok: true, zatenKapali: true });
  }

  // Kapanışı işaretle (unique(odev_id) → yarışta ikinci istek 23505 alır).
  const { error: kayitHata } = await db
    .from("grup_odev_tamam")
    .insert({ odev_id: odevId, kapatan_id: session.sub, kanit });
  if (kayitHata) {
    if (kayitHata.code === "23505") return Response.json({ ok: true, zatenKapali: true });
    return Response.json({ hata: tr.grup.tamamHata }, { status: 500 });
  }
  await db.from("grup_odev").update({ aktif: false }).eq("id", odevId);

  // Toplu kıvılcım: gruptaki herkese scored senkron görev (kıvılcım toplamı
  // missions.spark_points'ten hesaplandığı için bu deseni kullanıyoruz).
  const { data: uyeler } = await db
    .from("participants")
    .select("id")
    .eq("team", ben.team)
    .eq("role", "participant");
  const simdi = new Date().toISOString();
  const satirlar = (uyeler ?? []).map((u) => {
    // #8 Kapatan (fiilen yapan) → liderlik bonusu + kişisel tebrik; diğerleri taban.
    const kapatanMi = u.id === session.sub;
    return {
      participant_id: u.id,
      kind: "senkron" as const,
      title: `Grup ödevi tamam: ${odev.baslik}`.slice(0, 120),
      body: kapatanMi
        ? "Adımı sen attın — grubunu sırtladın. Bu liderlik bonusu senin."
        : "Grubun birlikte bir şey başardı. Bu kıvılcım hepinizin.",
      status: "scored" as const,
      spark_points: kapatanMi ? GRUP_ODEV_KIVILCIMI + KAPATAN_BONUSU : GRUP_ODEV_KIVILCIMI,
      scored_at: simdi,
      issued_at: simdi,
      due_at: simdi, // senkron/anlık — deadline'ı yok, şimdiye eşitle
      ai_comment: tr.grup.tamamTesekkur,
    };
  });
  if (satirlar.length > 0) {
    await db.from("missions").insert(satirlar);
    for (const u of uyeler ?? []) {
      await katilimciyaBildir(
        db,
        u.id,
        "🎉 Grup ödeviniz tamamlandı!",
        `Grubun "${odev.baslik}" ödevini kapattı — +${GRUP_ODEV_KIVILCIMI} kıvılcım hepinize.`,
        "/grup"
      ).catch(() => {});
    }
  }

  return Response.json({ ok: true, kivilcim: GRUP_ODEV_KIVILCIMI });
}

import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { acikDalga, aktifOzellikler, ozPuanTamamMi } from "@/lib/degerlendirme";
import { tr } from "@/lib/i18n/tr";

const YORUM_MAX = 500;

type GelenPuan = { ozellikId: number; puan: number; yorum?: string };
type TemizPuan = { ozellikId: number; puan: number; yorum: string | null };

// Tüm özellikler tek istekte gelir; dalga numarasını istemci değil sunucu belirler
// (kapanmış dalgaya gecikmiş yazma olmaz). Upsert sayesinde dalga açıkken düzenleme serbest.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  if (session.rol !== "participant") {
    return Response.json({ hata: "Yalnızca katılımcılar puanlayabilir." }, { status: 403 });
  }

  let govde: { hedefId?: unknown; puanlar?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.puanlama.hataSunucu }, { status: 400 });
  }

  const { hedefId, puanlar } = govde;
  if (typeof hedefId !== "string" || !Array.isArray(puanlar)) {
    return Response.json({ hata: tr.puanlama.hataSunucu }, { status: 400 });
  }

  const db = supabaseAdmin();
  const [dalga, ozellikler] = await Promise.all([acikDalga(db), aktifOzellikler(db)]);
  if (!dalga) {
    return Response.json({ hata: tr.puanlama.hataDalgaKapandi }, { status: 409 });
  }

  // Gelen puanlar aktif özellik kümesini eksiksiz ve fazlasız kapsamalı.
  const gecerliIdler = new Set(ozellikler.map((o) => o.id));
  const gorulen = new Set<number>();
  const temiz: TemizPuan[] = [];
  for (const p of puanlar as GelenPuan[]) {
    if (
      typeof p?.ozellikId !== "number" ||
      typeof p?.puan !== "number" ||
      !Number.isInteger(p.puan) ||
      p.puan < 1 ||
      p.puan > 10 ||
      !gecerliIdler.has(p.ozellikId) ||
      gorulen.has(p.ozellikId)
    ) {
      return Response.json({ hata: tr.puanlama.hataSunucu }, { status: 400 });
    }
    const yorum =
      typeof p.yorum === "string" ? p.yorum.trim().slice(0, YORUM_MAX) : "";
    gorulen.add(p.ozellikId);
    temiz.push({ ozellikId: p.ozellikId, puan: p.puan, yorum: yorum || null });
  }
  if (gorulen.size !== gecerliIdler.size) {
    return Response.json(
      { hata: tr.degerlendir.ilerleme(gorulen.size, gecerliIdler.size) },
      { status: 400 }
    );
  }

  const kendisi = hedefId === session.sub;
  if (!kendisi) {
    const { data: hedef, error } = await db
      .from("participants")
      .select("id, role")
      .eq("id", hedefId)
      .maybeSingle();
    if (error) return Response.json({ hata: tr.puanlama.hataSunucu }, { status: 500 });
    if (!hedef || hedef.role !== "participant") {
      return Response.json({ hata: tr.puanlama.hataSunucu }, { status: 404 });
    }

    // Öz-puan kapısı: kendini bitirmeden başkasına puan yazılamaz.
    if (!(await ozPuanTamamMi(db, session.sub, dalga.id, ozellikler.length))) {
      return Response.json({ hata: tr.degerlendir.kilitliIpucu }, { status: 403 });
    }

    // <6 puana zorunlu yorum yalnızca başkalarını puanlarken geçerli.
    if (temiz.some((p) => p.puan < 6 && !p.yorum)) {
      return Response.json({ hata: tr.puanlama.yorumZorunlu }, { status: 400 });
    }
  }

  const satirlar = temiz.map((p) => ({
    rater_id: session.sub,
    target_id: hedefId,
    trait_id: p.ozellikId,
    wave: dalga.id,
    score: p.puan,
    comment: p.yorum,
  }));

  const { error: yazmaHatasi } = await db
    .from("ratings")
    .upsert(satirlar, { onConflict: "rater_id,target_id,trait_id,wave" });
  if (yazmaHatasi) {
    return Response.json({ hata: tr.puanlama.hataSunucu }, { status: 500 });
  }

  return Response.json({ ok: true });
}

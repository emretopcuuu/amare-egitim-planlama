import { getSession } from "@/lib/auth/session";
import { bayatOturumYaniti } from "@/lib/auth/bayatOturum";
import { supabaseAdmin } from "@/lib/supabase/server";
import { katilimciyaBildir } from "@/lib/push";
import { tr } from "@/lib/i18n/tr";
import { gecerliMuhurMu } from "@/lib/takdirMuhur";
import { takdirCaprazBonus } from "@/lib/takdirCapraz";

const MESAJ_MAX = 280;

// TAKDİR GÖNDER: bir kişiye kısa pozitif not. Puandan farklı — daima isimli,
// daima olumlu. Sunucu hedefin gerçek katılımcı olduğunu doğrular.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  if (session.rol !== "participant") {
    return Response.json({ hata: tr.takdir.hata }, { status: 403 });
  }

  let govde: { hedefId?: unknown; mesaj?: unknown; muhur?: unknown; fotoPath?: unknown; sesPath?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.takdir.hata }, { status: 400 });
  }

  const hedefId = govde.hedefId;
  const mesaj = typeof govde.mesaj === "string" ? govde.mesaj.trim().slice(0, MESAJ_MAX) : "";
  // A5 — mühür (kategori) OPSİYONEL: geçersiz/boşsa sessizce null (takdir yine gider).
  const muhur = gecerliMuhurMu(govde.muhur) ? govde.muhur : null;
  // A9/A3 — medya yolları OPSİYONEL: yalnız kendi yüklediği (takdir/{sub}-...) yol
  // kabul edilir (başkasının yolunu iliştiremesin). Geçersizse sessizce null.
  const kendiYolu = (v: unknown): string | null =>
    typeof v === "string" && v.startsWith(`takdir/${session.sub}-`) && v.length < 200 ? v : null;
  const fotoPath = kendiYolu(govde.fotoPath);
  const sesPath = kendiYolu(govde.sesPath);
  // Metin en az 2 karakter OLMALI — MEĞER ki foto/ses eklenmişse (sesli/fotolu
  // takdir metinsiz de anlamlıdır).
  if (
    typeof hedefId !== "string" ||
    hedefId === session.sub ||
    (mesaj.length < 2 && !fotoPath && !sesPath)
  ) {
    return Response.json({ hata: tr.takdir.hata }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: hedef } = await db
    .from("participants")
    .select("id")
    .eq("id", hedefId)
    .eq("role", "participant")
    .maybeSingle();
  if (!hedef) {
    return Response.json({ hata: tr.takdir.hata }, { status: 404 });
  }

  // İDEMPOTENSİ + SPAM KAPAĞI: çift dokunuş aynı takdiri iki kez yazmasın;
  // aynı hedefe günde en fazla 5 takdir (bildirim yağmuru koruması).
  const sonIkiDk = new Date(Date.now() - 2 * 60_000).toISOString();
  const gunBasi = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const [{ data: ayni }, { count: bugunSayisi }] = await Promise.all([
    db
      .from("kudos")
      .select("id")
      .eq("from_id", session.sub)
      .eq("to_id", hedefId)
      .eq("message", mesaj)
      .gte("created_at", sonIkiDk)
      .limit(1),
    db
      .from("kudos")
      .select("id", { count: "exact", head: true })
      .eq("from_id", session.sub)
      .eq("to_id", hedefId)
      .gte("created_at", gunBasi),
  ]);
  if (ayni && ayni.length > 0) {
    return Response.json({ ok: true }); // çift dokunuş — ilk kayıt geçerli
  }
  if ((bugunSayisi ?? 0) >= 5) {
    return Response.json({ hata: tr.takdir.hata }, { status: 429 });
  }

  const { error } = await db.from("kudos").insert({
    from_id: session.sub,
    to_id: hedefId,
    message: mesaj,
    kategori: muhur,
    foto_path: fotoPath,
    ses_path: sesPath,
  });
  if (error) {
    const bayat = await bayatOturumYaniti(error);
    if (bayat) return bayat;
    return Response.json({ hata: tr.takdir.hata }, { status: 500 });
  }
  // A6 — Çapraz-takım çarpanı: takım dışına giden takdir gönderene bonus kıvılcım
  // (kill-switch'li, günlük tavanlı). Best-effort — takdiri asla düşürmez.
  try {
    await takdirCaprazBonus(db, session.sub, hedefId);
  } catch {
    // sessizce geç
  }

  // Takdir alan kişiye bildirim — geri gelmesi + "vav" için.
  try {
    await katilimciyaBildir(
      db,
      hedefId,
      tr.takdir.bildirimBaslik,
      tr.takdir.bildirimMetin(session.ad),
      "/takdir"
    );
  } catch {
    // push yapılandırılmamış olabilir — takdir yine de kaydedildi
  }
  return Response.json({ ok: true });
}

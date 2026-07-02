import { getSession } from "@/lib/auth/session";
import { bayatOturumYaniti } from "@/lib/auth/bayatOturum";
import { supabaseAdmin } from "@/lib/supabase/server";
import { MINI360_IFADELER } from "@/lib/onFarkindalik";
import { tr } from "@/lib/i18n/tr";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Mini 360 — bir ekip arkadaşına EKİP-İÇİ değerlendirme (GİRİŞLİ, anonim).
// rater_id yalnız SUNUCUDA tutulur; hedefe/sonuçlara asla sızmaz. İki kapı:
//   1) Değerlendiren önce KENDİNİ puanlamış olmalı (öz-puan tamamlanmalı).
//   2) Hedef, değerlendirenle AYNI ekipte gerçek bir katılımcı olmalı (≠ kendisi).
// Aynı (değerlendiren, hedef, tur) için ikinci gönderim puanı GÜNCELLER.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const targetId = typeof body?.targetId === "string" ? body.targetId : "";
  if (!UUID_RE.test(targetId) || targetId === session.sub) {
    return Response.json({ hata: tr.mini360.hata }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: turAyar } = await db
    .from("settings")
    .select("value")
    .eq("key", "mini360_tur")
    .maybeSingle();
  const tur = Math.max(1, parseInt(turAyar?.value ?? "1", 10) || 1);

  const satir: Record<string, number | string> = {
    rater_id: session.sub,
    target_id: targetId,
    tur,
  };
  for (const i of MINI360_IFADELER) {
    const v = Number(body?.[i.kod]);
    if (!Number.isInteger(v) || v < 1 || v > 5) {
      return Response.json({ hata: tr.mini360.hata }, { status: 400 });
    }
    satir[i.kod] = v;
  }

  // Değerlendiren + hedef bilgisi tek seferde: ekip eşleşmesi + öz-puan kapısı.
  const [{ data: ben }, { data: hedef }, { data: oz }] = await Promise.all([
    db.from("participants").select("team").eq("id", session.sub).maybeSingle(),
    db
      .from("participants")
      .select("id, team")
      .eq("id", targetId)
      .eq("role", "participant")
      .maybeSingle(),
    db
      .from("mini360_oz")
      .select("m1, m2, m3, m4, m5, m6")
      .eq("participant_id", session.sub)
      .eq("tur", tur)
      .maybeSingle(),
  ]);

  // Öz-puan kapısı: kendini puanlamadan başkasını değerlendiremez.
  const ozTamam = !!oz && MINI360_IFADELER.every((i) => oz[i.kod] !== null);
  if (!ozTamam) {
    return Response.json({ hata: tr.mini360.kilitBaslik }, { status: 403 });
  }
  // Ekip kapısı: hedef gerçek + aynı ekipte olmalı.
  if (!hedef || !ben?.team || hedef.team !== ben.team) {
    return Response.json({ hata: tr.mini360.disGecersiz }, { status: 403 });
  }

  const { error } = await db
    .from("mini360_dis")
    .upsert(satir as never, { onConflict: "rater_id,target_id,tur" });
  if (error) {
    const bayat = await bayatOturumYaniti(error);
    if (bayat) return bayat;
    return Response.json({ hata: tr.mini360.hata }, { status: 500 });
  }
  return Response.json({ ok: true });
}

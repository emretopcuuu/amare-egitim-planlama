import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { pusulaCekirdek } from "@/lib/pusula";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.rol !== "admin") return NextResponse.json({ hata: "yetkisiz" }, { status: 401 });

  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ hata: "geçersiz id" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: kisi } = await db
    .from("participants")
    .select("full_name, team, city, login_code, camp_unlocked_at")
    .eq("id", id)
    .eq("role", "participant")
    .maybeSingle();
  if (!kisi) return NextResponse.json({ hata: "bulunamadı" }, { status: 404 });

  const [
    cekirdek,
    { data: ofRow },
    { data: degerlerRow },
    { count: pushSayi },
    { data: momentumlar },
    { data: churn },
    { count: gorevTamam },
    { count: takdirSayi },
  ] = await Promise.all([
    pusulaCekirdek(db, id),
    db.from("on_farkindalik").select("tamamlandi_at").eq("participant_id", id).maybeSingle(),
    // [M2] Değerler tamamlanma SONUCU (içerik değil).
    db.from("degerler_calismasi").select("tamamlandi_at").eq("participant_id", id).maybeSingle(),
    // [M9] Push izni var mı (en az bir abonelik satırı).
    db.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("participant_id", id),
    db.from("momentum_scores").select("score, week_start").eq("participant_id", id).order("week_start", { ascending: false }).limit(1),
    db.from("churn_radar").select("updated_at").eq("participant_id", id).maybeSingle(),
    db.from("missions").select("id", { count: "exact", head: true }).eq("participant_id", id).eq("status", "done"),
    db.from("kudos").select("id", { count: "exact", head: true }).eq("to_id", id).eq("is_hidden", false),
  ]);

  const sonEtkinlik = churn?.updated_at ?? null;
  const saatGec = sonEtkinlik ? Math.round((Date.now() - new Date(sonEtkinlik).getTime()) / 3_600_000) : null;

  return NextResponse.json({
    id,
    ad: kisi.full_name,
    takim: kisi.team,
    sehir: kisi.city,
    loginKodu: kisi.login_code,
    kampAcik: !!kisi.camp_unlocked_at,
    ofTamam: !!ofRow?.tamamlandi_at,
    // KVKK: pusula/değerler İÇERİĞİ (neden/iç engel/özet) admin'e asla dönmez —
    // yalnız tamamlanma SONUCU. (Eski alan ham özet metnini sızdırıyordu.)
    pusulaTamam: !!cekirdek?.ozet,
    degerlerTamam: !!degerlerRow?.tamamlandi_at,
    oyunSecti: !!kisi.team,
    pushVar: (pushSayi ?? 0) > 0,
    momentum: momentumlar?.[0]?.score ?? null,
    gorevTamam: gorevTamam ?? 0,
    takdir: takdirSayi ?? 0,
    saatGec,
  });
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// KAMPIN NABZI — /gorevler'deki tek sakin şeridi besler: kampın canlı toplu
// istatistiği + kişinin (pozitif) sıralaması. İsimsiz agregat; kimse utandırılmaz.
export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return NextResponse.json({ yok: true }, { status: 401 });
  }
  const db = supabaseAdmin();
  const bugun = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
  const bugunBas = new Date(`${bugun}T00:00:00+03:00`).toISOString();

  const [{ data: puanli }, { count: toplamKisi }] = await Promise.all([
    db
      .from("missions")
      .select("participant_id, spark_points, ai_score, scored_at")
      .eq("status", "scored"),
    db.from("participants").select("id", { count: "exact", head: true }).eq("role", "participant"),
  ]);

  const satirlar = (puanli ?? []) as {
    participant_id: string;
    spark_points: number | null;
    ai_score: number | null;
    scored_at: string | null;
  }[];

  // Kişi başı kıvılcım toplamı + kamp geneli + bugün.
  const kisiKivilcim = new Map<string, number>();
  let toplamGorev = 0;
  let toplamKivilcim = 0;
  let bugunGorev = 0;
  let bugunFiero = 0;
  const bugunKisiler = new Set<string>();
  for (const r of satirlar) {
    const kv = r.spark_points ?? 0;
    kisiKivilcim.set(r.participant_id, (kisiKivilcim.get(r.participant_id) ?? 0) + kv);
    toplamGorev += 1;
    toplamKivilcim += kv;
    if (r.scored_at && r.scored_at >= bugunBas) {
      bugunGorev += 1;
      bugunKisiler.add(r.participant_id);
      if (r.ai_score === 10) bugunFiero += 1;
    }
  }

  // Sıralama (kıvılcıma göre, azalan). Kişinin 1-tabanlı sırası.
  const benim = kisiKivilcim.get(session.sub) ?? 0;
  const sirali = [...kisiKivilcim.values()].sort((a, b) => b - a);
  // 0 kıvılcımlı (henüz görev yapmamış) kişiler de toplamKisi'ye dahil; sıra
  // yalnız kıvılcımı olanlar arasında hesaplanır, kalanlar sona düşer.
  let siram = sirali.filter((v) => v > benim).length + 1;
  // İlk 5'e kalan kıvılcım (pozitif teşvik). Beşinci sıradaki değer.
  const besinci = sirali[4] ?? 0;
  const ilk5Kalan = siram > 5 ? Math.max(0, besinci - benim + 1) : 0;

  return NextResponse.json({
    toplamGorev,
    toplamKivilcim,
    bugunGorev,
    bugunAktifKisi: bugunKisiler.size,
    bugunFiero,
    toplamKisi: toplamKisi ?? kisiKivilcim.size,
    siram,
    benimKivilcim: benim,
    ilk5Kalan,
  });
}

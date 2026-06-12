import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { momentumPuanla, momentumMesaji } from "@/lib/davranis";
import { katilimciyaBildir } from "@/lib/push";

// HAFTALIK MOMENTUM ENDEKSİ: ciroyu değil davranış eğilimini ölçer.
// Cuma akşamları tik tetikler; skorlar momentum_scores'a yazılır ve
// herkese kişisel push gider. Hesap çekirdeği lib/davranis.ts'tedir.

/** Pazartesi başlangıçlı hafta anahtarı (Europe/Istanbul, YYYY-MM-DD). */
export function haftaBaslangici(simdi: Date): string {
  const tarih = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(simdi);
  const gun = new Date(`${tarih}T12:00:00+03:00`);
  const haftaninGunu = (gun.getUTCDay() + 6) % 7; // 0=Pzt
  gun.setUTCDate(gun.getUTCDate() - haftaninGunu);
  return gun.toISOString().slice(0, 10);
}

export async function momentumHesaplaVeYaz(
  db: Db,
  simdi: Date
): Promise<{ yazilan: number }> {
  const hafta = haftaBaslangici(simdi);
  const buHaftaBasi = new Date(`${hafta}T00:00:00+03:00`);
  const oncekiHaftaBasi = new Date(buHaftaBasi.getTime() - 7 * 86_400_000);

  const [{ data: kisiler }, { data: gorevler }, { data: puanlar }, { data: onceki }] =
    await Promise.all([
      db.from("participants").select("id").eq("role", "participant"),
      db
        .from("missions")
        .select("participant_id, status, ai_score, issued_at, responded_at, due_at")
        .gte("issued_at", oncekiHaftaBasi.toISOString()),
      db
        .from("ratings")
        .select("rater_id, created_at")
        .gte("created_at", buHaftaBasi.toISOString()),
      db
        .from("momentum_scores")
        .select("participant_id, score")
        .eq("week_start", new Date(oncekiHaftaBasi).toISOString().slice(0, 10)),
    ]);

  const oncekiSkor = new Map((onceki ?? []).map((o) => [o.participant_id, o.score]));
  const puanSayisi = new Map<string, number>();
  for (const p of puanlar ?? []) {
    puanSayisi.set(p.rater_id, (puanSayisi.get(p.rater_id) ?? 0) + 1);
  }

  let yazilan = 0;
  for (const k of kisiler ?? []) {
    const kisinin = (gorevler ?? []).filter((g) => g.participant_id === k.id);
    const buHafta = kisinin.filter(
      (g) => new Date(g.issued_at) >= buHaftaBasi
    );
    const gecenHafta = kisinin.filter(
      (g) => new Date(g.issued_at) < buHaftaBasi
    );
    const teslimler = buHafta.filter((g) => g.responded_at !== null);
    const sonuc = momentumPuanla({
      verilen: buHafta.length,
      teslim: teslimler.length,
      zamaninda: teslimler.filter(
        (g) => g.responded_at! <= g.due_at
      ).length,
      puanlar: buHafta
        .filter((g) => g.ai_score !== null)
        .map((g) => g.ai_score as number),
      oncekiPuanlar: gecenHafta
        .filter((g) => g.ai_score !== null)
        .map((g) => g.ai_score as number),
      degerlendirme: puanSayisi.get(k.id) ?? 0,
    });

    const { error } = await db.from("momentum_scores").upsert({
      participant_id: k.id,
      week_start: hafta,
      score: sonuc.skor,
      detail: sonuc.bilesenler,
    });
    if (error) continue;
    yazilan++;
    await katilimciyaBildir(
      db,
      k.id,
      "📈 Haftalık Momentum",
      momentumMesaji(sonuc.skor, oncekiSkor.get(k.id) ?? null),
      "/gorevler"
    );
  }
  return { yazilan };
}

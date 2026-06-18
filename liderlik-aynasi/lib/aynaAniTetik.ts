import "server-only";
import type { Db } from "@/lib/degerlendirme";

// AYNA ANI ADAYLARI — kamp içi "gördün mü?" anına hazır kişiler. aynaAniUret'in
// koşullarıyla birebir: (1) en az 3 puanlanmış görev, (2) kamp öncesi yazdığı
// bir kör nokta cümlesi (ters davranış / kalkan / varsayım), (3) henüz Ayna Anı
// almamış. Admin bu listeyi görüp tek tıkla anları üretebilir.
export async function aynaAniAdaylari(
  db: Db
): Promise<{ id: string; ad: string }[]> {
  const [{ data: mevcut }, { data: scored }, { data: of }, { data: kisiler }] =
    await Promise.all([
      db.from("mirror_moments").select("participant_id"),
      db.from("missions").select("participant_id").eq("status", "scored"),
      db.from("on_farkindalik").select("participant_id, profil"),
      db.from("participants").select("id, full_name").eq("role", "participant"),
    ]);

  const alanlar = new Set((mevcut ?? []).map((m) => m.participant_id));

  const scoredSayi = new Map<string, number>();
  for (const s of scored ?? [])
    scoredSayi.set(s.participant_id, (scoredSayi.get(s.participant_id) ?? 0) + 1);

  const korNokta = new Set<string>();
  for (const r of of ?? []) {
    const k4 = ((r.profil as { katman4?: Record<string, string | null> })?.katman4 ?? {}) as Record<
      string,
      string | null
    >;
    if (k4["k4.ters_davranis"] || k4["k4.kalkan"] || k4["k4.varsayim"])
      korNokta.add(r.participant_id);
  }

  return (kisiler ?? [])
    .filter(
      (k) =>
        !alanlar.has(k.id) && (scoredSayi.get(k.id) ?? 0) >= 3 && korNokta.has(k.id)
    )
    .map((k) => ({ id: k.id, ad: k.full_name }));
}

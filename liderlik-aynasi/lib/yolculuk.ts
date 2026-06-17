import "server-only";
import type { Db } from "@/lib/degerlendirme";

// GELİŞTİRME #2 — Ayna Yolculuğu. Adayın dağınık verisini (Pusula, Ön Farkındalık,
// kamp girişi, dalgalar, görevler, takdir, Ekip Aynası, kilit anlar) TEK bir
// kronolojik anlatıya dizer. Aday bütün bir kahramanlık yayı görür, dağınık araç değil.

export type YolcuOlay = {
  ts: string;
  ikon: string;
  baslik: string;
  detay?: string | null;
  vurgu?: boolean; // kilometre taşı (büyük an)
};

const DALGA_AD: Record<number, string> = { 1: "Dalga 1", 2: "Dalga 2", 3: "Dalga 3" };

export async function yolculukOlaylari(db: Db, pid: string): Promise<YolcuOlay[]> {
  const [
    { data: kisi },
    { data: pusula },
    { data: of },
    { data: ses },
    { data: m360 },
    { data: bosluk },
    { data: soz },
    { data: puanlar },
    { data: gorevler },
    { data: takdirler },
    { data: redler },
  ] = await Promise.all([
    db.from("participants").select("camp_unlocked_at").eq("id", pid).maybeSingle(),
    db.from("pusula").select("tamamlandi_at").eq("participant_id", pid).maybeSingle(),
    db.from("on_farkindalik").select("tamamlandi_at").eq("participant_id", pid).maybeSingle(),
    db.from("voice_profiles").select("created_at").eq("participant_id", pid).maybeSingle(),
    db.from("mini360_oz").select("updated_at").eq("participant_id", pid).maybeSingle(),
    db.from("bosluk_ani").select("yeni_cumle_at").eq("participant_id", pid).maybeSingle(),
    db.from("pledges").select("created_at").eq("participant_id", pid).maybeSingle(),
    db.from("ratings").select("wave, is_self, created_at").eq("rater_id", pid),
    db
      .from("missions")
      .select("title, ai_score, spark_points, scored_at")
      .eq("participant_id", pid)
      .eq("status", "scored")
      .order("scored_at", { ascending: false })
      .limit(12),
    db
      .from("kudos")
      .select("message, created_at")
      .eq("to_id", pid)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(8),
    db.from("redler").select("created_at").eq("participant_id", pid),
  ]);

  const olaylar: YolcuOlay[] = [];

  if (pusula?.tamamlandi_at)
    olaylar.push({ ts: pusula.tamamlandi_at, ikon: "🧭", baslik: "Pusulanı kurdun — nedenini buldun", vurgu: true });
  if (of?.tamamlandi_at)
    olaylar.push({ ts: of.tamamlandi_at, ikon: "🪞", baslik: "Ön Farkındalık'ı tamamladın", vurgu: true });
  if (kisi?.camp_unlocked_at)
    olaylar.push({ ts: kisi.camp_unlocked_at, ikon: "⛺", baslik: "Kampa adım attın", vurgu: true });
  if (ses?.created_at)
    olaylar.push({ ts: ses.created_at, ikon: "🎙️", baslik: "Yansıman doğdu" });
  if (m360?.updated_at)
    olaylar.push({ ts: m360.updated_at, ikon: "👥", baslik: "Ekip Aynası'nda kendini gördün" });
  if (bosluk?.yeni_cumle_at)
    olaylar.push({ ts: bosluk.yeni_cumle_at, ikon: "🔓", baslik: "İç engelini yıktın, yeni cümleni yazdın", vurgu: true });
  if (soz?.created_at)
    olaylar.push({ ts: soz.created_at, ikon: "🤝", baslik: "Sözünü verdin", vurgu: true });

  // Dalga bazlı değerlendirme özeti: kendini + kaç kişiyi puanladın.
  const dalgaOzet = new Map<number, { oz: number; dis: number; ts: string }>();
  for (const p of puanlar ?? []) {
    const m = dalgaOzet.get(p.wave) ?? { oz: 0, dis: 0, ts: p.created_at };
    if (p.is_self) m.oz += 1;
    else m.dis += 1;
    if (p.created_at < m.ts) m.ts = p.created_at;
    dalgaOzet.set(p.wave, m);
  }
  for (const [wave, m] of dalgaOzet) {
    const parcalar: string[] = [];
    if (m.oz > 0) parcalar.push("kendini");
    if (m.dis > 0) parcalar.push(`${m.dis} kişiyi`);
    olaylar.push({
      ts: m.ts,
      ikon: "👁️",
      baslik: `${DALGA_AD[wave] ?? `Dalga ${wave}`}: ${parcalar.join(" + ")} değerlendirdin`,
    });
  }

  for (const g of gorevler ?? []) {
    if (!g.scored_at) continue;
    const puan = typeof g.ai_score === "number" ? ` · AYNA ${g.ai_score}/10` : "";
    const kiv = g.spark_points ? ` · +${g.spark_points}⚡` : "";
    olaylar.push({ ts: g.scored_at, ikon: "🎯", baslik: g.title, detay: `Görev tamam${puan}${kiv}` });
  }

  for (const k of takdirler ?? [])
    olaylar.push({ ts: k.created_at, ikon: "💛", baslik: "Bir takdir aldın", detay: `“${k.message}”` });

  if ((redler ?? []).length) {
    const sonRed = (redler ?? []).reduce((a, b) => (a.created_at > b.created_at ? a : b));
    olaylar.push({
      ts: sonRed.created_at,
      ikon: "🔥",
      baslik: `${(redler ?? []).length} "Hayır" topladın — her biri veri`,
    });
  }

  // Kronolojik yay (eskiden yeniye).
  olaylar.sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
  return olaylar;
}

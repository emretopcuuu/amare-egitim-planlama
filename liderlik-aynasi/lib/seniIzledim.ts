import "server-only";
import type { supabaseAdmin } from "@/lib/supabase/server";
import { herkeseBildir } from "@/lib/push";
import { pusulaCekirdek } from "@/lib/pusula";
import { tr } from "@/lib/i18n/tr";

type Db = ReturnType<typeof supabaseAdmin>;

// D10 — GÜN 3 "SENİ İZLEDİM" AYNASI. Kampın son günü AYNA, 3 günün verisinden
// kişiye tek bir yansıma sunar ("3 gündür seni izliyorum, gördüğüm kişi şu...")
// ve TEK soru sorar: "Bu kişi 90 gün sonra nerede?". Cevap kişinin SÖZ tohumu
// olur (normal görev yanıtı olarak saklanır; kapanış zinciri okur).
//
// sesliMektup deseni: gövde STATİK şablon + kişinin pusula (çekirdek neden)
// verisiyle kişiselleşir — AI çağrısı YOK (154 kişide güvenilir + maliyetsiz).
// İdempotent: görevi almış kişiye ikinci kez düşmez.

const SURE_SAAT = 4;

export function seniIzledimGoreviMi(g: { kind: string; title: string }): boolean {
  return g.kind === "yansima" && g.title === tr.gorevler.seniIzledimBaslik;
}

export async function seniIzledimAc(db: Db): Promise<number> {
  const { data: kisiler } = await db
    .from("participants")
    .select("id")
    .eq("role", "participant");
  if (!kisiler?.length) return 0;

  const { data: mevcutlar } = await db
    .from("missions")
    .select("participant_id")
    .eq("kind", "yansima")
    .eq("title", tr.gorevler.seniIzledimBaslik);
  const alanlar = new Set((mevcutlar ?? []).map((m) => m.participant_id));

  const simdi = new Date();
  const due = new Date(simdi.getTime() + SURE_SAAT * 3_600_000).toISOString();
  let dusen = 0;
  for (const k of kisiler) {
    if (alanlar.has(k.id)) continue;
    const pusula = await pusulaCekirdek(db, k.id).catch(() => null);
    const neden = pusula?.cekirdek_neden?.[0]?.trim() || null;
    const { error } = await db.from("missions").insert({
      participant_id: k.id,
      kind: "yansima",
      title: tr.gorevler.seniIzledimBaslik,
      body: tr.gorevler.seniIzledimGovde(neden ? neden.slice(0, 120) : null),
      difficulty: 2,
      issued_at: simdi.toISOString(),
      due_at: due,
    });
    if (!error) dusen++;
  }
  if (dusen > 0) {
    await herkeseBildir(
      db,
      tr.gorevler.seniIzledimPush.baslik,
      tr.gorevler.seniIzledimPush.govde,
      "/gorevler"
    );
  }
  return dusen;
}

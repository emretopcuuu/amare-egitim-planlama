import "server-only";
import type { supabaseAdmin } from "@/lib/supabase/server";
import { herkeseBildir } from "@/lib/push";
import { hedefCekirdek } from "@/lib/hedef";
import { pusulaCekirdek } from "@/lib/pusula";
import { tr } from "@/lib/i18n/tr";

type Db = ReturnType<typeof supabaseAdmin>;

// Özellik 4 — SESLİ MEKTUP (90 gün sonraki kendine). Gün 2 akşamı orkestratör
// FONKSIYONLAR'dan çağrılır (senaryo satırı 'gun2_sesli_mektup_ac'). Herkese
// kind='yansima' özel görevi düşer: 60 sn'lik sesli mektup. Görev gövdesi
// STATİK şablondur; 3 fısıltı sorusu kişinin hedef (kariyer planı) + pusula
// (iç engel, çekirdek neden) verisinden değişkenle kurulur — AI çağrısı yok.
// Kayıt /api/sesli-mektup ile 'sesler' bucket'ına gider, sesli_mektuplar'a
// acilis_at = +90 gün ile mühürlenir; Eylül Aynası o gün geri getirir.

/** Mektubun mühür süresi: kayıttan bu kadar gün sonra açılır. */
export const MEKTUP_ACILIS_GUN = 90;

/** Görev penceresi: akşam 21:00'de düşer, gece yarısına kadar açık. */
const MEKTUP_SURE_SAAT = 3;

/** Bir missions satırı sesli mektup görevi mi? (kind + tr.ts başlığı —
 * başlık tek doğruluk kaynağı olduğu için ayrı kolon gerekmez.) */
export function sesliMektupGoreviMi(g: { kind: string; title: string }): boolean {
  return g.kind === "yansima" && g.title === tr.gorevler.sesliMektupBaslik;
}

/** Kişinin hedef/engel verisinden 3 fısıltı kur (eksik veri → genel hâli). */
function fisiltilarKur(
  hedef: Awaited<ReturnType<typeof hedefCekirdek>>,
  pusula: Awaited<ReturnType<typeof pusulaCekirdek>>
): string[] {
  const t = tr.gorevler;
  const rutbe = hedef?.plan?.rutbe?.trim() || null;
  const engel = pusula?.ic_engel?.trim() || null;
  const neden = pusula?.cekirdek_neden?.[0]?.trim() || null;
  return [
    rutbe ? t.mektupFisiltiHedef(rutbe) : t.mektupFisiltiHedefGenel,
    engel ? t.mektupFisiltiEngel(engel.slice(0, 120)) : t.mektupFisiltiEngelGenel,
    neden ? t.mektupFisiltiNeden(neden.slice(0, 120)) : t.mektupFisiltiNedenGenel,
  ];
}

/** Orkestratör eylemi: tüm katılımcılara sesli mektup görevini düşür + push.
 * İdempotent: görevi zaten almış kişiye ikinci kez düşmez (admin "şimdi
 * ateşle" ile çift tetiklense bile). */
export async function sesliMektupAc(db: Db): Promise<void> {
  const { data: kisiler } = await db
    .from("participants")
    .select("id")
    .eq("role", "participant");
  if (!kisiler?.length) return;

  // Daha önce bu görevi almış olanlar (başlık = tanıma anahtarı).
  const { data: mevcutlar } = await db
    .from("missions")
    .select("participant_id")
    .eq("kind", "yansima")
    .eq("title", tr.gorevler.sesliMektupBaslik);
  const alanlar = new Set((mevcutlar ?? []).map((m) => m.participant_id));

  const simdi = new Date();
  const due = new Date(simdi.getTime() + MEKTUP_SURE_SAAT * 3_600_000).toISOString();
  let dusen = 0;
  for (const k of kisiler) {
    if (alanlar.has(k.id)) continue;
    // Fısıltılar kişiye özel — statik şablon + hedef/engel değişkenleri.
    const [hedef, pusula] = await Promise.all([
      hedefCekirdek(db, k.id).catch(() => null),
      pusulaCekirdek(db, k.id).catch(() => null),
    ]);
    const { error } = await db.from("missions").insert({
      participant_id: k.id,
      kind: "yansima",
      title: tr.gorevler.sesliMektupBaslik,
      body: tr.gorevler.sesliMektupGovde(fisiltilarKur(hedef, pusula)),
      difficulty: 2,
      issued_at: simdi.toISOString(),
      due_at: due,
    });
    if (!error) dusen++;
  }
  if (dusen > 0) {
    await herkeseBildir(
      db,
      tr.gorevler.mektupPush.baslik,
      tr.gorevler.mektupPush.govde,
      "/gorevler"
    );
  }
}

export type AcikMektup = { id: string; acilisAt: string };

/** 90-gün follow-up kartı için: açılış tarihi gelmiş ve henüz dinlenmemiş
 * mektup (en eskisi). Yoksa null. */
export async function acikMektup(db: Db, pid: string): Promise<AcikMektup | null> {
  const { data } = await db
    .from("sesli_mektuplar")
    .select("id, acilis_at")
    .eq("participant_id", pid)
    .lte("acilis_at", new Date().toISOString())
    .is("dinlendi_at", null)
    .order("acilis_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ? { id: data.id, acilisAt: data.acilis_at } : null;
}

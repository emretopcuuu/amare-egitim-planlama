import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { gorevUret } from "@/lib/ayna";
import { kampGunu } from "@/lib/kampProgrami";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 60;

// "Bana ekstra görev ver" — kişi boş zamanında, kendi isteğiyle ek bir görev
// ister (puanını artırmak / vakti değerlendirmek). Kaynak göreve bağlı DEĞİL;
// AYNA taze bir kas çalıştıran yeni bir görev üretir. Bekleyen görev varsa
// üretmez (telefonu tıkamasın — önce mevcut görev bitsin).
export async function POST() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }

  const db = supabaseAdmin();

  // Bekleyen görev varsa yeni üretme.
  const { count: bekleyen } = await db
    .from("missions")
    .select("id", { count: "exact", head: true })
    .eq("participant_id", session.sub)
    .eq("status", "pending");
  if ((bekleyen ?? 0) > 0) {
    return Response.json({ hata: tr.gorevler.ekstraBekleyenVar }, { status: 409 });
  }

  const { data: kisi } = await db
    .from("participants")
    .select("id, full_name, team")
    .eq("id", session.sub)
    .maybeSingle();
  if (!kisi) return Response.json({ hata: tr.gorevler.hata }, { status: 404 });

  // Istanbul saati + kamp/yolculuk modu.
  const simdi = new Date();
  const saat = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Istanbul",
      hour: "2-digit",
      hour12: false,
    })
      .formatToParts(simdi)
      .find((p) => p.type === "hour")?.value ?? 12
  );
  const bugun = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(simdi);
  const mod = kampGunu(bugun) ? "kamp" : "yolculuk";
  const gun = kampGunu(bugun) ?? 1;

  const ipucu =
    "Kişi BOŞ ZAMANINI değerlendirmek için kendi isteğiyle EKSTRA bir görev istedi " +
    "(puanını artırmak istiyor, isteklilik yüksek). Taze, motive edici, 1-2 saatte " +
    "yapılabilir bir görev üret; gelişime açık ya da bugün öne çıkan bir lider kasını çalıştır. " +
    "Bunun bir ödül/ekstra fırsat olduğunu hissettir, baskı kurma.";

  const gorev = await gorevUret(db, kisi, gun, saat, mod, null, null, ipucu);
  if (!gorev) return Response.json({ hata: tr.gorevler.ekstraOlmadi }, { status: 503 });

  const dueAt = new Date(simdi.getTime() + gorev.sure_saat * 3_600_000);
  const { error } = await db.from("missions").insert({
    participant_id: kisi.id,
    trait_id: gorev.trait_id,
    kind: gorev.kind,
    title: gorev.title,
    body: gorev.body,
    difficulty: gorev.difficulty,
    neden: gorev.neden,
    fayda: gorev.fayda,
    ipuclari: gorev.ipuclari,
    micro_sprint: gorev.micro_sprint,
    due_at: dueAt.toISOString(),
  });
  if (error) return Response.json({ hata: tr.gorevler.ekstraOlmadi }, { status: 500 });

  return Response.json({ ok: true });
}

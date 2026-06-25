import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { gorevUret } from "@/lib/ayna";
import { aktifOzellikler } from "@/lib/degerlendirme";
import { kampGunu } from "@/lib/kampProgrami";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 60;

// A5 — "Bu konuda bir görev daha". Tamamlanan bir görevin çalıştırdığı liderlik
// kasını, farklı bir açıdan tekrar çalıştıran yeni bir görev üretir (büyüme
// döngüsü). Bekleyen görev varsa üretmez (telefonu tıkamasın).
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }

  let govde: { gorevId?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.gorevler.hata }, { status: 400 });
  }
  if (typeof govde.gorevId !== "string") {
    return Response.json({ hata: tr.gorevler.hata }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Bekleyen görev varsa yeni üretme.
  const { count: bekleyen } = await db
    .from("missions")
    .select("id", { count: "exact", head: true })
    .eq("participant_id", session.sub)
    .eq("status", "pending");
  if ((bekleyen ?? 0) > 0) {
    return Response.json({ hata: tr.gorevler.benzeriOlmaz }, { status: 409 });
  }

  const [{ data: kaynak }, { data: kisi }, ozellikler] = await Promise.all([
    db
      .from("missions")
      .select("title, trait_id")
      .eq("id", govde.gorevId)
      .eq("participant_id", session.sub)
      .maybeSingle(),
    db.from("participants").select("id, full_name, team").eq("id", session.sub).maybeSingle(),
    aktifOzellikler(db),
  ]);
  if (!kaynak || !kisi) return Response.json({ hata: tr.gorevler.hata }, { status: 404 });

  const kasAd = ozellikler.find((o) => o.id === kaynak.trait_id)?.name ?? null;
  const ipucu =
    `Kişi az önce bitirdiği bir görevin ardından AYNI konuda bir görev daha istedi. ` +
    `${kasAd ? `Hedef liderlik kası: "${kasAd}". ` : ""}` +
    `Önceki görev: "${kaynak.title}". Aynı kası FARKLI ve taze bir açıdan, tekrar etmeden çalıştır.`;

  // Istanbul saati + kamp/yolculuk modu.
  const simdi = new Date();
  const istParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(simdi);
  const saat = Number(istParts.find((p) => p.type === "hour")?.value ?? 12);
  const bugun = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(simdi);
  const mod = kampGunu(bugun) ? "kamp" : "yolculuk";
  const gun = kampGunu(bugun) ?? 1;

  const gorev = await gorevUret(db, kisi, gun, saat, mod, null, null, ipucu);
  if (!gorev) return Response.json({ hata: tr.gorevler.benzeriOlmaz }, { status: 503 });

  const dueAt = new Date(simdi.getTime() + gorev.sure_saat * 3_600_000);
  const { error } = await db.from("missions").insert({
    participant_id: kisi.id,
    trait_id: gorev.trait_id,
    kind: gorev.kind,
    title: gorev.title,
    body: gorev.body,
    difficulty: gorev.difficulty,
    neden: gorev.neden,
    micro_sprint: gorev.micro_sprint,
    due_at: dueAt.toISOString(),
  });
  if (error) return Response.json({ hata: tr.gorevler.benzeriOlmaz }, { status: 500 });

  return Response.json({ ok: true });
}

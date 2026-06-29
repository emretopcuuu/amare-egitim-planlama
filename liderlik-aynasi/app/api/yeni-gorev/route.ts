import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { gorevUret } from "@/lib/ayna";
import { kampGunu } from "@/lib/kampProgrami";
import { kampBaslangicGetir } from "@/lib/kampZaman";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 60;

// "Yeni görev iste" — kişi beklemek yerine AYNA'dan o an taze bir görev çeker.
// Bekleyen görev varsa üretmez (telefon görev yağmuruna dönmesin + AI maliyeti):
// önce eldekini bitir, sonra iste. Görev normal kas rotasyonundan (kişiye özel)
// üretilir; gorev-tekrar'dan farkı: belirli bir görevi değil, sıfırdan yeni üretir.
export async function POST() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }

  const db = supabaseAdmin();

  // Bekleyen görev varsa yeni üretme — önce eldekini bitirsin.
  const { count: bekleyen } = await db
    .from("missions")
    .select("id", { count: "exact", head: true })
    .eq("participant_id", session.sub)
    .eq("status", "pending");
  if ((bekleyen ?? 0) > 0) {
    return Response.json({ hata: tr.gorevler.zatenGorevVar, kod: "var" }, { status: 409 });
  }

  const { data: kisi } = await db
    .from("participants")
    .select("id, full_name, team")
    .eq("id", session.sub)
    .maybeSingle();
  if (!kisi) return Response.json({ hata: tr.gorevler.hata }, { status: 404 });

  // Istanbul saati + kamp günü (dinamik başlangıçtan).
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
  const kampBaslangic = await kampBaslangicGetir(db);
  const mod = kampGunu(bugun, kampBaslangic) ? "kamp" : "yolculuk";
  const gun = kampGunu(bugun, kampBaslangic) ?? 1;

  const gorev = await gorevUret(db, kisi, gun, saat, mod, null);
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
  if (error) return Response.json({ hata: tr.gorevler.hata }, { status: 500 });

  return Response.json({ ok: true });
}

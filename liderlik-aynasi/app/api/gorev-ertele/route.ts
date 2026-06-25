import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// UX #2 — "Şimdi uygun değilim → ertele". Kişi sahnedeyken/meşgulken görevi
// öteler; teslim saati 2 saat ileri alınır, hatırlatma sıfırlanır (yeniden
// dürtülsün). Kötüye kullanımı önlemek için en fazla 2 kez.
const ERTELE_SAAT = 2;
const ERTELE_UST = 2;

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
  const { data: gorev } = await db
    .from("missions")
    .select("id, status, due_at, ertelenme_sayisi, kind")
    .eq("id", govde.gorevId)
    .eq("participant_id", session.sub)
    .maybeSingle();

  if (!gorev || gorev.status !== "pending") {
    return Response.json({ hata: tr.gorevler.hata }, { status: 409 });
  }
  // SÖZ/SENKRON ertelenmez (zaman-bağlı kolektif anlar).
  if (gorev.kind === "soz" || gorev.kind === "senkron") {
    return Response.json({ hata: tr.gorevler.hata }, { status: 409 });
  }
  if ((gorev.ertelenme_sayisi ?? 0) >= ERTELE_UST) {
    return Response.json({ hata: tr.gorevler.erteleBitti }, { status: 409 });
  }

  // Yeni teslim: mevcut son tarih ya da şimdi (hangisi ileriyse) + 2 saat.
  const taban = Math.max(Date.now(), new Date(gorev.due_at).getTime());
  const yeniDue = new Date(taban + ERTELE_SAAT * 3_600_000).toISOString();

  const { error } = await db
    .from("missions")
    .update({
      due_at: yeniDue,
      ertelenme_sayisi: (gorev.ertelenme_sayisi ?? 0) + 1,
      reminded_at: null, // yeni pencerede tekrar hatırlatılsın
    })
    .eq("id", gorev.id)
    .eq("status", "pending");

  if (error) return Response.json({ hata: tr.gorevler.hata }, { status: 500 });
  return Response.json({ ok: true });
}

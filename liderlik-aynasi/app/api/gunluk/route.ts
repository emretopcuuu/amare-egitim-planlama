import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// #5 + GELİŞTİRME #8 (2.tur): Günlük check-in / "Tek Cümle".
//  - {traitId, notu}: özellik-bazlı check-in (mevcut davranış).
//  - {notu}: serbest-metin günlük yansıma (Tek Cümle); trait gerektirmez.
// GET: günün sorusu (deterministik, herkese aynı) + bugünkü cümle + seri (streak).

const SORULAR = [
  "Bugün seni en çok zorlayan an neydi?",
  "Bugün kendinle ilgili ne fark ettin?",
  "Yarın bir şeyi farklı yapsan, ne olurdu?",
  "Bugün kime, ne için minnettarsın?",
  "Bugün attığın en cesur adım neydi?",
  "Bugün hangi küçük zafer seni gülümsetti?",
  "Bugün ertelediğin ama yapman gereken neydi?",
];

function istBugun(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
}
function gununSorusu(tarih: string): string {
  const g = Math.floor(new Date(`${tarih}T00:00:00Z`).getTime() / 86_400_000);
  return SORULAR[((g % SORULAR.length) + SORULAR.length) % SORULAR.length];
}
function seriHesapla(tarihler: string[], bugun: string): number {
  const set = new Set(tarihler);
  let seri = 0;
  const d = new Date(`${bugun}T00:00:00Z`);
  if (!set.has(bugun)) d.setUTCDate(d.getUTCDate() - 1); // bugün boşsa seri dünden sayılır
  while (set.has(d.toISOString().slice(0, 10))) {
    seri++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return seri;
}

export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.gunluk.hata }, { status: 401 });
  }
  const db = supabaseAdmin();
  const bugun = istBugun();
  const { data } = await db
    .from("gunluk_checkin")
    .select("tarih, notu")
    .eq("participant_id", session.sub)
    .order("tarih", { ascending: false })
    .limit(120);
  const rows = (data ?? []) as { tarih: string; notu: string | null }[];
  return Response.json({
    soru: gununSorusu(bugun),
    bugunNotu: rows.find((r) => r.tarih === bugun)?.notu ?? null,
    seri: seriHesapla(rows.map((r) => r.tarih), bugun),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.gunluk.hata }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { traitId?: unknown; notu?: unknown } | null;
  const notu = typeof body?.notu === "string" ? body.notu.trim().slice(0, 500) || null : null;
  const traitId = Number(body?.traitId);
  const tarih = istBugun();
  const db = supabaseAdmin();

  if (Number.isInteger(traitId)) {
    // Özellik-bazlı check-in (mevcut akış).
    const { error } = await db
      .from("gunluk_checkin")
      .upsert({ participant_id: session.sub, tarih, trait_id: traitId, notu }, { onConflict: "participant_id,tarih" });
    if (error) return Response.json({ hata: error.message }, { status: 500 });
  } else {
    // Serbest-metin "Tek Cümle": mevcut trait'i clobber etmeden notu'yu yaz.
    if (!notu) return Response.json({ hata: tr.gunluk.hata }, { status: 400 });
    const { data: mevcut } = await db
      .from("gunluk_checkin")
      .select("id")
      .eq("participant_id", session.sub)
      .eq("tarih", tarih)
      .maybeSingle();
    if (mevcut) await db.from("gunluk_checkin").update({ notu }).eq("id", mevcut.id);
    else await db.from("gunluk_checkin").insert({ participant_id: session.sub, tarih, notu });
  }

  const { data } = await db
    .from("gunluk_checkin")
    .select("tarih")
    .eq("participant_id", session.sub)
    .order("tarih", { ascending: false })
    .limit(120);
  return Response.json({ ok: true, seri: seriHesapla((data ?? []).map((r) => r.tarih), tarih) });
}

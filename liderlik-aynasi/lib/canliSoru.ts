import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { herkeseBildir } from "@/lib/push";
import { provaDurum } from "@/lib/prova";

// ============================================================================
// KAPANIŞ Faz B — CANLI SORU: Emre'nin eğitiminde salona canlı soru sorma
// ============================================================================
// İki tip tek mekanizmada:
//   • 'nabiz' — hızlı nabız: seçenekli, /ekran'da canlı toplam (öneri 5).
//   • 'tohum' — "Emre'nin Sorusu": açık uçlu; cevap SÖZ'ün tohumu (öneri 6).
// Aynı anda her tipten en çok BİR 'acik' soru (kodla). Yanıtlar
// unique(soru,katılımcı) ile idempotent. Hepsi salt-sunucu (RLS deny-all).

export type CanliSoruTip = "nabiz" | "tohum";

export type CanliSoru = {
  id: string;
  soru: string;
  tip: CanliSoruTip;
  secenekler: string[] | null;
  durum: "acik" | "kapali";
};

function satirdan(r: {
  id: string;
  soru: string;
  tip: string;
  secenekler: unknown;
  durum: string;
}): CanliSoru {
  const sec = Array.isArray(r.secenekler)
    ? (r.secenekler as unknown[]).map(String).filter(Boolean)
    : null;
  return {
    id: r.id,
    soru: r.soru,
    tip: r.tip === "tohum" ? "tohum" : "nabiz",
    secenekler: sec && sec.length > 0 ? sec : null,
    durum: r.durum === "kapali" ? "kapali" : "acik",
  };
}

// Admin: yeni soru aç. Aynı tipten açık soruları kapatır, yenisini ekler,
// herkese push. nabız için seçenek şart; tohum açık uçlu.
export async function canliSoruAc(
  db: Db,
  opts: { soru: string; tip: CanliSoruTip; secenekler?: string[] | null }
): Promise<CanliSoru | null> {
  const soru = opts.soru.trim().slice(0, 240);
  if (soru.length < 3) return null;
  const secenekler =
    opts.tip === "nabiz"
      ? (opts.secenekler ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 6)
      : null;
  if (opts.tip === "nabiz" && (!secenekler || secenekler.length < 2)) return null;

  // Aynı tipten açık soruları kapat (tek canlı soru ilkesi).
  await db
    .from("canli_soru")
    .update({ durum: "kapali", kapandi_at: new Date().toISOString() })
    .eq("tip", opts.tip)
    .eq("durum", "acik");

  const { data, error } = await db
    .from("canli_soru")
    .insert({ soru, tip: opts.tip, secenekler: secenekler as unknown as never })
    .select("id, soru, tip, secenekler, durum")
    .single();
  if (error || !data) return null;

  // Duyuru yalnız kamp AÇIKKEN herkese; kapalıyken (onboarding) prova aktifse
  // herkeseBildir zaten prova kilidiyle tek kişiye gider. Kamp kapalı + prova
  // yoksa hiç push atma — 142 onboarding kullanıcısı boş bildirim almasın.
  const [{ data: aktifAyar }, prova] = await Promise.all([
    db.from("settings").select("value").eq("key", "ayna_aktif").maybeSingle(),
    provaDurum(db),
  ]);
  const pushYap = aktifAyar?.value === "true" || prova.aktif;
  if (pushYap) {
    await herkeseBildir(
      db,
      opts.tip === "tohum" ? "🌱 Emre'nin Sorusu" : "⚡ Canlı soru",
      opts.tip === "tohum"
        ? "Bir soru ekranda. Cevabın, vereceğin sözün tohumu olacak."
        : "Salona bir soru soruldu — telefonundan yanıtla.",
      "/gorevler"
    ).catch(() => {});
  }

  return satirdan(data);
}

export async function canliSoruKapat(db: Db, tip?: CanliSoruTip): Promise<void> {
  let q = db
    .from("canli_soru")
    .update({ durum: "kapali", kapandi_at: new Date().toISOString() })
    .eq("durum", "acik");
  if (tip) q = q.eq("tip", tip);
  await q;
}

// Telefon + /ekran: o an açık soru (tipe göre). Yoksa null.
export async function acikSoruGetir(db: Db, tip?: CanliSoruTip): Promise<CanliSoru | null> {
  let q = db
    .from("canli_soru")
    .select("id, soru, tip, secenekler, durum")
    .eq("durum", "acik")
    .order("created_at", { ascending: false })
    .limit(1);
  if (tip) q = q.eq("tip", tip);
  const { data } = await q.maybeSingle();
  return data ? satirdan(data) : null;
}

// Katılımcı yanıtı (idempotent upsert). tohum yanıtı = söz tohumu; Faz C
// sozSekillendir bu satırdan okur. Açık olmayan / var olmayan soruyu reddeder.
export async function canliSoruYanitla(
  db: Db,
  soruId: string,
  pid: string,
  yanit: string
): Promise<{ ok: boolean }> {
  const temiz = yanit.trim().slice(0, 600);
  if (temiz.length < 1) return { ok: false };
  const { data: soru } = await db
    .from("canli_soru")
    .select("id, durum")
    .eq("id", soruId)
    .maybeSingle();
  if (!soru || soru.durum !== "acik") return { ok: false };
  const { error } = await db
    .from("canli_soru_yanit")
    .upsert({ soru_id: soruId, participant_id: pid, yanit: temiz }, { onConflict: "soru_id,participant_id" });
  return { ok: !error };
}

export async function katilimciYanitiVarMi(db: Db, soruId: string, pid: string): Promise<boolean> {
  const { count } = await db
    .from("canli_soru_yanit")
    .select("id", { count: "exact", head: true })
    .eq("soru_id", soruId)
    .eq("participant_id", pid);
  return (count ?? 0) > 0;
}

// /ekran canlı toplam: nabız sorusunun seçenek dağılımı + toplam yanıt.
export type NabizToplam = {
  soru: string;
  toplam: number;
  dagilim: { secenek: string; adet: number }[];
};

export async function nabizToplami(db: Db, soru: CanliSoru): Promise<NabizToplam> {
  const { data } = await db.from("canli_soru_yanit").select("yanit").eq("soru_id", soru.id);
  const yanitlar = ((data ?? []) as { yanit: string }[]).map((y) => y.yanit);
  const secenekler = soru.secenekler ?? [];
  const say = new Map<string, number>(secenekler.map((s) => [s, 0]));
  for (const y of yanitlar) {
    if (say.has(y)) say.set(y, (say.get(y) ?? 0) + 1);
  }
  return {
    soru: soru.soru,
    toplam: yanitlar.length,
    dagilim: [...say.entries()].map(([secenek, adet]) => ({ secenek, adet })),
  };
}

// Kişinin bir tohum sorusuna verdiği en son yanıt — Faz C söz taslağı okur.
export async function tohumYanitiGetir(db: Db, pid: string): Promise<string | null> {
  const { data: sorular } = await db
    .from("canli_soru")
    .select("id")
    .eq("tip", "tohum")
    .order("created_at", { ascending: false })
    .limit(10);
  const ids = ((sorular ?? []) as { id: string }[]).map((s) => s.id);
  if (ids.length === 0) return null;
  const { data } = await db
    .from("canli_soru_yanit")
    .select("yanit")
    .eq("participant_id", pid)
    .in("soru_id", ids)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { yanit?: string } | null)?.yanit ?? null;
}

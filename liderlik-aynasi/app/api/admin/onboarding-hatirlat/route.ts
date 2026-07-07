import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { katilimciyaBildir } from "@/lib/push";
import { yazAuditLog } from "@/lib/auditLog";

// [Radar v2] Onboarding hatırlatması: Değerler'i bitirmemiş veya oyununu seçmemiş
// (team boş) katılımcılara net dürtü. katilimciyaBildir hem push'lar HEM gelen
// kutusuna yazar → push izni olmayan da uygulama içinde görür. Her gönderim
// onboarding_hatirlatma'ya kaydedilir (geçmiş + soğuma + dönüşüm). Soğuma: aynı
// kişiye aynı aşama için 2 saat içinde tekrar gönderilmez (spam koruması).
// Tekil (kisiId) veya toplu (tüm eksikler) çalışır.
const COOLDOWN_MS = 2 * 60 * 60 * 1000;

const HEDEFLER = {
  degerler: {
    baslik: "Değerler çalışman yarım kaldı",
    govde: "Birkaç dakika ayır, üç temel değerini tamamla — kampa hazır gel. 💎",
    url: "/degerler",
  },
  oyun: {
    baslik: "Oyununu henüz seçmedin",
    govde: "Cumartesi oyunlarından ikisini seç, grubun belirlensin. 🎲",
    url: "/oyun-secimi",
  },
} as const;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "admin") {
    return Response.json({ hata: "Yetkisiz" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as
    | { hedef?: string; kisiId?: string; kisiIds?: unknown; whatsapp?: boolean; asama?: string; genel?: boolean }
    | null;

  // [TOPLU DÜRT] Aşama fark etmeksizin seçili kişilere tek nazik hatırlatma
  // (uygulama-içi + push). Soğumada (son 2 saatte push/uygulama kanalından
  // dürtülmüş) olanlar atlanır — çift dürtme guard'ı. "Hiç dürtülmemişe gönder"
  // asıl elemesi UI'da yapılır; bu sunucu tarafı emniyet süpabı.
  if (body?.genel && Array.isArray(body?.kisiIds)) {
    const db = supabaseAdmin();
    const ids = body.kisiIds.filter((x): x is string => typeof x === "string").slice(0, 300);
    if (ids.length === 0) return Response.json({ ok: true, gonderildi: 0, pushlu: 0, uygulama: 0, atlanan: 0 });
    const [{ data: aboneler }, { data: gecmis }] = await Promise.all([
      db.from("push_subscriptions").select("participant_id").in("participant_id", ids),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db as any)
        .from("onboarding_hatirlatma")
        .select("participant_id")
        .in("participant_id", ids)
        .in("kanal", ["push", "uygulama"])
        .gte("created_at", new Date(Date.now() - COOLDOWN_MS).toISOString()),
    ]);
    const pushluSet = new Set((aboneler ?? []).map((a) => a.participant_id));
    const sogumada = new Set(((gecmis ?? []) as { participant_id: string }[]).map((g) => g.participant_id));
    const baslik = "Kampa hazırlanıyoruz 🌅";
    const govde = "Hazırlık adımların seni bekliyor — birkaç dakika ayır, kaldığın yerden devam et.";
    let gonderildi = 0, pushlu = 0, atlanan = 0;
    const kayitlar: { participant_id: string; hedef: string; kanal: string }[] = [];
    for (const id of ids) {
      if (sogumada.has(id)) { atlanan++; continue; }
      await katilimciyaBildir(db, id, baslik, govde, "/").catch(() => {});
      const pv = pushluSet.has(id);
      if (pv) pushlu++;
      kayitlar.push({ participant_id: id, hedef: "genel", kanal: pv ? "push" : "uygulama" });
      gonderildi++;
    }
    if (kayitlar.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).from("onboarding_hatirlatma").insert(kayitlar);
    }
    await yazAuditLog(db, session.sub, "onboarding_hatirlat", {
      hedef: "genel", gonderildi, pushlu, uygulama: gonderildi - pushlu, atlanan, toplu: true,
    });
    return Response.json({ ok: true, gonderildi, pushlu, uygulama: gonderildi - pushlu, atlanan });
  }

  // WhatsApp tıklaması: dış uygulama açılıyor; burada yalnız "gönderildi" niyetini
  // kayda alırız (kanal='whatsapp') — kişi başı WhatsApp sayacı için. Push YOK.
  if (body?.whatsapp && typeof body.kisiId === "string") {
    const db2 = supabaseAdmin();
    const asama = typeof body.asama === "string" && body.asama ? body.asama.slice(0, 40) : "genel";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db2 as any)
      .from("onboarding_hatirlatma")
      .insert({ participant_id: body.kisiId, hedef: asama, kanal: "whatsapp" });
    return Response.json({ ok: true, whatsapp: 1 });
  }

  const hedef = body?.hedef;
  if (hedef !== "degerler" && hedef !== "oyun") {
    return Response.json({ hata: "Geçersiz hedef." }, { status: 400 });
  }
  const tekilId = typeof body?.kisiId === "string" ? body.kisiId : null;
  // Belirli kişi kümesi (UI'nın gösterdiği tam liste) — verilirse yalnız onlar.
  const idKumesi = Array.isArray(body?.kisiIds)
    ? new Set(body.kisiIds.filter((x): x is string => typeof x === "string"))
    : null;
  const mesaj = HEDEFLER[hedef];

  const db = supabaseAdmin();
  const [{ data: kisiler }, { data: tamamlar }, { data: aboneler }, { data: gecmis }] =
    await Promise.all([
      db.from("participants").select("id").eq("role", "participant"),
      hedef === "degerler"
        ? db.from("degerler_calismasi").select("participant_id").not("tamamlandi_at", "is", null)
        : db.from("participants").select("id").eq("role", "participant").not("team", "is", null),
      db.from("push_subscriptions").select("participant_id"),
      // onboarding_hatirlatma: üretilmiş tipler henüz içermiyor → bilinçli cast.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db as any)
        .from("onboarding_hatirlatma")
        .select("participant_id, created_at")
        .eq("hedef", hedef)
        .gte("created_at", new Date(Date.now() - COOLDOWN_MS).toISOString()),
    ]);

  const tamamSet = new Set(
    (tamamlar ?? []).map((r) => ("participant_id" in r ? r.participant_id : (r as { id: string }).id))
  );
  const pushluSet = new Set((aboneler ?? []).map((a) => a.participant_id));
  // Soğumada olanlar (son 2 saatte bu aşama için hatırlatılmış).
  const sogumada = new Set(
    ((gecmis ?? []) as { participant_id: string }[]).map((g) => g.participant_id)
  );

  let hedefler = (kisiler ?? []).filter((k) => !tamamSet.has(k.id));
  if (tekilId) hedefler = hedefler.filter((k) => k.id === tekilId);
  else if (idKumesi) hedefler = hedefler.filter((k) => idKumesi.has(k.id));

  let gonderildi = 0;
  let pushlu = 0;
  let atlanan = 0;
  const kayitlar: { participant_id: string; hedef: string; kanal: string }[] = [];
  for (const k of hedefler) {
    if (sogumada.has(k.id)) {
      atlanan++;
      continue;
    }
    await katilimciyaBildir(db, k.id, mesaj.baslik, mesaj.govde, mesaj.url);
    const pushVar = pushluSet.has(k.id);
    if (pushVar) pushlu++;
    kayitlar.push({ participant_id: k.id, hedef, kanal: pushVar ? "push" : "uygulama" });
    gonderildi++;
  }

  if (kayitlar.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).from("onboarding_hatirlatma").insert(kayitlar);
  }

  await yazAuditLog(db, session.sub, "onboarding_hatirlat", {
    hedef,
    gonderildi,
    pushlu,
    uygulama: gonderildi - pushlu,
    atlanan,
    tekil: !!tekilId,
  });
  return Response.json({ ok: true, gonderildi, pushlu, uygulama: gonderildi - pushlu, atlanan });
}

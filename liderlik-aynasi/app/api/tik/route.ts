import { supabaseAdmin } from "@/lib/supabase/server";
import {
  gorevUret,
  gorevPuanla,
  gorevAraligiDk,
  istanbulSaati,
  sessizSaatMi,
} from "@/lib/ayna";
import { kivilcimHesapla } from "@/lib/kivilcim";
import { katilimciyaBildir, herkeseBildir } from "@/lib/push";

export const maxDuration = 60;

// AYNA'nın kalp atışı. Supabase pg_cron 5 dakikada bir çağırır (gizli başlıkla).
// Her tik sınırlıdır: en fazla 3 görev üretimi + 2 gecikmiş puanlama — süre
// sınırına asla yaklaşmaz; 5 dk'lık ritim toplam debiyi fazlasıyla karşılar.
//
// Adımlar: süre dolanları kapat → (sessiz saatte dur) → gecikmiş puanlama →
// görev dağıt → teslim hatırlatması → program duyurusu → günlük fısıltı.

function istanbulTarihi(an: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(an);
}

export async function POST(req: Request) {
  const beklenen = process.env.AYNA_TIK_SECRET;
  if (!beklenen || req.headers.get("x-ayna-anahtar") !== beklenen) {
    return Response.json({ hata: "Yetkisiz." }, { status: 401 });
  }

  // Admin'in elle bastığı test tiki sessiz saati yok sayar (gece prova yapılabilsin);
  // cron'dan gelen olağan tikler kurala uyar.
  const testModu = req.headers.get("x-ayna-test") === "1";

  const db = supabaseAdmin();
  const simdi = new Date();
  const sessiz = sessizSaatMi(simdi) && !testModu;
  const ozet = { uretilen: 0, puanlanan: 0, hatirlatilan: 0, acilan: 0, fisilti: 0 };

  // 1) Süresi dolan görevleri kapat (her durumda, sessiz saatte bile)
  await db
    .from("missions")
    .update({ status: "expired" })
    .eq("status", "pending")
    .lt("due_at", simdi.toISOString());

  const { data: ayarlar } = await db
    .from("settings")
    .select("key, value")
    .in("key", ["ayna_aktif", "ayna_tempo", "ayna_baslangic"]);
  const ayar = new Map((ayarlar ?? []).map((a) => [a.key, a.value]));

  if (ayar.get("ayna_aktif") !== "true") {
    return Response.json({ ozet: "AYNA uyuyor (pasif)", ...ozet });
  }

  // 2) Gecikmiş puanlama — normalde yanıt anında puanlanır; bu, kurtarma hattı
  const { data: bekleyenler } = await db
    .from("missions")
    .select("id, participant_id, kind, title, body, response_text, responded_at, due_at")
    .eq("status", "submitted")
    .limit(2);
  for (const g of bekleyenler ?? []) {
    if (!g.response_text) continue;
    const sonuc = await gorevPuanla(g, g.response_text);
    if (!sonuc) continue;
    const zamaninda =
      !!g.responded_at && new Date(g.responded_at) <= new Date(g.due_at);
    const kivilcim = kivilcimHesapla(sonuc.puan, zamaninda);
    await db
      .from("missions")
      .update({
        status: "scored",
        ai_score: sonuc.puan,
        ai_comment: sonuc.yorum,
        scored_at: simdi.toISOString(),
        spark_points: kivilcim,
      })
      .eq("id", g.id);
    ozet.puanlanan++;
    if (!sessiz) {
      await katilimciyaBildir(
        db,
        g.participant_id,
        `AYNA puanladı: ${sonuc.puan}/10 ⚡`,
        sonuc.yorum
      );
    }
  }

  if (sessiz) {
    return Response.json({ ozet: "Sessiz saat — AYNA fısıldamıyor", ...ozet });
  }

  // 3) Görev dağıtımı
  const bugun = istanbulTarihi(simdi);
  const { saat } = istanbulSaati(simdi);
  const baslangic = ayar.get("ayna_baslangic");
  const gun = baslangic
    ? Math.min(
        4,
        Math.floor((simdi.getTime() - new Date(baslangic).getTime()) / 86_400_000) + 1
      )
    : 1;

  const [{ data: kisiler }, { data: sonGorevler }] = await Promise.all([
    db.from("participants").select("id, full_name, team").eq("role", "participant"),
    db
      .from("missions")
      .select("participant_id, status, issued_at, kind")
      .gte("issued_at", new Date(simdi.getTime() - 26 * 3_600_000).toISOString()),
  ]);

  type Durum = { bekleyen: boolean; bugunSayisi: number; sonVerilis: number };
  const durumlar = new Map<string, Durum>();
  for (const g of sonGorevler ?? []) {
    const d =
      durumlar.get(g.participant_id) ??
      ({ bekleyen: false, bugunSayisi: 0, sonVerilis: 0 } as Durum);
    if (g.status === "pending" || g.status === "submitted") d.bekleyen = true;
    if (istanbulTarihi(new Date(g.issued_at)) === bugun) d.bugunSayisi++;
    d.sonVerilis = Math.max(d.sonVerilis, new Date(g.issued_at).getTime());
    durumlar.set(g.participant_id, d);
  }

  const tempo = ayar.get("ayna_tempo") ?? "surpriz";
  const uygunlar = (kisiler ?? [])
    .filter((k) => {
      const d = durumlar.get(k.id);
      if (!d) return true; // hiç görev almamış
      if (d.bekleyen || d.bugunSayisi >= 7) return false;
      const aralikDk = gorevAraligiDk(tempo, k.id, d.bugunSayisi);
      return simdi.getTime() - d.sonVerilis >= aralikDk * 60_000;
    })
    .sort(
      (a, b) =>
        (durumlar.get(a.id)?.sonVerilis ?? 0) - (durumlar.get(b.id)?.sonVerilis ?? 0)
    )
    .slice(0, 3);

  for (const k of uygunlar) {
    const gorev = await gorevUret(db, k, gun, saat);
    if (!gorev) continue;
    const dueAt = new Date(simdi.getTime() + gorev.sure_saat * 3_600_000);
    const { error } = await db.from("missions").insert({
      participant_id: k.id,
      trait_id: gorev.trait_id,
      kind: gorev.kind,
      title: gorev.title,
      body: gorev.body,
      due_at: dueAt.toISOString(),
    });
    if (error) continue;
    ozet.uretilen++;
    await katilimciyaBildir(
      db,
      k.id,
      `🤖 AYNA'dan yeni görev: ${gorev.title}`,
      gorev.body.length > 120 ? gorev.body.slice(0, 117) + "…" : gorev.body
    );
  }

  // 4) Teslim hatırlatması (son 30 dk, bir kez)
  const { data: yaklasanlar } = await db
    .from("missions")
    .select("id, participant_id, title")
    .eq("status", "pending")
    .is("reminded_at", null)
    .gt("due_at", simdi.toISOString())
    .lt("due_at", new Date(simdi.getTime() + 30 * 60_000).toISOString())
    .limit(10);
  for (const g of yaklasanlar ?? []) {
    await katilimciyaBildir(
      db,
      g.participant_id,
      "⏳ AYNA bekliyor…",
      `"${g.title}" görevin için son 30 dakika. Gözüm üzerinde.`
    );
    await db
      .from("missions")
      .update({ reminded_at: simdi.toISOString() })
      .eq("id", g.id);
    ozet.hatirlatilan++;
  }

  // 5) Program duyuruları (başlamadan reveal_minutes önce, herkese)
  const { data: maddeler } = await db
    .from("schedule_items")
    .select("id, starts_at, title, location, reveal_minutes")
    .eq("revealed", false)
    .gt("starts_at", new Date(simdi.getTime() - 3_600_000).toISOString())
    .order("starts_at")
    .limit(3);
  for (const m of maddeler ?? []) {
    const acilma = new Date(m.starts_at).getTime() - m.reveal_minutes * 60_000;
    if (acilma > simdi.getTime()) continue;
    const saatYazi = new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(m.starts_at));
    await herkeseBildir(
      db,
      `📅 AYNA açıklıyor: ${m.title}`,
      `${saatYazi}${m.location ? ` · ${m.location}` : ""} — Nedenini orada anlayacaksın.`
    );
    await db.from("schedule_items").update({ revealed: true }).eq("id", m.id);
    ozet.acilan++;
  }

  // 6) Günlük fısıltı (13-14 ve 20-21 aralığında birer kez): "bugün N göz seni puanladı"
  if (saat === 13 || saat === 20) {
    const dilim = saat === 13 ? "ogle" : "aksam";
    const anahtar = `fisilti_${bugun}_${dilim}`;
    const { data: gonderilmis } = await db
      .from("settings")
      .select("key")
      .eq("key", anahtar)
      .maybeSingle();
    if (!gonderilmis) {
      await db.from("settings").upsert({ key: anahtar, value: "1" });
      const gunBasiUtc = new Date(`${bugun}T00:00:00+03:00`).toISOString();
      const { data: bugunPuanlar } = await db
        .from("ratings")
        .select("target_id, is_self")
        .gte("created_at", gunBasiUtc);
      const sayilar = new Map<string, number>();
      for (const p of bugunPuanlar ?? []) {
        if (p.is_self) continue;
        sayilar.set(p.target_id, (sayilar.get(p.target_id) ?? 0) + 1);
      }
      for (const [pid, n] of sayilar) {
        if (n < 1) continue;
        await katilimciyaBildir(
          db,
          pid,
          "👁 AYNA'nın fısıltısı",
          `Bugün ${n} değerlendirme aldın. Kim, kaç verdi? Gün 3'te aynanda. Sen sen ol, gözlemlemeye devam et.`,
          "/degerlendir"
        );
        ozet.fisilti++;
      }
    }
  }

  return Response.json({ ozet: "tamam", ...ozet });
}

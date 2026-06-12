import { supabaseAdmin } from "@/lib/supabase/server";
import {
  gorevUret,
  gorevPuanla,
  senkronGorevUret,
  gorevAraligiDk,
  istanbulSaati,
  sessizSaatMi,
} from "@/lib/ayna";
import { kivilcimHesapla } from "@/lib/kivilcim";
import {
  kaymaKarari,
  senkronAnahtari,
  senkronYedekSec,
  yolculukGunuHesapla,
  type SistemModu,
} from "@/lib/davranis";
import { momentumHesaplaVeYaz } from "@/lib/momentum";
import { gorevSeslendir } from "@/lib/yansima";
import {
  higgsYapilandirildiMi,
  yansimaVideosuBaslat,
  yansimaDurumu,
} from "@/lib/higgs";
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
  const ozet = {
    uretilen: 0,
    puanlanan: 0,
    hatirlatilan: 0,
    acilan: 0,
    fisilti: 0,
    senkron: 0,
    durtulen: 0,
    momentum: 0,
  };

  // 1) Süresi dolan görevleri kapat (her durumda, sessiz saatte bile)
  await db
    .from("missions")
    .update({ status: "expired" })
    .eq("status", "pending")
    .lt("due_at", simdi.toISOString());

  const { data: ayarlar } = await db
    .from("settings")
    .select("key, value")
    .in("key", [
      "ayna_aktif",
      "ayna_tempo",
      "ayna_baslangic",
      "sistem_modu",
      "yolculuk_baslangic",
    ]);
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
  const mod: SistemModu =
    ayar.get("sistem_modu") === "yolculuk" ? "yolculuk" : "kamp";
  const yolculukBaslangic = ayar.get("yolculuk_baslangic");
  const baslangic = ayar.get("ayna_baslangic");
  const gun =
    mod === "yolculuk" && yolculukBaslangic
      ? Math.min(90, yolculukGunuHesapla(yolculukBaslangic, simdi))
      : baslangic
        ? Math.min(
            4,
            Math.floor(
              (simdi.getTime() - new Date(baslangic).getTime()) / 86_400_000
            ) + 1
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
  // Yolculuk modunda ritim sakindir: günde TEK görev, 09-11 sabah penceresi
  const gunlukUst = mod === "yolculuk" ? 1 : 7;
  const yolculukPenceresi = mod !== "yolculuk" || (saat >= 9 && saat < 11);
  const uygunlar = (kisiler ?? [])
    .filter((k) => {
      if (!yolculukPenceresi) return false;
      const d = durumlar.get(k.id);
      if (!d) return true; // hiç görev almamış
      if (d.bekleyen || d.bugunSayisi >= gunlukUst) return false;
      const aralikDk = gorevAraligiDk(tempo, k.id, d.bugunSayisi);
      return simdi.getTime() - d.sonVerilis >= aralikDk * 60_000;
    })
    .sort(
      (a, b) =>
        (durumlar.get(a.id)?.sonVerilis ?? 0) - (durumlar.get(b.id)?.sonVerilis ?? 0)
    )
    .slice(0, 3);

  for (const k of uygunlar) {
    const gorev = await gorevUret(db, k, gun, saat, mod);
    if (!gorev) continue;
    const dueAt = new Date(simdi.getTime() + gorev.sure_saat * 3_600_000);
    const { data: yeniGorev, error } = await db
      .from("missions")
      .insert({
        participant_id: k.id,
        trait_id: gorev.trait_id,
        kind: gorev.kind,
        title: gorev.title,
        body: gorev.body,
        difficulty: gorev.difficulty,
        due_at: dueAt.toISOString(),
      })
      .select("id")
      .single();
    if (error || !yeniGorev) continue;
    ozet.uretilen++;
    await katilimciyaBildir(
      db,
      k.id,
      `🤖 AYNA'dan yeni görev: ${gorev.title}`,
      gorev.body.length > 120 ? gorev.body.slice(0, 117) + "…" : gorev.body
    );
    // YANSIMAN fısıltısı: kredi bütçesi için yalnız özel görevler seslendirilir
    if (gorev.kind === "gizli" || gorev.kind === "cesaret") {
      await gorevSeslendir(db, k.id, yeniGorev.id, gorev.title, gorev.body);
    }
  }

  // 3b) YANSIMA VİDEOLARI: ritüelde foto veren katılımcılar için Higgsfield
  // hattı — başlat (≤2), süreni kontrol et (≤3), hazır olanı fısılda (≤5).
  if (higgsYapilandirildiMi()) {
    const { data: bekleyenler } = await db
      .from("voice_profiles")
      .select("participant_id, photo_path")
      .eq("video_status", "bekliyor")
      .not("photo_path", "is", null)
      .limit(2);
    for (const b of bekleyenler ?? []) {
      const { data: imzali } = await db.storage
        .from("sesler")
        .createSignedUrl(b.photo_path!, 3600);
      const istek = imzali
        ? await yansimaVideosuBaslat(imzali.signedUrl)
        : null;
      await db
        .from("voice_profiles")
        .update(
          istek
            ? { video_status: "uretiliyor", video_request_id: istek }
            : { video_status: "hata" }
        )
        .eq("participant_id", b.participant_id);
    }

    const { data: surenler } = await db
      .from("voice_profiles")
      .select("participant_id, video_request_id")
      .eq("video_status", "uretiliyor")
      .not("video_request_id", "is", null)
      .limit(3);
    for (const s of surenler ?? []) {
      const d = await yansimaDurumu(s.video_request_id!);
      if (d.durum === "bekliyor") continue;
      if (d.durum === "hata") {
        await db
          .from("voice_profiles")
          .update({ video_status: "hata" })
          .eq("participant_id", s.participant_id);
        continue;
      }
      try {
        const yanit = await fetch(d.videoUrl);
        if (!yanit.ok) continue; // geçici: sonraki tikte yeniden dene
        const bayt = Buffer.from(await yanit.arrayBuffer());
        const yolu = `${s.participant_id}/yansima.mp4`;
        const yukleme = await db.storage
          .from("sesler")
          .upload(yolu, bayt, { contentType: "video/mp4", upsert: true });
        if (yukleme.error) continue;
        await db
          .from("voice_profiles")
          .update({ video_status: "hazir", video_path: yolu })
          .eq("participant_id", s.participant_id);
      } catch {
        // indirme takıldı: durum değişmez, sonraki tik dener
      }
    }

    const { data: hazirlar } = await db
      .from("voice_profiles")
      .select("participant_id")
      .eq("video_status", "hazir")
      .is("video_notified_at", null)
      .limit(5);
    for (const h of hazirlar ?? []) {
      await katilimciyaBildir(
        db,
        h.participant_id,
        "👁 Aynan seni gördü",
        "Suya bak — yansıman seni bekliyor.",
        "/yansiman"
      );
      await db
        .from("voice_profiles")
        .update({ video_notified_at: simdi.toISOString() })
        .eq("participant_id", h.participant_id);
    }
  }

  // 3c) SENKRON AN: herkese aynı anda aynı mikro görev (ambient sociability).
  // Pencere anahtarı settings kilidiyle tek seferliktir; üretim düşerse
  // deterministik yedek görev devreye girer — an asla boş geçmez.
  {
    const tarihParcalari = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    }).formatToParts(simdi);
    const haftaninGunu = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
      tarihParcalari.find((p) => p.type === "weekday")?.value ?? ""
    );
    const { dakika } = istanbulSaati(simdi);
    const anahtar = senkronAnahtari({
      mod,
      haftaninGunu,
      saat,
      dakika,
      tarih: bugun,
    });
    if (anahtar) {
      const { error: kilitHatasi } = await db
        .from("settings")
        .insert({ key: anahtar, value: "1" });
      // kilit alınamadıysa (zaten var) bu pencere işlenmiştir
      if (!kilitHatasi) {
        const uretilen =
          (await senkronGorevUret(mod)) ?? senkronYedekSec(anahtar);
        const dueAt = new Date(simdi.getTime() + 20 * 60_000).toISOString();
        const satirlar = (kisiler ?? []).map((k) => ({
          participant_id: k.id,
          kind: "senkron",
          title: uretilen.baslik,
          body: uretilen.govde,
          difficulty: 1,
          due_at: dueAt,
        }));
        if (satirlar.length > 0) {
          const { error: senkronHata } = await db.from("missions").insert(satirlar);
          if (!senkronHata) {
            ozet.senkron = satirlar.length;
            await herkeseBildir(
              db,
              "⏰ SENKRON AN",
              `${uretilen.baslik} — şu anda herkes bunu yapıyor. 20 dakikan var.`,
              "/gorevler"
            );
          }
        }
      }
    }
  }

  // 3d) KAYMA (CHURN) RADARI: sessizleşeni önce nazikçe dürt, eşik aşılırsa
  // lidere işaretle. Saat başı bir kez çalışır (settings kilidi).
  {
    const kaymaAnahtari = `kayma_${bugun}_${saat}`;
    const { error: kaymaKilit } = await db
      .from("settings")
      .insert({ key: kaymaAnahtari, value: "1" });
    if (!kaymaKilit) {
      const yedi = new Date(simdi.getTime() - 7 * 86_400_000).toISOString();
      const [{ data: sonYanitlar }, { data: sonPuanlar }, { data: radar }] =
        await Promise.all([
          db
            .from("missions")
            .select("participant_id, responded_at")
            .gte("responded_at", yedi),
          db.from("ratings").select("rater_id, created_at").gte("created_at", yedi),
          db.from("churn_radar").select("participant_id, nudged_at, admin_alerted_at"),
        ]);
      const sonEtkinlik = new Map<string, number>();
      for (const y of sonYanitlar ?? []) {
        if (!y.responded_at) continue;
        const t = new Date(y.responded_at).getTime();
        if (t > (sonEtkinlik.get(y.participant_id) ?? 0))
          sonEtkinlik.set(y.participant_id, t);
      }
      for (const p of sonPuanlar ?? []) {
        const t = new Date(p.created_at).getTime();
        if (t > (sonEtkinlik.get(p.rater_id) ?? 0)) sonEtkinlik.set(p.rater_id, t);
      }
      const radarHarita = new Map(
        (radar ?? []).map((r) => [r.participant_id, r])
      );
      for (const k of kisiler ?? []) {
        const iz = radarHarita.get(k.id);
        const karar = kaymaKarari(
          sonEtkinlik.get(k.id) ?? null,
          simdi.getTime(),
          mod,
          iz?.nudged_at ? new Date(iz.nudged_at).getTime() : null,
          iz?.admin_alerted_at ? new Date(iz.admin_alerted_at).getTime() : null
        );
        if (karar.nudge) {
          await katilimciyaBildir(
            db,
            k.id,
            "🌊 Su seni özledi",
            "Bir süredir sessizsin. Bu bir azar değil, bir el uzatma: küçücük bir adım bile suyu halkalandırır. Aynana bir bak.",
            "/"
          );
          ozet.durtulen += 1;
        }
        if (karar.nudge || karar.alert) {
          await db.from("churn_radar").upsert({
            participant_id: k.id,
            ...(karar.nudge ? { nudged_at: simdi.toISOString() } : {}),
            ...(karar.alert ? { admin_alerted_at: simdi.toISOString() } : {}),
            updated_at: simdi.toISOString(),
          });
        }
      }
    }
  }

  // 3e) HAFTALIK MOMENTUM: Cuma 17:00-17:09 penceresinde bir kez — herkese
  // davranış-eğilim skoru yazılır ve kişisel push gider.
  {
    const cumaMi =
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Istanbul",
        weekday: "short",
      }).format(simdi) === "Fri";
    const { dakika } = istanbulSaati(simdi);
    if (cumaMi && saat === 17 && dakika < 10) {
      const momentumAnahtari = `momentum_${bugun}`;
      const { error: momentumKilit } = await db
        .from("settings")
        .insert({ key: momentumAnahtari, value: "1" });
      if (!momentumKilit) {
        const sonuc = await momentumHesaplaVeYaz(db, simdi);
        ozet.momentum = sonuc.yazilan;
      }
    }
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

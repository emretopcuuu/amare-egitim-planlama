import "server-only";
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
import {
  kampGunu,
  suankiMadde,
  bitenMadde,
  sahneSessizMi,
  sabahPenceresiMi,
  GECE_FISILTILARI,
  geceYansimaMetni,
} from "@/lib/kampProgrami";
import {
  gorevSeslendir,
  itirazSesi,
  kaymaSesi,
  sabahSesi,
  fieroSesi,
  geceSesi,
  markaAnons,
} from "@/lib/yansima";
import {
  grupNoCozumle,
  cumartesiGrupEtkinligi,
  cumartesiGrupBitenEtkinlik,
} from "@/lib/cumartesiProgrami";
import { higgsYapilandirildiMi, yansimaDurumu } from "@/lib/higgs";
import { karakterUretimBaslat } from "@/lib/karakter";
import { katilimciyaBildir, herkeseBildir } from "@/lib/push";

type Db = ReturnType<typeof supabaseAdmin>;

function istanbulTarihi(an: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(an);
}

// AYNA'nın kalp atışı — TEK gerçek kaynak burada. Üretimde Supabase pg_cron
// `/api/tik` üzerinden GERÇEK zamanla (simdi = new Date()) çağırır. Admin
// "prova" yolu aynı fonksiyonu SEÇİLEN bir saatle çağırır (testModu=true):
// böylece görev/ses üretimi prova edilir ama canlı kamp asla etkilenmez.
//
// testModu: sessiz saat ve sahne sessizliğini yok sayar (gece/sahne sırasında
// bile prova yapılabilsin).
export async function tikCalistir(db: Db, simdi: Date, testModu: boolean) {
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
    return { ozet: "AYNA uyuyor (pasif)", ...ozet };
  }

  const mod: SistemModu =
    ayar.get("sistem_modu") === "yolculuk" ? "yolculuk" : "kamp";
  const sessiz = sessizSaatMi(simdi, mod) && !testModu;
  // SAHNE SESSİZLİĞİ: kürsüde biri varken AYNA telefon titretmez —
  // görev, hatırlatma, fısıltı ve dürtmeler bir sonraki pencereye sarkar.
  const bugun = istanbulTarihi(simdi);
  const { saat, dakika } = istanbulSaati(simdi);
  const kampGunuBugun = mod === "kamp" ? kampGunu(bugun) : null;
  const sahneSessiz =
    kampGunuBugun !== null &&
    sahneSessizMi(kampGunuBugun, saat * 60 + dakika) &&
    !testModu;
  const etkinlik = kampGunuBugun
    ? suankiMadde(kampGunuBugun, saat * 60 + dakika)
    : null;
  // GELİŞTİRME #7: az önce biten deneyimsel an (duygu sıcakken göreve bağla).
  const bitenEtkinlik = kampGunuBugun
    ? bitenMadde(kampGunuBugun, saat * 60 + dakika)
    : null;

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
    if (!sessiz && !sahneSessiz) {
      await katilimciyaBildir(
        db,
        g.participant_id,
        `AYNA puanladı: ${sonuc.puan}/10 ⚡`,
        sonuc.yorum
      );
      // FIERO: 10/10 — büyük ekran AYNA'nın sesiyle alkışlar,
      // yansıması da kişiye kendi sesiyle konuşur (Konuşan Yansıma kartı)
      if (sonuc.puan === 10) {
        const { data: kisi } = await db
          .from("participants")
          .select("full_name")
          .eq("id", g.participant_id)
          .maybeSingle();
        if (kisi) {
          await markaAnons(
            db,
            `anons/fiero-${g.id}.mp3`,
            `${kisi.full_name.split(" ")[0]}, az önce aynayı parlattı. On üzerinden on.`
          );
          await fieroSesi(db, g.participant_id, kisi.full_name);
        }
      }
    }
  }

  if (sessiz) {
    return { ozet: "Sessiz saat — AYNA fısıldamıyor", ...ozet };
  }

  // 3) Görev dağıtımı — kamp günü önce gerçek kamp tarihlerinden, yoksa
  // (prova) AYNA'nın ilk uyandırılma anından hesaplanır.
  const yolculukBaslangic = ayar.get("yolculuk_baslangic");
  const baslangic = ayar.get("ayna_baslangic");
  const gun =
    mod === "yolculuk" && yolculukBaslangic
      ? Math.min(90, yolculukGunuHesapla(yolculukBaslangic, simdi))
      : (kampGunuBugun ??
        (baslangic
          ? Math.min(
              4,
              Math.floor(
                (simdi.getTime() - new Date(baslangic).getTime()) / 86_400_000
              ) + 1
            )
          : 1));

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
      if (!yolculukPenceresi || sahneSessiz) return false;
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
    // Slice 3 — CUMARTESİ ETKİNLİK FARKINDALIĞI: Gün 2'de grup üyesine, grubunun
    // O ANKİ etkinliğine (David seansı, bowling, hazine avı, yemek...) özel görev
    // ver. AYNA etkinlik sırasında susmaz; göreve etkinliği katar (David'le foto/
    // soru, oyunda gözlem). Grup yoksa/çözülemezse genel kamp etkinliğine düşer.
    let kEtkinlik = etkinlik;
    let kBiten = bitenEtkinlik;
    let kIpucu: string | null = null;
    if (mod === "kamp" && gun === 2) {
      const grupNo = grupNoCozumle(k.team);
      if (grupNo) {
        const gunDk = saat * 60 + dakika;
        const cmt = cumartesiGrupEtkinligi(grupNo, gunDk);
        if (cmt) {
          kEtkinlik = cmt.madde;
          kIpucu = cmt.ipucu || null;
        }
        const cmtBiten = cumartesiGrupBitenEtkinlik(grupNo, gunDk);
        if (cmtBiten) kBiten = cmtBiten;
      }
    }
    const gorev = await gorevUret(db, k, gun, saat, mod, kEtkinlik, kBiten, kIpucu);
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
    // Ses katmanı: simülasyonda İTİRAZCI konuşur (stok ses, herkese);
    // gizli/cesarette YANSIMAN fısıldar (klon, bütçeli)
    if (gorev.kind === "simulasyon" && gorev.itiraz) {
      await itirazSesi(db, k.id, yeniGorev.id, gorev.itiraz);
    } else if (gorev.kind === "gizli" || gorev.kind === "cesaret") {
      await gorevSeslendir(db, k.id, yeniGorev.id, gorev.title, gorev.body);
    }
  }

  // 3b) YANSIMA VİDEOLARI: Higgsfield hattı — başlat (≤2), süreni kontrol et
  // (≤3), hazır olanı fısılda (≤5). Başlatma karakterUretimBaslat'a devredildi:
  // Canlı Ayna çoklu referansı (yenisi asıl) varsa onu, yoksa tek-foto (eski yedek).
  if (higgsYapilandirildiMi()) {
    const { data: bekleyenler } = await db
      .from("voice_profiles")
      .select("participant_id")
      .eq("video_status", "bekliyor")
      .limit(2);
    for (const b of bekleyenler ?? []) {
      await karakterUretimBaslat(db, b.participant_id);
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

    const { data: hazirlar } = sahneSessiz
      ? { data: [] }
      : await db
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

  // 3b2) SABAH YOKLAMASI: kamp Gün 2+ sabahları kendi sesinden günaydın.
  // Pencereler programa dikili: Gün 2 trekking öncesi 06:40-08:00,
  // Gün 3 kahvaltı boyunca 07:00-08:45; kamp tarihi dışında (prova)
  // 07:35-09:00. Tik başına ≤8 üretim; morning_date tekrarları engeller.
  if (mod === "kamp" && gun >= 2) {
    const sabahPenceresi = kampGunuBugun
      ? sabahPenceresiMi(kampGunuBugun, saat, dakika)
      : (saat === 7 && dakika >= 35) || saat === 8;
    if (sabahPenceresi) {
      const { data: sabahBekleyen } = await db
        .from("voice_profiles")
        .select("participant_id")
        .eq("status", "klonlandi")
        .or(`morning_date.is.null,morning_date.neq.${bugun}`)
        .limit(8);
      if ((sabahBekleyen ?? []).length > 0) {
        const dunBasi = new Date(
          new Date(`${bugun}T00:00:00+03:00`).getTime() - 86_400_000
        ).toISOString();
        const { data: dunPuanlar } = await db
          .from("ratings")
          .select("target_id, is_self")
          .gte("created_at", dunBasi)
          .lt("created_at", new Date(`${bugun}T00:00:00+03:00`).toISOString());
        const gozlemler = new Map<string, number>();
        for (const p of dunPuanlar ?? []) {
          if (p.is_self) continue;
          gozlemler.set(p.target_id, (gozlemler.get(p.target_id) ?? 0) + 1);
        }
        const adlar = new Map((kisiler ?? []).map((k) => [k.id, k.full_name]));
        for (const s of sabahBekleyen ?? []) {
          const ad = adlar.get(s.participant_id);
          if (!ad) continue;
          const oldu = await sabahSesi(
            db,
            s.participant_id,
            ad,
            gozlemler.get(s.participant_id) ?? 0,
            bugun
          );
          if (oldu) {
            await katilimciyaBildir(
              db,
              s.participant_id,
              "🌅 Aynan günaydın diyor",
              "Güne kendi sesinle başla — kısa bir mesajın var.",
              "/"
            );
          }
        }
      }
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
      const [
        { data: sonYanitlar },
        { data: sonPuanlar },
        { data: radar },
        { data: cumleler },
      ] = await Promise.all([
        db
          .from("missions")
          .select("participant_id, responded_at")
          .gte("responded_at", yedi),
        db.from("ratings").select("rater_id, created_at").gte("created_at", yedi),
        db.from("churn_radar").select("participant_id, nudged_at, admin_alerted_at"),
        // FAZ 2 re-entry: nüks anında geri çalınacak yeni cümleler
        db.from("bosluk_ani").select("participant_id, yeni_cumle").not("yeni_cumle", "is", null),
      ]);
      const cumleHarita = new Map(
        (cumleler ?? []).map((c) => [c.participant_id, c.yeni_cumle as string])
      );
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
        // Sahne sessizliğinde kişiye dürtme ertelenir (sonraki saate sarkar);
        // lider uyarısı sessiz kayıttır, sahnede de işlenebilir.
        const durtulebilir = karar.nudge && !sahneSessiz;
        if (durtulebilir || karar.alert) {
          await db.from("churn_radar").upsert({
            participant_id: k.id,
            ...(durtulebilir ? { nudged_at: simdi.toISOString() } : {}),
            ...(karar.alert ? { admin_alerted_at: simdi.toISOString() } : {}),
            updated_at: simdi.toISOString(),
          });
        }
        if (durtulebilir) {
          // Önce kendi sesinden mektup üretmeyi dene; sonra bildir
          const sesli = await kaymaSesi(db, k.id, k.full_name);
          // FAZ 2 reconsolidation bakımı: yeni cümle varsa onu geri çal —
          // nüks tam burada olur, çelişkiyi (yeni kimliği) o anda yeniden teslim et.
          const cumle = cumleHarita.get(k.id);
          await katilimciyaBildir(
            db,
            k.id,
            cumle
              ? "🪞 Cümleni hatırla"
              : sesli
                ? "🌊 Yansımandan sesli mesaj var"
                : "🌊 Su seni özledi",
            cumle
              ? `Kampta kendine şunu yazmıştın: "${cumle}". Eski cümle şu an kıpırdıyor olabilir — bugün küçücük bir adım yenisini yeniden doğrular.`
              : sesli
                ? "Kendi sesinden bir şey söylemek istiyor. Aç ve dinle."
                : "Bir süredir sessizsin. Bu bir azar değil, bir el uzatma: küçücük bir adım bile suyu halkalandırır.",
            "/"
          );
          ozet.durtulen += 1;
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

  // 3f) HAFTALIK AKRAN CHECK-IN: yolculuk modunda Pazartesi 10:00-10:09'da
  // ikilisi olan herkese "ortağına yaz" dürtüsü (settings kilidiyle bir kez).
  if (mod === "yolculuk") {
    const pazartesiMi =
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Istanbul",
        weekday: "short",
      }).format(simdi) === "Mon";
    if (pazartesiMi && saat === 10 && dakika < 10) {
      const { error: ortakKilit } = await db
        .from("settings")
        .insert({ key: `ortak_hatirlatma_${bugun}`, value: "1" });
      if (!ortakKilit) {
        const { data: ikililer } = await db.from("pairs").select("a_id, b_id");
        const idler = new Set<string>();
        for (const ik of ikililer ?? []) {
          idler.add(ik.a_id);
          idler.add(ik.b_id);
        }
        for (const pid of idler) {
          await katilimciyaBildir(
            db,
            pid,
            "🤝 Ortağına bu hafta yaz",
            "Bu haftaki adımını ortağınla paylaş — birbirinizi ayakta tutun.",
            "/ortak"
          );
        }
      }
    }
  }

  // 3g) HAFTALIK SÖZ HATIRLATMA: yolculuk modunda Çarşamba 10:00-10:09'da
  // hedefine ulaşmamış söz sahiplerine kendi sözünü hatırlat (haftada bir).
  if (mod === "yolculuk") {
    const carsambaMi =
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Europe/Istanbul",
        weekday: "short",
      }).format(simdi) === "Wed";
    if (carsambaMi && saat === 10 && dakika < 10) {
      const { error: sozKilit } = await db
        .from("settings")
        .insert({ key: `soz_hatirlatma_${bugun}`, value: "1" });
      if (!sozKilit) {
        const { data: sozler } = await db
          .from("pledges")
          .select("participant_id, agustos_gorusme, gorusme_yapilan");
        for (const s of sozler ?? []) {
          if (s.gorusme_yapilan >= s.agustos_gorusme) continue;
          const kalan = s.agustos_gorusme - s.gorusme_yapilan;
          await katilimciyaBildir(
            db,
            s.participant_id,
            "🤝 Sözünü hatırla",
            `Ağustos görüşme sözüne ${kalan} kaldı. İlerlemeni gir, hedefe yürü.`,
            "/soz"
          );
        }
      }
    }
  }

  // 4) Teslim hatırlatması (son 30 dk, bir kez) — sahnedeyken susar
  const { data: yaklasanlar } = sahneSessiz
    ? { data: [] }
    : await db
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
    // Sahne anonsu: AYNA'nın marka sesi perdeden duyurur
    await markaAnons(
      db,
      `anons/program-${m.id}.mp3`,
      `Saat ${saatYazi}. ${m.title}.${m.location ? ` Yer: ${m.location}.` : ""} Nedenini orada anlayacaksınız.`
    );
    await db.from("settings").upsert({
      key: "sahne_anons",
      value: `${m.id}:${simdi.toISOString()}`,
      updated_at: simdi.toISOString(),
    });
    ozet.acilan++;
  }

  // 6) Günlük fısıltı (13-14 ve 20-21 aralığında birer kez): "bugün N göz seni puanladı"
  if ((saat === 13 || saat === 20) && !sahneSessiz) {
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

  // 6b) GECE YANSIMASI ÜRETİMİ: kendi sesinden gece mesajı, akşam erken
  // saatten itibaren sessizce hazırlanır (üretim push değildir — sahneyi
  // bozmaz). night_date tekrarları engeller; tik başına ≤8 üretim.
  if (kampGunuBugun && GECE_FISILTILARI[kampGunuBugun] && saat >= 21) {
    const { data: geceBekleyen } = await db
      .from("voice_profiles")
      .select("participant_id")
      .eq("status", "klonlandi")
      .or(`night_date.is.null,night_date.neq.${bugun}`)
      .limit(8);
    if ((geceBekleyen ?? []).length > 0) {
      const adlar = new Map((kisiler ?? []).map((k) => [k.id, k.full_name]));
      for (const g of geceBekleyen ?? []) {
        const ad = adlar.get(g.participant_id);
        const metin = ad
          ? geceYansimaMetni(kampGunuBugun, ad.split(" ")[0])
          : null;
        if (!metin) continue;
        await geceSesi(db, g.participant_id, metin, bugun);
      }
    }
  }

  // 7) GECE FISILTISI: sahne kapanınca (23:40+) günün tek kapanış push'u —
  // Gün 1 ve 2'de, settings kilidiyle günde bir kez. Ana sayfadaki Konuşan
  // Yansıma kartına çağırır; sonra sessizlik (00:00).
  if (
    kampGunuBugun &&
    GECE_FISILTILARI[kampGunuBugun] &&
    saat === 23 &&
    dakika >= 40
  ) {
    const geceAnahtari = `gece_${bugun}`;
    const { error: geceKilit } = await db
      .from("settings")
      .insert({ key: geceAnahtari, value: "1" });
    if (!geceKilit) {
      await herkeseBildir(db, "🌙 AYNA", GECE_FISILTILARI[kampGunuBugun], "/");
      ozet.fisilti++;
    }
  }

  return { ozet: "tamam", ...ozet };
}

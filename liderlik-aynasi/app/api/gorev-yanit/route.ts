import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { gorevPuanla, korNoktaGuncelle, gorevUret } from "@/lib/ayna";
import { aktifOzellikler } from "@/lib/degerlendirme";
import { kampGunu } from "@/lib/kampProgrami";
import { kampBaslangicGetir } from "@/lib/kampZaman";
import { krizDiliVarMi, krizUyarisiGonder, KRIZ_YONLENDIRME } from "@/lib/guvenlik";
import { markaAnons, fieroSesi } from "@/lib/yansima";
import { katilimciyaBildir } from "@/lib/push";
import { eslesmeKaydet } from "@/lib/gorevEslesme";
import {
  kimlikCumlesiIsle,
  kimlikKanitEkle,
  kimlikYuzlesmeSec,
  type KimlikYuzlesme,
} from "@/lib/kimlik";
import { sicakAnYakala } from "@/lib/sicakAn";
import { zincirDevamEttir } from "@/lib/kampZinciri";
import { gorevFragmani } from "@/lib/fragman";
import { pusulaCekirdek } from "@/lib/pusula";
import {
  kivilcimHesapla,
  SOZ_KIVILCIMI,
  SENKRON_KIVILCIMI,
  unvanBul,
} from "@/lib/kivilcim";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 60;

// Görev yanıtı: anında puanlanır (AYNA "canlı" hissedilsin). Puanlama
// herhangi bir nedenle başarısız olursa görev 'submitted' kalır — tik
// kurtarır, katılımcıya "AYNA okuyor" denir.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }

  let govde: { gorevId?: unknown; yanit?: unknown };
  try {
    govde = await req.json();
  } catch {
    return Response.json({ hata: tr.gorevler.hata }, { status: 400 });
  }
  const { gorevId, yanit } = govde;
  if (
    typeof gorevId !== "string" ||
    typeof yanit !== "string" ||
    yanit.trim().length < 2
  ) {
    return Response.json({ hata: tr.gorevler.hata }, { status: 400 });
  }
  const yanitMetni = yanit.trim().slice(0, 1500);

  const db = supabaseAdmin();

  // GÜVENLİK SINIRI: gerçek kriz/umutsuzluk sinyali → admin bayrağı + kişiye
  // insan-mentor yönlendirmesi (AYNA koç sınırında kalır). Akışı bozmaz.
  const kriz = krizDiliVarMi(yanitMetni);
  if (kriz) {
    await krizUyarisiGonder(db, session.sub, session.ad, "gorev-yanit", yanitMetni);
  }
  const guvenlikEk = kriz ? `\n\n${KRIZ_YONLENDIRME}` : "";
  const { data: gorev, error } = await db
    .from("missions")
    .select("id, kind, title, body, status, due_at, trait_id, kaynak_id, baglanti_id, zincir_id, zincir_sira, altin, kimlik_cumle_id")
    .eq("id", gorevId)
    .eq("participant_id", session.sub)
    .maybeSingle();
  if (error) return Response.json({ hata: tr.gorevler.hata }, { status: 500 });
  if (!gorev) return Response.json({ hata: tr.gorevler.hata }, { status: 404 });
  // UX #3 — TELAFİ: süresi geçen görev de yapılabilir (yakın zamanda geçtiyse).
  // Kıvılcım yarıya iner; söz/senkron telafi edilmez (zaman-bağlı anlar).
  const telafi = gorev.status === "expired";
  // Puanlanmış görev (söz/senkron hariç) "geliştir ve yeniden gönder" ile tekrar
  // gönderilebilir → AYNA yeniden puanlar, kıvılcım güncellenir (toplam görevlerden
  // türediği için kendiliğinden düzelir).
  const yenidenScored = gorev.status === "scored" && gorev.kind !== "soz" && gorev.kind !== "senkron";
  // "submitted" LİMBO DEĞİL: puanlama düşmüşse (AI hatası/reddi) kişi yeniden
  // gönderebilmeli — eskiden 409 dönüyordu ve görev sonsuza dek puansız kalıyordu
  // (tik kurtarması da aynı AI'da takılınca tek çıkış yolu yoktu).
  const yenidenSubmitted = gorev.status === "submitted";
  if (gorev.status !== "pending" && !telafi && !yenidenScored && !yenidenSubmitted) {
    return Response.json({ hata: tr.gorevler.durumlar.expired }, { status: 409 });
  }
  if (telafi) {
    const gecenMs = Date.now() - new Date(gorev.due_at).getTime();
    if (gorev.kind === "soz" || gorev.kind === "senkron" || gecenMs > 24 * 3_600_000) {
      return Response.json({ hata: tr.gorevler.durumlar.expired }, { status: 409 });
    }
  }

  const simdi = new Date();

  // SÖZ görevi puanlanmaz: saklanır, 90 gün sonra davet e-postasıyla geri döner.
  if (gorev.kind === "soz") {
    await db
      .from("missions")
      .update({
        status: "scored",
        response_text: yanitMetni,
        responded_at: simdi.toISOString(),
        scored_at: simdi.toISOString(),
        ai_comment: tr.gorevler.sozTesekkur,
        spark_points: SOZ_KIVILCIMI,
      })
      .eq("id", gorev.id);
    const toplam = await toplamKivilcim(db, session.sub);
    return Response.json({
      soz: true,
      yorum: tr.gorevler.sozTesekkur + guvenlikEk,
      kivilcim: SOZ_KIVILCIMI,
      toplam,
      unvan: unvanBul(toplam).mevcut.ad,
      ...(kriz ? { guvenlik: true } : {}),
    });
  }

  // SENKRON AN: kolektif ana katılım anında sabit Kıvılcım'la mühürlenir —
  // 150 eşzamanlı yanıt için AI puanlaması bilinçli olarak yok.
  if (gorev.kind === "senkron") {
    await db
      .from("missions")
      .update({
        status: "scored",
        response_text: yanitMetni,
        responded_at: simdi.toISOString(),
        scored_at: simdi.toISOString(),
        ai_comment: tr.gorevler.senkronTesekkur,
        spark_points: SENKRON_KIVILCIMI,
      })
      .eq("id", gorev.id);
    // FAZ 5.3 — SENKRON KÜME reveal: aynı baglanti_id'li kümedeki diğer
    // katılımcıların ilk adları mini-duvar olarak döner ("birlikte yaptın").
    let kume: string[] = [];
    if (gorev.baglanti_id) {
      const { data: kumeUyeleri } = await db
        .from("missions")
        .select("participant_id, participants!missions_participant_id_fkey(full_name)")
        .eq("baglanti_id", gorev.baglanti_id);
      kume = (kumeUyeleri ?? [])
        .filter((m) => m.participant_id !== session.sub)
        .map((m) => (m.participants as unknown as { full_name: string } | null)?.full_name?.split(" ")[0])
        .filter((ad): ad is string => !!ad);
    }
    const toplam = await toplamKivilcim(db, session.sub);
    const kumeReveal =
      kume.length > 0 ? `\n\n💫 Bu anı şunlarla birlikte yaşadın: ${kume.join(", ")}.` : "";
    return Response.json({
      senkron: true,
      yorum: tr.gorevler.senkronTesekkur + kumeReveal + guvenlikEk,
      kivilcim: SENKRON_KIVILCIMI,
      toplam,
      unvan: unvanBul(toplam).mevcut.ad,
      ...(kume.length > 0 ? { kume } : {}),
      ...(kriz ? { guvenlik: true } : {}),
    });
  }

  // Önce yanıtı güvenceye al (puanlama düşerse tik kurtarır)
  await db
    .from("missions")
    .update({
      status: "submitted",
      response_text: yanitMetni,
      responded_at: simdi.toISOString(),
    })
    .eq("id", gorev.id);

  // Özellik 2 + 3 — puanlamaya PARALEL ucuz Haiku sinyalleri (fail-open, kendi
  // içlerinde hatayı yutar): kendini-sınırlayan kimlik cümlesi damıtma + sıcak
  // duygu anı yakalama. Kriz tespit edilen metinden sıcak an ÜRETİLMEZ (kriz
  // akışı ayrı ve dokunulmaz). Serverless'ta yanıt dönmeden ölmesinler diye
  // dönüşten önce await edilirler.
  const kimlikDamitmaP = kimlikCumlesiIsle(
    db,
    session.sub,
    gorev.id,
    { title: gorev.title, kind: gorev.kind },
    yanitMetni
  );
  const sicakAnP = kriz
    ? Promise.resolve()
    : sicakAnYakala(db, session.sub, "gorev", yanitMetni);

  const sonuc = await gorevPuanla(gorev, yanitMetni);
  if (!sonuc) {
    await Promise.all([kimlikDamitmaP, sicakAnP]);
    return Response.json({ bekliyor: true, ...(kriz ? { guvenlik: true, yorum: KRIZ_YONLENDIRME } : {}) }, { status: 202 });
  }

  const zamaninda = !telafi && simdi <= new Date(gorev.due_at);
  // Öneri #5 — STREAK ÖDÜLÜ: ard arda tamamlanan görev sayısı kıvılcıma basamak
  // bonusu katar (momentum somut ödüllenir). Bu görev şu an "submitted" — onu
  // atlayıp önceki ardışık "scored" zincirini say.
  let streak = 0;
  {
    const { data: sonlar } = await db
      .from("missions")
      .select("id, status")
      .eq("participant_id", session.sub)
      .order("issued_at", { ascending: false })
      .limit(12);
    for (const m of sonlar ?? []) {
      if (m.id === gorev.id) continue; // puanlanmakta olan görev
      if (m.status === "scored") streak++;
      else break;
    }
  }
  // Telafi (süresi geçmiş): kıvılcım yarıya iner — yine de yapmak değerli.
  const temelKivilcim = telafi
    ? Math.max(1, Math.ceil(kivilcimHesapla(sonuc.puan, false, streak) / 2))
    : kivilcimHesapla(sonuc.puan, zamaninda, streak);
  // FAZ 5.2 — ALTIN GÖREV: 3x kıvılcım.
  const kivilcim = gorev.altin ? temelKivilcim * 3 : temelKivilcim;
  await db
    .from("missions")
    .update({
      status: "scored",
      ai_score: sonuc.puan,
      ai_comment: sonuc.yorum,
      scored_at: new Date().toISOString(),
      spark_points: kivilcim,
      ...(telafi ? { gec_tamamlandi: true } : {}),
      // #2 Yanıt madenciliği: paralel çıkarılan tema etiketleri
      ...(sonuc.response_tags.length > 0
        ? { response_tags: sonuc.response_tags }
        : {}),
    })
    .eq("id", gorev.id);

  // FAZ 3.1 — ÇİFT TARAFLI ASİMETRİK GİZLİ GÖREV reveal: bu görev bir gizli
  // bağa (baglanti_id) sahipse ve KARŞI TARAF da tamamladıysa, ikisine de
  // "O da tam o anda bir görevdeydi" notu eklenir. Yalnız "gizli" içeren
  // 2'li bağlarda çalışır (mini-konsey/zincir aynı kolonu farklı amaçla kullanır).
  if (gorev.baglanti_id) {
    const { data: baglantiliGorevler } = await db
      .from("missions")
      .select("id, kind, status, ai_comment")
      .eq("baglanti_id", gorev.baglanti_id);
    const grup = baglantiliGorevler ?? [];
    const gizliIcerir = grup.some((m) => m.kind === "gizli");
    if (gizliIcerir && grup.length === 2) {
      const diger = grup.find((m) => m.id !== gorev.id);
      if (diger && diger.status === "scored") {
        const REVEAL_NOTU = " 💫 O da tam o anda bir görevdeydi — ikiniz de aynı ana katkı sağladınız.";
        for (const taraf of [gorev.id, diger.id]) {
          const { data: guncelHal } = await db
            .from("missions")
            .select("ai_comment")
            .eq("id", taraf)
            .maybeSingle();
          const mevcut = guncelHal?.ai_comment ?? "";
          if (mevcut && !mevcut.includes("O da tam o anda")) {
            await db.from("missions").update({ ai_comment: mevcut + REVEAL_NOTU }).eq("id", taraf);
          }
        }
      }
    }
  }

  // FAZ 3.5 — KAMP ZİNCİRİ: bu görev bir zincir halkasıysa, tamamlanınca
  // bayrak otomatik hedefe geçer — sıradaki halka üretilir.
  if (gorev.zincir_id) {
    try {
      const { data: eslesme } = await db
        .from("gorev_eslesme")
        .select("hedef_id")
        .eq("mission_id", gorev.id)
        .maybeSingle();
      if (eslesme?.hedef_id) {
        const { data: hedefKisi } = await db
          .from("participants")
          .select("id, full_name")
          .eq("id", eslesme.hedef_id)
          .maybeSingle();
        if (hedefKisi) {
          const devam = await zincirDevamEttir(db, gorev.zincir_id, hedefKisi, simdi);
          if (devam) {
            const zincirDueAt = new Date(simdi.getTime() + 3 * 3_600_000);
            const { data: yeniHalka } = await db
              .from("missions")
              .insert({
                participant_id: hedefKisi.id,
                kind: "bag",
                title: devam.title,
                body: devam.body,
                difficulty: 2,
                zincir_id: gorev.zincir_id,
                zincir_sira: devam.sira,
                issued_at: simdi.toISOString(),
                due_at: zincirDueAt.toISOString(),
              })
              .select("id")
              .single();
            if (yeniHalka) {
              await eslesmeKaydet(db, yeniHalka.id, hedefKisi.id, devam.hedef.id, true);
              await katilimciyaBildir(
                db,
                hedefKisi.id,
                "🔗 Bayrak sana ulaştı",
                devam.body.slice(0, 120),
                "/gorevler"
              );
            }
          }
        }
      }
    } catch {
      // zincir devamı düşse bile yanıt akışını bozma
    }
  }

  // #9 mentorluk takibi: görev tamamlandıysa konuşma gerçekleşti say.
  if (gorev.kind === "mentorluk") {
    await db
      .from("mentorluk_kayit")
      .update({ konustu: true, updated_at: new Date().toISOString() })
      .eq("mission_id", gorev.id)
      .eq("mentee_id", session.sub);
  }

  // KANIT GARANTİSİ: bu görev bir "X'i gözle" mikro görevi ise, yanıtı HEDEFE
  // anonim takdir (kudos) olarak yaz → hedefin kanıt sayacı yükselir (Boşluk Anı
  // içi boş kalmaz). Yalnız bir kez (takdir_yazildi_at guard'ı).
  if (gorev.kind === "gozlem") {
    const { data: kg } = await db
      .from("kanit_gorevi")
      .select("hedef_id, takdir_yazildi_at")
      .eq("mission_id", gorev.id)
      .maybeSingle();
    if (kg && !kg.takdir_yazildi_at && yanitMetni.trim().length >= 2) {
      const { error: kudosHata } = await db.from("kudos").insert({
        from_id: session.sub,
        to_id: kg.hedef_id,
        message: yanitMetni.slice(0, 280),
      });
      if (!kudosHata) {
        await db
          .from("kanit_gorevi")
          .update({ takdir_yazildi_at: new Date().toISOString() })
          .eq("mission_id", gorev.id);
      }
    }
  }

  // Özellik 5 — ŞAHİT PERSPEKTİFİ: bu görev "10 dk onu gözle" şahit göreviyse,
  // yanıt hedefin gözlem defterine yazılır → hedefin SONRAKİ görevi bu cümleyle
  // açılır ("Dün biri sende şunu gördü: …"). Hedef, eşleşme kaydından okunur;
  // yalnız bir kez (yeniden gönderim çift kayıt üretmez). Kıvılcım normal işler.
  if (gorev.kind === "sahit" && !yenidenScored) {
    const { data: sahitEslesme } = await db
      .from("gorev_eslesme")
      .select("hedef_id")
      .eq("mission_id", gorev.id)
      .maybeSingle();
    if (sahitEslesme?.hedef_id) {
      const { count: gozlemVar } = await db
        .from("sahit_gozlemleri")
        .select("id", { count: "exact", head: true })
        .eq("mission_id", gorev.id);
      if (!gozlemVar) {
        await db.from("sahit_gozlemleri").insert({
          gozleyen_id: session.sub,
          hedef_id: sahitEslesme.hedef_id,
          gozlem: yanitMetni.slice(0, 500),
          mission_id: gorev.id,
        });
      }
    }
  }

  // Özellik 2 — KARŞI-KANIT: bu görev bir kimlik cümlesini çürütmek için
  // kurulmuştu (kimlik_cumle_id) ve kişi ≥7 aldıysa, yanıttan tek cümlelik
  // kanıt özeti damıtılıp cümlenin defterine eklenir (fail-open).
  if (sonuc.puan >= 7 && gorev.kimlik_cumle_id && !yenidenScored) {
    await kimlikKanitEkle(
      db,
      gorev.kimlik_cumle_id,
      { title: gorev.title, body: gorev.body },
      yanitMetni
    );
  }

  // FIERO: 10/10 anında büyük ekran AYNA'nın sesiyle alkışlar; yansıması
  // da kişiye kendi sesiyle konuşur (ana sayfadaki Konuşan Yansıma kartı).
  // BEST-EFFORT: puan zaten DB'ye yazıldı — ses üretimi düşerse kullanıcıya
  // 500 dönmemeli (eskiden dönüyordu: istemci retry → görev "scored" olduğu
  // için yenidenScored dalına girip her seferinde YENİDEN puanlıyordu).
  if (sonuc.puan === 10) {
    try {
      await markaAnons(
        db,
        `anons/fiero-${gorev.id}.mp3`,
        `${session.ad.split(" ")[0]}, az önce aynayı parlattı. On üzerinden on.`
      );
      await fieroSesi(db, session.sub, session.ad);
    } catch {
      // ses/anons üretilemedi — puanlama sonucu yine de döner
    }
  }

  const toplam = await toplamKivilcim(db, session.sub);

  // FAZ 7.3 — YENİDEN GİRİŞ MERDİVENİ: tamamlama basamağı bir üst kademeye
  // taşır (0→1→2). Sessizleşince tik.ts tekrar 0'a indirir.
  {
    const { data: p } = await db
      .from("participants")
      .select("yeniden_giris_basamak")
      .eq("id", session.sub)
      .maybeSingle();
    const basamak = p?.yeniden_giris_basamak ?? 2;
    if (basamak < 2) {
      await db.from("participants").update({ yeniden_giris_basamak: basamak + 1 }).eq("id", session.sub);
    }
  }

  // FAZ 6.2 — FIERO SAHNESİ: bu görevin çalıştırdığı lider kası bu kampta
  // kaçıncı kez çalıştı? İlerleme halkası için trait adı + tamamlama sayısı.
  let kasSayaci: { ad: string; kez: number } | null = null;
  if (gorev.trait_id) {
    const [{ count: kasKez }, { data: traitData }] = await Promise.all([
      db
        .from("missions")
        .select("id", { count: "exact", head: true })
        .eq("participant_id", session.sub)
        .eq("trait_id", gorev.trait_id)
        .eq("status", "scored"),
      db.from("traits").select("name").eq("id", gorev.trait_id).maybeSingle(),
    ]);
    if (traitData?.name && kasKez) kasSayaci = { ad: traitData.name, kez: kasKez };
  }

  // #6 Kör nokta güncelleme döngüsü: milestone (5, 10, 15) tamamlamada
  // Haiku, son yanıtları analiz edip on_farkindalik profilini günceller.
  const { count: tamamlananSayi } = await db
    .from("missions")
    .select("id", { count: "exact", head: true })
    .eq("participant_id", session.sub)
    .eq("status", "scored");
  if (tamamlananSayi && tamamlananSayi % 5 === 0) {
    korNoktaGuncelle(db, session.sub, tamamlananSayi).catch(() => {});
  }

  // Özellik 6 — ÇEKİRDEK NEDEN NABZI: her 5. puanlanan görevden sonra tek soru:
  // "Bu görev seni '<çekirdek neden>' hedefine yaklaştırdı mı?" (1-5). Yalnız
  // pusulası tamamlanmış (çekirdek nedeni olan) kişiye sorulur; cevap
  // /api/neden-nabiz ile bu görevin neden_nabiz kolonuna yazılır.
  let nabizSor = false;
  let nabizNeden: string | null = null;
  if (tamamlananSayi && tamamlananSayi % 5 === 0) {
    try {
      const cekirdek = await pusulaCekirdek(db, session.sub);
      const cekirdekNeden = cekirdek?.cekirdek_neden?.[0]?.trim() || null;
      if (cekirdekNeden) {
        nabizSor = true;
        nabizNeden = cekirdekNeden;
      }
    } catch {
      // nabız sorusu kritik değil — okuma düşerse sormadan geç
    }
  }

  // Özellik 2 — KİMLİK YÜZLEŞMESİ: kişinin her 10. puanlı görevinde, ≥2
  // karşı-kanıt biriktirmiş en eski aktif cümle yüzüne tutulur ("Bunu hâlâ
  // söyleyebilir misin?"). Seçim yuzlesme_at'ı damgalar — bir cümle bir kez.
  let kimlikYuzlesme: KimlikYuzlesme | null = null;
  if (tamamlananSayi && tamamlananSayi % 10 === 0) {
    try {
      kimlikYuzlesme = await kimlikYuzlesmeSec(db, session.sub);
    } catch {
      // yüzleşme kritik değil — düşerse sessizce geç
    }
  }

  // DÜŞÜK PUAN → DERİNLEŞTİRME: kişi bu konuda zorlandıysa, AYNI kası FARKLI ve
  // daha erişilebilir bir açıdan + 2 somut ipucuyla tekrar çalıştıran hızlı bir
  // ek görev üret (büyüme döngüsü). Yalnız ilk-gerçek tamamlamada, koçlanabilir
  // görevlerde ve bir derinleştirmenin kendisinde DEĞİL (sonsuz döngü guard'ı).
  // Fire-and-forget (korNoktaGuncelle gibi) — puan cevabını geciktirmez.
  const koclanabilir = !["soz", "senkron", "mentorluk"].includes(gorev.kind);
  if (sonuc.puan <= 5 && !telafi && !yenidenScored && koclanabilir && !gorev.kaynak_id) {
    dusukPuanTelafiYarat(db, session.sub, {
      id: gorev.id,
      trait_id: gorev.trait_id,
      title: gorev.title,
    }).catch(() => {});
  }

  // [E4] Görev fragmanı: sıradaki program anı + kilitli ipucu (merak köprüsü).
  const fragman = await gorevFragmani(db, simdi);

  // Özellik 2 + 3 — paralel başlatılan sinyaller yanıt dönmeden tamamlansın
  // (serverless yürütmesi yanıtla birlikte ölebilir; her ikisi de fail-open).
  await Promise.all([kimlikDamitmaP, sicakAnP]);

  return Response.json({
    puan: sonuc.puan,
    yorum: sonuc.yorum + guvenlikEk,
    kivilcim,
    toplam,
    unvan: unvanBul(toplam).mevcut.ad,
    ...(kasSayaci ? { kasSayaci } : {}),
    ...(gorev.altin ? { altin: true } : {}),
    ...(kriz ? { guvenlik: true } : {}),
    // Özellik 6 — nabız kartı: 5. puanlı görev + çekirdek neden varsa sor.
    nabizSor,
    nabizNeden,
    // Özellik 2 — yüzleşme kartı: 10. puanlı görevde cümle + karşı-kanıtlar.
    kimlikYuzlesme,
    fragman,
  });
}

// Düşük puan sonrası derinleştirme görevi üret + ekle. Bekleyen görev varsa
// üretmez (telefonu tıkamaz). kaynak_id ile kaynağa bağlanır (loop guard).
async function dusukPuanTelafiYarat(
  db: ReturnType<typeof supabaseAdmin>,
  pid: string,
  kaynak: { id: string; trait_id: number | null; title: string }
): Promise<void> {
  const { count: bekleyen } = await db
    .from("missions")
    .select("id", { count: "exact", head: true })
    .eq("participant_id", pid)
    .eq("status", "pending");
  if ((bekleyen ?? 0) > 0) return;

  // GÜNLÜK KOTA: tik motorunun uyguladığı günde 7 görev tavanını otomatik
  // derinleştirme de delmesin (eskiden deliyordu — 7. görevden düşük puan
  // alan kişiye 8. görev gidiyordu). Senkron kotaya sayılmaz (tik ile aynı kural).
  const bugunTarih = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
  const { count: bugunSayisi } = await db
    .from("missions")
    .select("id", { count: "exact", head: true })
    .eq("participant_id", pid)
    .neq("kind", "senkron")
    .gte("issued_at", `${bugunTarih}T00:00:00+03:00`);
  if ((bugunSayisi ?? 0) >= 7) return;

  const [{ data: kisi }, ozellikler] = await Promise.all([
    db.from("participants").select("id, full_name, team").eq("id", pid).maybeSingle(),
    aktifOzellikler(db),
  ]);
  if (!kisi) return;

  const kasAd = ozellikler.find((o) => o.id === kaynak.trait_id)?.name ?? null;
  const ipucu =
    `Kişi az önce "${kaynak.title}" görevinden DÜŞÜK puan aldı; bu konuda zorlandı. ` +
    `${kasAd ? `Hedef liderlik kası: "${kasAd}". ` : ""}` +
    `AYNI kası DAHA ERİŞİLEBİLİR ve FARKLI bir açıdan, tekrar etmeden çalıştır — bu sefer ` +
    `başarması daha kolay olsun. 'ipuclari' alanına bu sefer daha iyi yapması için 2 KISA, ` +
    `somut tavsiye yaz. Asla kırıcı olma; "bu sefer yakalarsın" enerjisi ver.`;

  const simdi = new Date();
  const saat = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", hour: "2-digit", hour12: false })
      .formatToParts(simdi)
      .find((p) => p.type === "hour")?.value ?? 12
  );
  const bugun = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(simdi);
  const kampBaslangic = await kampBaslangicGetir(db);
  const gunNo = kampGunu(bugun, kampBaslangic);
  const gorev = await gorevUret(db, kisi, gunNo ?? 1, saat, gunNo ? "kamp" : "yolculuk", null, null, ipucu);
  if (!gorev) return;

  // YARIŞ DARALTMA: AI üretimi saniyeler sürer — bu sırada başka bir istek
  // (tik, çift dokunuş) görev eklemiş olabilir. Insert'ten hemen önce yeniden
  // bak; bekleyen oluştuysa üretilen görevi sessizce at (kota/yağmur koruması).
  const { count: sonKontrol } = await db
    .from("missions")
    .select("id", { count: "exact", head: true })
    .eq("participant_id", pid)
    .eq("status", "pending");
  if ((sonKontrol ?? 0) > 0) return;

  const dueAt = new Date(simdi.getTime() + gorev.sure_saat * 3_600_000);
  await db.from("missions").insert({
    participant_id: pid,
    trait_id: gorev.trait_id,
    kind: gorev.kind,
    title: gorev.title,
    body: gorev.body,
    difficulty: gorev.difficulty,
    neden: gorev.neden,
    fayda: gorev.fayda,
    ipuclari: gorev.ipuclari,
    micro_sprint: gorev.micro_sprint,
    kaynak_id: kaynak.id,
    // Özellik 7 — zorluk merdiveni ölçümü (kas + modelin doz değerlendirmesi)
    kas: gorev.kas,
    zorluk_seviye: gorev.zorlukSeviye,
    // Özellik 2 — kimlik çürütme izi (derinleştirme de kanıt toplayabilir)
    kimlik_cumle_id: gorev.kimlikCumleId,
    due_at: dueAt.toISOString(),
  });
}

async function toplamKivilcim(
  db: ReturnType<typeof supabaseAdmin>,
  pid: string
): Promise<number> {
  const { data } = await db
    .from("missions")
    .select("spark_points")
    .eq("participant_id", pid)
    .eq("status", "scored");
  return (data ?? []).reduce((t, m) => t + m.spark_points, 0);
}

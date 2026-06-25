import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { gorevPuanla, korNoktaGuncelle } from "@/lib/ayna";
import { krizDiliVarMi, krizUyarisiGonder, KRIZ_YONLENDIRME } from "@/lib/guvenlik";
import { markaAnons, fieroSesi } from "@/lib/yansima";
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
    .select("id, kind, title, body, status, due_at")
    .eq("id", gorevId)
    .eq("participant_id", session.sub)
    .maybeSingle();
  if (error) return Response.json({ hata: tr.gorevler.hata }, { status: 500 });
  if (!gorev) return Response.json({ hata: tr.gorevler.hata }, { status: 404 });
  if (gorev.status !== "pending") {
    return Response.json({ hata: tr.gorevler.durumlar.expired }, { status: 409 });
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
    const toplam = await toplamKivilcim(db, session.sub);
    return Response.json({
      senkron: true,
      yorum: tr.gorevler.senkronTesekkur + guvenlikEk,
      kivilcim: SENKRON_KIVILCIMI,
      toplam,
      unvan: unvanBul(toplam).mevcut.ad,
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

  const sonuc = await gorevPuanla(gorev, yanitMetni);
  if (!sonuc) {
    return Response.json({ bekliyor: true, ...(kriz ? { guvenlik: true, yorum: KRIZ_YONLENDIRME } : {}) }, { status: 202 });
  }

  const zamaninda = simdi <= new Date(gorev.due_at);
  const kivilcim = kivilcimHesapla(sonuc.puan, zamaninda);
  await db
    .from("missions")
    .update({
      status: "scored",
      ai_score: sonuc.puan,
      ai_comment: sonuc.yorum,
      scored_at: new Date().toISOString(),
      spark_points: kivilcim,
      // #2 Yanıt madenciliği: paralel çıkarılan tema etiketleri
      ...(sonuc.response_tags.length > 0
        ? { response_tags: sonuc.response_tags }
        : {}),
    })
    .eq("id", gorev.id);

  // FIERO: 10/10 anında büyük ekran AYNA'nın sesiyle alkışlar; yansıması
  // da kişiye kendi sesiyle konuşur (ana sayfadaki Konuşan Yansıma kartı)
  if (sonuc.puan === 10) {
    await markaAnons(
      db,
      `anons/fiero-${gorev.id}.mp3`,
      `${session.ad.split(" ")[0]}, az önce aynayı parlattı. On üzerinden on.`
    );
    await fieroSesi(db, session.sub, session.ad);
  }

  const toplam = await toplamKivilcim(db, session.sub);

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

  return Response.json({
    puan: sonuc.puan,
    yorum: sonuc.yorum + guvenlikEk,
    kivilcim,
    toplam,
    unvan: unvanBul(toplam).mevcut.ad,
    ...(kriz ? { guvenlik: true } : {}),
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

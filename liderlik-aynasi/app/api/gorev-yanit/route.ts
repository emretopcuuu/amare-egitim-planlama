import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { gorevPuanla } from "@/lib/ayna";
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
      yorum: tr.gorevler.sozTesekkur,
      kivilcim: SOZ_KIVILCIMI,
      toplam,
      unvan: unvanBul(toplam).mevcut.ad,
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
      yorum: tr.gorevler.senkronTesekkur,
      kivilcim: SENKRON_KIVILCIMI,
      toplam,
      unvan: unvanBul(toplam).mevcut.ad,
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
    return Response.json({ bekliyor: true }, { status: 202 });
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
    })
    .eq("id", gorev.id);

  const toplam = await toplamKivilcim(db, session.sub);
  return Response.json({
    puan: sonuc.puan,
    yorum: sonuc.yorum,
    kivilcim,
    toplam,
    unvan: unvanBul(toplam).mevcut.ad,
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

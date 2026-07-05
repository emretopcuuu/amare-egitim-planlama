import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sesliMektupGoreviMi, MEKTUP_ACILIS_GUN } from "@/lib/sesliMektup";
import { MEKTUP_KIVILCIMI } from "@/lib/kivilcim";
import { tr } from "@/lib/i18n/tr";

// Özellik 4 — SESLİ MEKTUP ucu.
// POST (multipart): Gün 2 akşamı görevinin ses kaydını alır → 'sesler' bucket
//   mektup/{pid}-{uuid}.webm|mp4 → sesli_mektuplar'a acilis_at = +90 gün ile
//   yazar → görevi sabit Kıvılcım'la mühürler (söz/senkron deseni, AI yok).
// GET: 90. günde açılış — açılmış (acilis_at geçmiş) en eski mektuba imzalı
//   URL döner ve ilk dinleyişte dinlendi_at'ı damgalar.

export const maxDuration = 60;

const AZAMI_BAYT = 12 * 1024 * 1024; // ~60 sn webm/mp4 rahat sığar

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return NextResponse.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const db = supabaseAdmin();

  const form = await req.formData();
  const gorevId = form.get("gorevId");
  const ses = form.get("ses");
  if (typeof gorevId !== "string" || !(ses instanceof File) || ses.size === 0) {
    return NextResponse.json({ hata: tr.gorevler.hata }, { status: 400 });
  }
  if (ses.size > AZAMI_BAYT) {
    return NextResponse.json({ hata: tr.gorevler.hata }, { status: 413 });
  }
  const sureHam = Number(form.get("sure"));
  const sureSn = Number.isFinite(sureHam) ? Math.min(120, Math.max(1, Math.round(sureHam))) : null;

  const { data: gorev } = await db
    .from("missions")
    .select("id, kind, title, status, due_at")
    .eq("id", gorevId)
    .eq("participant_id", session.sub)
    .maybeSingle();
  if (!gorev || !sesliMektupGoreviMi(gorev)) {
    return NextResponse.json({ hata: tr.gorevler.hata }, { status: 404 });
  }
  // Telafi penceresiyle uyumlu: pending ya da süresi 24 saat içinde geçmiş.
  const telafi =
    gorev.status === "expired" &&
    Date.now() - new Date(gorev.due_at).getTime() <= 24 * 3_600_000;
  if (gorev.status !== "pending" && !telafi) {
    return NextResponse.json({ hata: tr.gorevler.durumlar.expired }, { status: 409 });
  }

  // 1) Kaydı sakla (uzantı gerçek formata göre — ses-rituel deseni)
  const uzanti = ses.type.includes("mp4") ? "mp4" : "webm";
  const yol = `mektup/${session.sub}-${crypto.randomUUID()}.${uzanti}`;
  const yukleme = await db.storage
    .from("sesler")
    .upload(yol, ses, { contentType: ses.type || "audio/webm", upsert: false });
  if (yukleme.error) {
    console.error("[sesli-mektup] storage upload error:", yukleme.error.message);
    return NextResponse.json({ hata: tr.gorevler.hata }, { status: 500 });
  }

  // 2) Mektubu mühürle: 90 gün sonra açılır.
  const simdi = new Date();
  const acilis = new Date(simdi.getTime() + MEKTUP_ACILIS_GUN * 86_400_000);
  const { error: mektupHata } = await db.from("sesli_mektuplar").insert({
    participant_id: session.sub,
    audio_path: yol,
    sure_sn: sureSn,
    acilis_at: acilis.toISOString(),
  });
  if (mektupHata) {
    console.error("[sesli-mektup] insert error:", mektupHata.message);
    return NextResponse.json({ hata: tr.gorevler.hata }, { status: 500 });
  }

  // 3) Görevi sabit Kıvılcım'la kapat (soz/senkron deseni — AI puanlaması yok).
  await db
    .from("missions")
    .update({
      status: "scored",
      response_text: tr.gorevler.mektupYanitMetni,
      responded_at: simdi.toISOString(),
      scored_at: simdi.toISOString(),
      ai_comment: tr.gorevler.mektupTesekkur,
      spark_points: MEKTUP_KIVILCIMI,
    })
    .eq("id", gorev.id);

  return NextResponse.json({
    ok: true,
    yorum: tr.gorevler.mektupTesekkur,
    kivilcim: MEKTUP_KIVILCIMI,
  });
}

export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return NextResponse.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const db = supabaseAdmin();

  const { data: mektup } = await db
    .from("sesli_mektuplar")
    .select("id, audio_path, dinlendi_at")
    .eq("participant_id", session.sub)
    .lte("acilis_at", new Date().toISOString())
    .order("acilis_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!mektup) return NextResponse.json({ hata: "yok" }, { status: 404 });

  const { data: imzali } = await db.storage
    .from("sesler")
    .createSignedUrl(mektup.audio_path, 3600);
  if (!imzali?.signedUrl) {
    return NextResponse.json({ hata: tr.gorevler.hata }, { status: 500 });
  }

  // İlk dinleyişi damgala (kart bir daha görünmez; mektup GET ile hep açılabilir).
  if (!mektup.dinlendi_at) {
    await db
      .from("sesli_mektuplar")
      .update({ dinlendi_at: new Date().toISOString() })
      .eq("id", mektup.id);
  }

  return NextResponse.json({ url: imzali.signedUrl });
}

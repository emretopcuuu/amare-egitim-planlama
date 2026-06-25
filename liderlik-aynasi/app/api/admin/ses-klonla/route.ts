import { NextRequest, NextResponse } from "next/server";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sesKlonla, seslendir, sesYapilandirildiMi } from "@/lib/eleven";
import { selamUret } from "@/lib/yansima";

export const maxDuration = 120;

// Admin: "kayitli" statüsündeki (kaydı var, klonu yok) katılımcıları
// ElevenLabs'te klonlar. Tek kişi (participantId) veya toplu (hepsi) çalışır.
// Çıktı: { tamam, atlanan, hatalar } — sessiz hata yutmaz, loglar.
export async function POST(req: NextRequest) {
  const session = await adminOturumu();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  if (!sesYapilandirildiMi()) {
    return NextResponse.json(
      { hata: "ELEVENLABS_API_KEY tanımlı değil — Railway ortam değişkenlerine ekle." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  // Tek kişi veya "hepsi" modu
  const hedefId: string | null =
    typeof body?.participantId === "string" ? body.participantId : null;

  const db = supabaseAdmin();

  // Hedefleri getir: kayitli + sample_path var + voice_id yok
  let sorgu = db
    .from("voice_profiles")
    .select("participant_id, sample_path, beklenti")
    .eq("status", "kayitli")
    .not("sample_path", "is", null);

  if (hedefId) sorgu = sorgu.eq("participant_id", hedefId);

  const { data: hedefler, error: sorgHata } = await sorgu;
  if (sorgHata) {
    return NextResponse.json({ hata: sorgHata.message }, { status: 500 });
  }
  if (!hedefler?.length) {
    return NextResponse.json({ tamam: 0, atlanan: 0, hatalar: [] });
  }

  // İsimler için katılımcıları çek
  const idler = hedefler.map((h) => h.participant_id);
  const { data: kisiler } = await db
    .from("participants")
    .select("id, full_name")
    .in("id", idler);
  const adHarita = new Map((kisiler ?? []).map((k) => [k.id, k.full_name]));

  let tamam = 0;
  let atlanan = 0;
  const hatalar: string[] = [];

  for (const h of hedefler) {
    const pid = h.participant_id;
    const ad = adHarita.get(pid) ?? pid;
    try {
      // Storage'dan ses dosyasını indir
      const { data: dosyaVeri, error: indirHata } = await db.storage
        .from("sesler")
        .download(h.sample_path!);
      if (indirHata || !dosyaVeri) {
        hatalar.push(`${ad}: ses dosyası indirilemedi`);
        atlanan++;
        continue;
      }

      const uzanti = h.sample_path!.endsWith(".mp4") ? "mp4" : "webm";
      const dosyaAdi = `ornek.${uzanti}`;
      const blob = new Blob([await dosyaVeri.arrayBuffer()], {
        type: uzanti === "mp4" ? "audio/mp4" : "audio/webm",
      });

      const voiceId = await sesKlonla(`ayna-${pid.slice(0, 8)}`, blob, dosyaAdi);

      // İlk selam sesini üret ve sakla
      const beklenti =
        typeof h.beklenti === "string" ? h.beklenti : null;
      const selamMetni = await selamUret(ad.split(" ")[0], beklenti);
      const mp3 = await seslendir(voiceId, selamMetni);

      const selamYolu = `${pid}/selam.mp3`;
      await db.storage
        .from("sesler")
        .upload(selamYolu, Buffer.from(mp3), {
          contentType: "audio/mpeg",
          upsert: true,
        });

      await db.from("voice_profiles").update({
        status: "klonlandi",
        voice_id: voiceId,
        greeting_path: selamYolu,
        updated_at: new Date().toISOString(),
      }).eq("participant_id", pid);

      tamam++;
    } catch (err) {
      const mesaj = err instanceof Error ? err.message : String(err);
      hatalar.push(`${ad}: ${mesaj}`);
      atlanan++;
    }
  }

  return NextResponse.json({ tamam, atlanan, hatalar });
}

// GET: klonlama bekleyen (kayitli) kullanıcı sayısını döner
export async function GET() {
  const session = await adminOturumu();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });

  const db = supabaseAdmin();
  const [bekleyenler, klonlar] = await Promise.all([
    db
      .from("voice_profiles")
      .select("participant_id, beklenti, updated_at, participants!inner(full_name)")
      .eq("status", "kayitli")
      .not("sample_path", "is", null),
    db
      .from("voice_profiles")
      .select("participant_id", { count: "exact", head: true })
      .eq("status", "klonlandi"),
  ]);

  const liste = (bekleyenler.data ?? []).map((v) => {
    const p = Array.isArray(v.participants) ? v.participants[0] : v.participants;
    return {
      id: v.participant_id,
      ad: (p as { full_name: string } | null)?.full_name ?? "?",
      tarih: v.updated_at,
    };
  });

  return NextResponse.json({
    bekleyen: liste,
    klonlandi: klonlar.count ?? 0,
    apiAcik: sesYapilandirildiMi(),
  });
}

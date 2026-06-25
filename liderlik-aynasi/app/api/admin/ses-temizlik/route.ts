import { NextRequest, NextResponse } from "next/server";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  sesleriListele,
  sesSilDogrula,
  sesYapilandirildiMi,
} from "@/lib/eleven";

export const maxDuration = 60;

// Admin Ses Temizliği: ElevenLabs hesabındaki TÜM sesleri listeler, hangileri
// hâlâ bir katılımcıya bağlı (DB'de voice_id olarak kayıtlı) ayırt eder; yetim
// klonları (eski testlerden kalan, kimseye bağlı olmayan) toplu sildirir.
// Slot tıkanıklığını çözmek için. premade/marka sesleri korunur — yalnız
// category='cloned' olanlar silinebilir.

export async function GET() {
  const session = await adminOturumu();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  if (!sesYapilandirildiMi()) {
    return NextResponse.json(
      { hata: "ELEVENLABS_API_KEY tanımlı değil." },
      { status: 503 }
    );
  }

  let sesler;
  try {
    sesler = await sesleriListele();
  } catch (err) {
    const mesaj = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ hata: mesaj }, { status: 502 });
  }

  // DB'de hâlâ bir katılımcıya bağlı voice_id'ler — bunları "kullanımda" işaretle
  const db = supabaseAdmin();
  const { data: profiller } = await db
    .from("voice_profiles")
    .select("voice_id, participant_id, participants!inner(full_name)")
    .not("voice_id", "is", null);

  const bagliHarita = new Map<string, string>();
  for (const p of profiller ?? []) {
    if (!p.voice_id) continue;
    const kisi = Array.isArray(p.participants) ? p.participants[0] : p.participants;
    bagliHarita.set(p.voice_id, (kisi as { full_name: string } | null)?.full_name ?? "?");
  }

  // Yalnız klonlanmış sesleri raporla (premade/marka sesi sayfada gösterilmez)
  const klonlar = sesler
    .filter((s) => s.category === "cloned")
    .map((s) => ({
      voice_id: s.voice_id,
      ad: s.name,
      bagliKisi: bagliHarita.get(s.voice_id) ?? null,
      yetim: !bagliHarita.has(s.voice_id),
    }));

  return NextResponse.json({
    toplamSes: sesler.length, // hesaptaki TÜM sesler (premade dahil)
    klonSayisi: klonlar.length,
    yetimSayisi: klonlar.filter((k) => k.yetim).length,
    klonlar,
  });
}

export async function POST(req: NextRequest) {
  const session = await adminOturumu();
  if (!session) return NextResponse.json({ hata: "Yetkisiz" }, { status: 401 });
  if (!sesYapilandirildiMi()) {
    return NextResponse.json(
      { hata: "ELEVENLABS_API_KEY tanımlı değil." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  // mod: "yetimler" → DB'de bağlı olmayan tüm klonları sil
  //      "secili"   → verilen voice_id listesini sil
  const mod = body?.mod;

  let hedefVoiceIdler: string[] = [];

  if (mod === "secili" && Array.isArray(body?.voiceIdler)) {
    hedefVoiceIdler = body.voiceIdler.filter(
      (v: unknown): v is string => typeof v === "string"
    );
  } else if (mod === "yetimler") {
    let sesler;
    try {
      sesler = await sesleriListele();
    } catch (err) {
      const mesaj = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ hata: mesaj }, { status: 502 });
    }
    const db = supabaseAdmin();
    const { data: profiller } = await db
      .from("voice_profiles")
      .select("voice_id")
      .not("voice_id", "is", null);
    const bagliSet = new Set(
      (profiller ?? []).map((p) => p.voice_id).filter(Boolean) as string[]
    );
    hedefVoiceIdler = sesler
      .filter((s) => s.category === "cloned" && !bagliSet.has(s.voice_id))
      .map((s) => s.voice_id);
  } else {
    return NextResponse.json({ hata: "Geçersiz mod" }, { status: 400 });
  }

  if (!hedefVoiceIdler.length) {
    return NextResponse.json({ silinen: 0, basarisiz: 0 });
  }

  // Güvenlik: DB'de bağlı olan bir voice_id "secili" modda gelse bile silinmesin
  if (mod === "secili") {
    const db = supabaseAdmin();
    const { data: bagli } = await db
      .from("voice_profiles")
      .select("voice_id")
      .in("voice_id", hedefVoiceIdler);
    const bagliSet = new Set(
      (bagli ?? []).map((p) => p.voice_id).filter(Boolean) as string[]
    );
    hedefVoiceIdler = hedefVoiceIdler.filter((v) => !bagliSet.has(v));
  }

  let silinen = 0;
  let basarisiz = 0;
  for (const vid of hedefVoiceIdler) {
    const ok = await sesSilDogrula(vid).catch(() => false);
    if (ok) silinen++;
    else basarisiz++;
  }

  return NextResponse.json({ silinen, basarisiz });
}

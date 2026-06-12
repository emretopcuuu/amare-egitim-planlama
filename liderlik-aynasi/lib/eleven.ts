import "server-only";

// ElevenLabs ses katmanı: klonla → seslendir → (kamp sonunda) sil.
// Anahtar yoksa sistem zarifçe geriler: kayıt + onay saklanır, klonlama
// kamp başlarken (anahtar girilince) tamamlanır.

const TABAN = "https://api.elevenlabs.io/v1";

export function sesYapilandirildiMi(): boolean {
  return !!process.env.ELEVENLABS_API_KEY;
}

function anahtar(): string {
  const k = process.env.ELEVENLABS_API_KEY;
  if (!k) throw new Error("ELEVENLABS_API_KEY tanımlı değil");
  return k;
}

/** Instant Voice Clone: 30-60 sn temiz kayıttan ses kimliği üretir. */
export async function sesKlonla(ad: string, ses: Blob, dosyaAdi: string): Promise<string> {
  const form = new FormData();
  form.append("name", ad);
  form.append("files", ses, dosyaAdi);
  const res = await fetch(`${TABAN}/voices/add`, {
    method: "POST",
    headers: { "xi-api-key": anahtar() },
    body: form,
  });
  if (!res.ok) throw new Error(`ElevenLabs klonlama ${res.status}`);
  const veri = (await res.json()) as { voice_id: string };
  if (!veri.voice_id) throw new Error("ElevenLabs voice_id dönmedi");
  return veri.voice_id;
}

/** Metni verilen sesle mp3'e çevirir (Türkçe destekli turbo model). */
export async function seslendir(voiceId: string, metin: string): Promise<ArrayBuffer> {
  const res = await fetch(
    `${TABAN}/text-to-speech/${voiceId}?output_format=mp3_44100_64`,
    {
      method: "POST",
      headers: { "xi-api-key": anahtar(), "content-type": "application/json" },
      body: JSON.stringify({
        text: metin,
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.5, similarity_boost: 0.8 },
      }),
    }
  );
  if (!res.ok) throw new Error(`ElevenLabs seslendirme ${res.status}`);
  return res.arrayBuffer();
}

/** Klonu siler (kamp sonu temizliği / slot geri kazanımı). Hata yutar. */
export async function sesSil(voiceId: string): Promise<void> {
  try {
    await fetch(`${TABAN}/voices/${voiceId}`, {
      method: "DELETE",
      headers: { "xi-api-key": anahtar() },
    });
  } catch {
    // temizlik çağrısı; başarısızlığı akışı durdurmasın
  }
}

/** AYNA'nın marka sesi: katılımcı klonu değil, kampın imza sesi.
 * Varsayılan, ElevenLabs'in derin/nötr hazır sesi; AYNA_SES_ID env'iyle
 * (örn. Voice Design'da tasarlanmış özel sesle) değiştirilebilir. */
export function aynaSesId(): string {
  return process.env.AYNA_SES_ID || "pNInz6obpgDQGcFmaJgB";
}

/** Direnç Simülatörü itirazcısının sesi (stok karakter; klon değil). */
export function itirazciSesId(): string {
  return process.env.ITIRAZCI_SES_ID || "VR6AewLTigWG4xSOukaG";
}

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
    `${TABAN}/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": anahtar(), "content-type": "application/json" },
      body: JSON.stringify({
        text: metin,
        model_id: "eleven_turbo_v2_5",
        // Onaylı v6 ayarları: doğal konuşma temposu, klon benzerliği yüksek
        voice_settings: {
          stability: 0.54,
          similarity_boost: 0.85,
          style: 0.30,
          use_speaker_boost: true,
          speed: 0.90,
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`ElevenLabs seslendirme ${res.status}`);
  return res.arrayBuffer();
}

/** Kişisel yansıma videosu için seslendirme metni.
 * Ad parametresi ile kişiselleştirilir. */
export function yansimaMetni(ad: string): string {
  return (
    `${ad}, bugün aynanın karşısındasın. ` +
    `Karşındaki kişi sensin. Ama henüz tam tanışmadığın bir sen. ` +
    `Bu kamp boyunca başkaları seni gözlemledi. Şimdi sen de kendini görüyorsun. ` +
    `Liderlik, seyirciye değil, aynaya bakmakla başlar. ` +
    `O bakış, zaten sende var. ` +
    `Şimdi onu hisset.`
  );
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

export type ElevenSes = {
  voice_id: string;
  name: string;
  category: string; // 'cloned' | 'premade' | 'professional' | 'generated'
};

/** Hesaptaki tüm sesleri listeler — slot doluluğunu görmek/temizlemek için. */
export async function sesleriListele(): Promise<ElevenSes[]> {
  const res = await fetch(`${TABAN}/voices`, {
    headers: { "xi-api-key": anahtar() },
  });
  if (!res.ok) throw new Error(`ElevenLabs ses listesi ${res.status}`);
  const veri = (await res.json()) as {
    voices?: { voice_id: string; name: string; category: string }[];
  };
  return (veri.voices ?? []).map((v) => ({
    voice_id: v.voice_id,
    name: v.name,
    category: v.category,
  }));
}

/** Bir sesi siler ve sonucu döner (sessizce yutmaz — admin temizliği için). */
export async function sesSilDogrula(voiceId: string): Promise<boolean> {
  const res = await fetch(`${TABAN}/voices/${voiceId}`, {
    method: "DELETE",
    headers: { "xi-api-key": anahtar() },
  });
  return res.ok;
}

/** AYNA'nın marka sesi: katılımcı klonu değil, kampın imza sesi.
 * Varsayılan, ElevenLabs'in derin/nötr hazır sesi; AYNA_SES_ID env'iyle
 * (örn. Voice Design'da tasarlanmış özel sesle) değiştirilebilir. */
export function aynaSesId(): string {
  return process.env.AYNA_SES_ID || "j82ax9yhzfYwq9lDvRWL";
}

/** Direnç Simülatörü itirazcısının sesi (stok karakter; klon değil). */
export function itirazciSesId(): string {
  return process.env.ITIRAZCI_SES_ID || "VR6AewLTigWG4xSOukaG";
}

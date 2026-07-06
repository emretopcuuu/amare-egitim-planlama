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

/** Sesle Yaz Faz 2 — Scribe ile ses→metin. Cihaz tanımasından (Web Speech)
 * belirgin daha isabetli Türkçe; WhatsApp-içi tarayıcı gibi Web Speech'in hiç
 * olmadığı ortamlarda da çalışır. Hata fırlatır — çağıran fail-open ele alır
 * (istemci telefon motoruna geri düşer). */
export async function sesYaziyaCevir(ses: Blob, dosyaAdi: string): Promise<string> {
  const form = new FormData();
  form.append("file", ses, dosyaAdi);
  form.append("model_id", "scribe_v1");
  form.append("language_code", "tr");
  // Etkinlik etiketleri ([gülüşme] vb.) yazı kutusuna girmesin.
  form.append("tag_audio_events", "false");
  const res = await fetch(`${TABAN}/speech-to-text`, {
    method: "POST",
    headers: { "xi-api-key": anahtar() },
    body: form,
  });
  if (!res.ok) throw new Error(`ElevenLabs ses→metin ${res.status}`);
  const veri = (await res.json()) as { text?: string };
  if (typeof veri.text !== "string") throw new Error("ElevenLabs metin dönmedi");
  return veri.text.trim();
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
        voice_settings: {
          stability: 0.50,
          similarity_boost: 0.85,
          style: 0.42,
          use_speaker_boost: true,
          speed: 1.12,
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

export type ElevenAbonelik = {
  tier: string | null;
  voiceLimit: number | null; // hesabın izin verdiği toplam ses (klon) slotu
};

/** Hesabın gerçek plan bilgisi — ses SLOT LİMİTİ dahil. Panel eskiden 30'u sabit
 * varsayıyordu (Creator); Pro/Scale yükseltmesinden sonra gerçek limiti buradan
 * okuyup gösteriyoruz. Hata olursa {null,null} döner (panel güvenli fallback'e düşer). */
export async function abonelikBilgisi(): Promise<ElevenAbonelik> {
  try {
    const res = await fetch(`${TABAN}/user/subscription`, {
      headers: { "xi-api-key": anahtar() },
    });
    if (!res.ok) return { tier: null, voiceLimit: null };
    const v = (await res.json()) as { tier?: string; voice_limit?: number };
    return {
      tier: typeof v.tier === "string" ? v.tier : null,
      voiceLimit: typeof v.voice_limit === "number" ? v.voice_limit : null,
    };
  } catch {
    return { tier: null, voiceLimit: null };
  }
}

export type AynaSesCinsiyeti = "erkek" | "kadin";

/** AYNA'nın marka sesi: katılımcı klonu değil, kampın imza sesi. Kişi
 * onboarding'in başında erkek/kadın seçer (varsayılan erkek); kişiye özel
 * seslendirmeler (ayna-ses, acilis-ses) bu tercihe göre sese düşer. Genel
 * anonslar (büyük ekran) her zaman erkek/varsayılan sesle kalır — o ortak
 * bir yayın, kişiye özel değil.
 * Env ile geçersiz kılınabilir: AYNA_SES_ID (erkek), AYNA_SES_KADIN_ID (kadın). */
export function aynaSesId(cinsiyet: AynaSesCinsiyeti = "erkek"): string {
  if (cinsiyet === "kadin") {
    return process.env.AYNA_SES_KADIN_ID || "LYfSi2g3Frvxg50fRl91";
  }
  return process.env.AYNA_SES_ID || "j82ax9yhzfYwq9lDvRWL";
}

/** Direnç Simülatörü itirazcısının sesi (stok karakter; klon değil). */
export function itirazciSesId(): string {
  return process.env.ITIRAZCI_SES_ID || "VR6AewLTigWG4xSOukaG";
}

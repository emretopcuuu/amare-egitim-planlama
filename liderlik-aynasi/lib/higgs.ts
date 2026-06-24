import "server-only";

// Higgsfield Platform API: kişisel yansıma videoları (Wan 2.7 — ucuz seçenek).
// Platform API: https://platform.higgsfield.ai
// Kimlik: HIGGSFIELD_CREDENTIALS="KEY_ID:KEY_SECRET"
// Dashboard: higgsfield.ai → Settings → API Keys

const TABAN = "https://platform.higgsfield.ai";

// Onaylı Wan 2.7 prompt — doğal hareket, aynaya bakış, ağız kapalı, loop.
const YANSIMA_PROMPT =
  "Photorealistic, fixed camera, no zoom. One man, his own reflection in a mirror " +
  "with a sharp ornate frame, seated at a desk with golden trophies and awards behind him. " +
  "He looks STRAIGHT AHEAD directly into the camera, deep into his own eyes, holding steady " +
  "confident warm eye contact the whole time, gaze locked forward toward the viewer. " +
  "Natural lifelike movement: calm breathing with shoulders rising and falling, a slight head " +
  "tilt and turn, a subtle confident shift of posture, a small natural hand movement on the " +
  "desk, natural blinking — alive and human, never stiff. Mouth stays closed, NOT speaking. " +
  "Begins and ends on the same pose for a seamless loop. Warm daylight, ivory and gold, " +
  "no darkness. Identity preserved, photorealistic, no distortion. Eyes to camera.";

export function higgsYapilandirildiMi(): boolean {
  return !!process.env.HIGGSFIELD_CREDENTIALS;
}

function kimlik(): string {
  const k = process.env.HIGGSFIELD_CREDENTIALS;
  if (!k) throw new Error("HIGGSFIELD_CREDENTIALS tanımlı değil");
  return k;
}

/** Wan 2.7 ile 5 sn'lik kişisel yansıma videosu üretimini başlatır; request_id döner. */
export async function yansimaVideosuBaslat(fotoUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`${TABAN}/wan2_7/image-to-video`, {
      method: "POST",
      headers: {
        Authorization: `Key ${kimlik()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        image_url: fotoUrl,
        prompt: YANSIMA_PROMPT,
        duration: 5,
        resolution: "720p",
        aspect_ratio: "9:16",
      }),
    });
    if (!res.ok) return null;
    const veri = (await res.json()) as { request_id?: string };
    return veri.request_id ?? null;
  } catch {
    return null;
  }
}

// Çoklu referans (karakter modeli): kimliği daha tutarlı kurar.
// Model slug'ı HIGGSFIELD_KARAKTER_MODEL env'inde; tanımlı değilse null döner.
export async function karakterVideosuBaslat(
  fotoUrllari: string[]
): Promise<string | null> {
  const model = process.env.HIGGSFIELD_KARAKTER_MODEL;
  if (!model || fotoUrllari.length === 0) return null;
  try {
    const res = await fetch(`${TABAN}/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${kimlik()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        images_list: fotoUrllari,
        prompt: YANSIMA_PROMPT,
        duration: 5,
        resolution: "720p",
      }),
    });
    if (!res.ok) return null;
    const veri = (await res.json()) as { request_id?: string };
    return veri.request_id ?? null;
  } catch {
    return null;
  }
}

export type HiggsDurum =
  | { durum: "bekliyor" }
  | { durum: "hazir"; videoUrl: string }
  | { durum: "hata" };

/** Üretim isteğinin durumunu sorgular. */
export async function yansimaDurumu(requestId: string): Promise<HiggsDurum> {
  try {
    const res = await fetch(`${TABAN}/requests/${requestId}/status`, {
      headers: { Authorization: `Key ${kimlik()}` },
    });
    if (!res.ok) return { durum: "hata" };
    const veri = (await res.json()) as {
      status?: string;
      video?: { url?: string };
    };
    if (veri.status === "completed" && veri.video?.url) {
      return { durum: "hazir", videoUrl: veri.video.url };
    }
    if (veri.status === "failed" || veri.status === "nsfw") {
      return { durum: "hata" };
    }
    return { durum: "bekliyor" };
  } catch {
    return { durum: "hata" };
  }
}

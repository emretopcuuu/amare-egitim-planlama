import "server-only";

// Higgsfield platform API: kişisel yansıma videoları.
// Sözleşme (docs.higgsfield.ai): POST https://platform.higgsfield.ai/{model}
// → { request_id, status_url } ; GET /requests/{id}/status → { status, video: { url } }.
// Kimlik: HIGGSFIELD_CREDENTIALS="KEY_ID:KEY_SECRET"

const TABAN = "https://platform.higgsfield.ai";

export function higgsYapilandirildiMi(): boolean {
  return !!process.env.HIGGSFIELD_CREDENTIALS;
}

function kimlik(): string {
  const k = process.env.HIGGSFIELD_CREDENTIALS;
  if (!k) throw new Error("HIGGSFIELD_CREDENTIALS tanımlı değil");
  return k;
}

const YANSIMA_PROMPT =
  "Living mirror reflection on dark night lake water: gentle silver ripples shimmer " +
  "across the portrait, slightly distorting it like a reflection on water; faint " +
  "moonlight glints drift over the surface; the person blinks once and gives a very " +
  "subtle calm smile; then the water settles and the reflection becomes perfectly " +
  "clear. Serene, mysterious, elite. No camera movement. No text.";

/** Fotoğraftan 5 sn'lik "canlı yansıma" videosu üretimini başlatır; request_id döner. */
export async function yansimaVideosuBaslat(fotoUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`${TABAN}/kling-video/v2.1/pro/image-to-video`, {
      method: "POST",
      headers: {
        Authorization: `Key ${kimlik()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        image_url: fotoUrl,
        prompt: YANSIMA_PROMPT,
        duration: 5,
      }),
    });
    if (!res.ok) return null;
    const veri = (await res.json()) as { request_id?: string };
    return veri.request_id ?? null;
  } catch {
    return null;
  }
}

// Çoklu referans (Canlı Ayna: düz/sağ/sol + selfie) → kimliği çok daha tutarlı
// kuran "karakter" videosu. Platform çoklu-görsel modelleri images_list dizisi
// alır (Seedance / Vidu Q1 Reference / Wan2.1 vb.). Model slug'ı canlı kredi
// testinde doğrulanıp HIGGSFIELD_KARAKTER_MODEL env'ine yazılır; env yoksa
// fonksiyon null döner ve çağıran taraf tek-görselli hatta zarifçe düşer.
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

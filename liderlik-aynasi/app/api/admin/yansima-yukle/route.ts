import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { yansimaVideoBagla, yansimaURLBagla } from "@/lib/yansima-pipeline";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 60;
const AZAMI_BAYT = 50 * 1024 * 1024;

// ÖNDEN ÜRETİLMİŞ YANSIMA VİDEOSU YÜKLEME (admin).
// Kamp öncesi harici olarak (MCP ile) üretilen, sesi gömülü tek mp4'ü bir
// katılımcıya bağlar. İki giriş biçimi:
//   • multipart/form-data: { kod, video (File) }   — yerel dosya
//   • application/json:     { kod, videoUrl }       — https URL'den indir
// Katılımcının voice_profiles kaydı (açık rıza) önceden var olmalı.
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }

  const tip = req.headers.get("content-type") ?? "";
  const db = supabaseAdmin();

  // Ortak: login_code → participant_id çözümle
  async function kisiyiBul(kod: unknown): Promise<string | null> {
    if (typeof kod !== "string" || !/^[0-9]{6}$/.test(kod)) return null;
    const { data } = await db
      .from("participants")
      .select("id")
      .eq("login_code", kod)
      .maybeSingle();
    return data?.id ?? null;
  }

  // --- JSON: { kod, videoUrl } ---
  if (tip.includes("application/json")) {
    let govde: { kod?: unknown; videoUrl?: unknown };
    try {
      govde = await req.json();
    } catch {
      return Response.json({ hata: "Geçersiz istek." }, { status: 400 });
    }
    const pid = await kisiyiBul(govde.kod);
    if (!pid) return Response.json({ hata: "Katılımcı bulunamadı." }, { status: 404 });
    if (typeof govde.videoUrl !== "string") {
      return Response.json({ hata: "videoUrl gerekli." }, { status: 400 });
    }
    const sonuc = await yansimaURLBagla(pid, govde.videoUrl);
    return sonuc.ok
      ? Response.json({ ok: true })
      : Response.json({ hata: sonuc.hata }, { status: sonuc.kod });
  }

  // --- multipart: { kod, video (File) } ---
  if (tip.includes("multipart/form-data")) {
    const form = await req.formData();
    const pid = await kisiyiBul(form.get("kod"));
    if (!pid) return Response.json({ hata: "Katılımcı bulunamadı." }, { status: 404 });

    const video = form.get("video");
    if (!(video instanceof File) || video.size === 0) {
      return Response.json({ hata: "Video dosyası gerekli." }, { status: 400 });
    }
    if (video.size > AZAMI_BAYT) {
      return Response.json({ hata: "Video çok büyük (>50MB)." }, { status: 413 });
    }
    if (!video.type.startsWith("video/")) {
      return Response.json({ hata: "Dosya bir video değil." }, { status: 400 });
    }
    const sonuc = await yansimaVideoBagla(pid, await video.arrayBuffer());
    return sonuc.ok
      ? Response.json({ ok: true })
      : Response.json({ hata: sonuc.hata }, { status: sonuc.kod });
  }

  return Response.json({ hata: "Desteklenmeyen içerik tipi." }, { status: 415 });
}

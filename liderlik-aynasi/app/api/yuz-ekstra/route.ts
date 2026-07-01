import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 30;
const AZAMI_BAYT = 6 * 1024 * 1024;
const AZAMI_TOPLAM = 9; // 3 zorunlu açı + en fazla 6 ekstra

// Canlı Ayna'nın 3 zorunlu açısına (düz/sağ/sol) EK olarak kişinin isteğe bağlı
// yüklediği fotoğraflar (profil, yukarıdan, boydan vb.) — video üretiminde
// referans görsel sayısını artırıp kaliteyi yükseltir. participants.yuz_fotolari
// dizisine "ekstra" etiketiyle EKLENİR (mevcutları silmez, karakter.ts'teki
// sıralama zorunlu 3 açıyı hep önde tutar).
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }

  const form = await req.formData();
  const dosyalar = form.getAll("foto").filter((f): f is File => f instanceof File && f.size > 0);
  if (dosyalar.length === 0) {
    return Response.json({ hata: tr.duvar.hata }, { status: 400 });
  }
  for (const f of dosyalar) {
    if (f.size > AZAMI_BAYT || !f.type.startsWith("image/")) {
      return Response.json({ hata: tr.duvar.hataBoyut }, { status: 413 });
    }
  }

  const db = supabaseAdmin();
  const { data: kisi } = await db
    .from("participants")
    .select("yuz_fotolari")
    .eq("id", session.sub)
    .maybeSingle();
  const mevcut = Array.isArray(kisi?.yuz_fotolari)
    ? (kisi!.yuz_fotolari as { aci: string; path: string }[])
    : [];

  const alinabilir = Math.max(0, AZAMI_TOPLAM - mevcut.length);
  if (alinabilir === 0) {
    return Response.json({ hata: tr.canliAyna.ekstraDoluHata }, { status: 400 });
  }

  const yeni: { aci: string; path: string }[] = [];
  for (const f of dosyalar.slice(0, alinabilir)) {
    const ext = f.type.includes("png") ? "png" : f.type.includes("webp") ? "webp" : "jpg";
    const yol = `yuz/${session.sub}/ekstra-${crypto.randomUUID()}.${ext}`;
    const up = await db.storage.from("sesler").upload(yol, f, { contentType: f.type, upsert: false });
    if (up.error) continue; // tek dosya başarısız olsa da diğerleri yüklensin
    yeni.push({ aci: "ekstra", path: yol });
  }
  if (yeni.length === 0) {
    return Response.json({ hata: tr.duvar.hata }, { status: 500 });
  }

  const { error } = await db
    .from("participants")
    .update({ yuz_fotolari: [...mevcut, ...yeni] })
    .eq("id", session.sub);
  if (error) {
    return Response.json({ hata: tr.duvar.hata }, { status: 500 });
  }
  return Response.json({ ok: true, sayi: yeni.length });
}

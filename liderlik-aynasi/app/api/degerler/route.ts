import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { cekirdekTamam, nedenCumlesiKur } from "@/lib/degerler";
import { tr } from "@/lib/i18n/tr";

// DEĞERLER ÇALIŞMASI — kısmi/aşamalı kayıt (kaydet-devam). Her adımda istemci
// yalnız değişeni gönderir; sunucu mevcut cevaplara birleştirir, çekirdek dolunca
// tamamlandı işaretler ve "neden cümlesi"ni damıtır.

const METIN_MAX = 4000;

export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { data } = await db
    .from("degerler_calismasi")
    .select("cevaplar, secilen_uc, neden_cumlesi, tamamlandi_at")
    .eq("participant_id", session.sub)
    .maybeSingle();
  return Response.json({
    cevaplar: (data?.cevaplar as Record<string, unknown>) ?? {},
    secilenUc: (data?.secilen_uc as string[]) ?? [],
    nedenCumlesi: data?.neden_cumlesi ?? null,
    tamam: !!data?.tamamlandi_at,
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ hata: "Geçersiz istek." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: mevcut } = await db
    .from("degerler_calismasi")
    .select("cevaplar, secilen_uc")
    .eq("participant_id", session.sub)
    .maybeSingle();

  // Gelen cevap parçalarını mevcutla birleştir (metinleri kırp; dizileri olduğu gibi).
  // JSONB sütunu için değerler string | string[] (Json-uyumlu) tutulur.
  const eski = ((mevcut?.cevaplar as Record<string, unknown>) ?? {});
  const birlesik: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(eski)) {
    if (typeof v === "string") birlesik[k] = v;
    else if (Array.isArray(v)) birlesik[k] = v.filter((x): x is string => typeof x === "string");
  }
  const gelen = (body.cevaplar ?? {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(gelen)) {
    if (typeof v === "string") birlesik[k] = v.slice(0, METIN_MAX);
    else if (Array.isArray(v)) birlesik[k] = v.filter((x): x is string => typeof x === "string").slice(0, 20);
  }

  const secilenUc = Array.isArray(body.secilenUc)
    ? (body.secilenUc as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 3)
    : ((mevcut?.secilen_uc as string[]) ?? []);

  const tamam = cekirdekTamam({ cevaplar: birlesik, secilenUc });
  const simdi = new Date().toISOString();

  const { error } = await db.from("degerler_calismasi").upsert(
    {
      participant_id: session.sub,
      cevaplar: birlesik,
      secilen_uc: secilenUc,
      neden_cumlesi: tamam ? nedenCumlesiKur(birlesik as Record<string, string>) : null,
      tamamlandi_at: tamam ? simdi : null,
      updated_at: simdi,
    },
    { onConflict: "participant_id" }
  );
  if (error) {
    return Response.json({ hata: "Kaydedilemedi." }, { status: 500 });
  }
  return Response.json({ ok: true, tamam });
}

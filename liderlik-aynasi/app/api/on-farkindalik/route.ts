import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { gecerliYanit, metinKodMu, profilHesapla, METIN_MAX } from "@/lib/onFarkindalik";
import { tr } from "@/lib/i18n/tr";

// ÖN FARKINDALIK — Katman 1→5 + Sonuç Kartı. Kısmi/aşamalı kayıt: kişi istediği
// kadarını yanıtlar, kaydeder, döner. Sayısal yanıt deger_sayi'ya, yazılı yanıt
// deger_metin'e gider. Tamamlanınca profil damıtılır (kişiye özel görev yakıtı).

export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { data } = await db
    .from("on_farkindalik_yanit")
    .select("madde_kod, deger_sayi, deger_metin")
    .eq("participant_id", session.sub);
  const sayilar: Record<string, number> = {};
  const metinler: Record<string, string> = {};
  for (const r of data ?? []) {
    if (r.deger_sayi !== null) sayilar[r.madde_kod] = r.deger_sayi;
    if (r.deger_metin !== null) metinler[r.madde_kod] = r.deger_metin;
  }
  return Response.json({ sayilar, metinler });
}

type Satir = {
  participant_id: string;
  madde_kod: string;
  deger_sayi: number | null;
  deger_metin: string | null;
  updated_at: string;
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const ham = Array.isArray(body?.yanitlar) ? body.yanitlar : null;
  if (!ham) {
    return Response.json({ hata: tr.onFarkindalik.hata }, { status: 400 });
  }

  const simdi = new Date().toISOString();
  const temiz: Satir[] = [];
  for (const y of ham) {
    const kod = typeof y?.kod === "string" ? y.kod : "";
    if (metinKodMu(kod)) {
      // Yazılı yanıt: boş kaydedilmez (boş alanlar gönderilmez); uzunluk kapağı.
      const metin = typeof y?.metin === "string" ? y.metin.trim().slice(0, METIN_MAX) : "";
      if (!metin) continue;
      temiz.push({ participant_id: session.sub, madde_kod: kod, deger_sayi: null, deger_metin: metin, updated_at: simdi });
    } else {
      const deger = Number(y?.deger);
      if (!gecerliYanit(kod, deger)) {
        return Response.json({ hata: tr.onFarkindalik.hata }, { status: 400 });
      }
      temiz.push({ participant_id: session.sub, madde_kod: kod, deger_sayi: deger, deger_metin: null, updated_at: simdi });
    }
  }
  if (temiz.length === 0) {
    return Response.json({ hata: tr.onFarkindalik.enAzBir }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { error } = await db
    .from("on_farkindalik_yanit")
    .upsert(temiz, { onConflict: "participant_id,madde_kod" });
  if (error) {
    return Response.json({ hata: tr.onFarkindalik.hata }, { status: 500 });
  }

  // Güncel tüm yanıtları çek, tüm katmanları profile damıt.
  const { data: hepsi } = await db
    .from("on_farkindalik_yanit")
    .select("madde_kod, deger_sayi, deger_metin")
    .eq("participant_id", session.sub);
  const sayilar: Record<string, number> = {};
  const metinler: Record<string, string> = {};
  for (const r of hepsi ?? []) {
    if (r.deger_sayi !== null) sayilar[r.madde_kod] = r.deger_sayi;
    if (r.deger_metin !== null) metinler[r.madde_kod] = r.deger_metin;
  }
  const profil = profilHesapla(sayilar, metinler);

  await db.from("on_farkindalik").upsert(
    {
      participant_id: session.sub,
      profil,
      basladi_at: simdi,
      tamamlandi_at: profil.tamamMi ? simdi : null,
      updated_at: simdi,
    },
    { onConflict: "participant_id" }
  );

  return Response.json({ ok: true, tamamMi: profil.tamamMi });
}

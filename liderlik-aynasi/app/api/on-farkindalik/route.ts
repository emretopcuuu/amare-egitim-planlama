import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { gecerliYanit, profilHesapla } from "@/lib/onFarkindalik";
import { tr } from "@/lib/i18n/tr";

// ÖN FARKINDALIK — Faz A (Katman 1). Kısmi/aşamalı kayıt: kişi istediği kadar
// maddeyi yanıtlar, kaydeder, sonra döner. Tamamlanınca üç alan puanı profile yazılır.

export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "participant") {
    return Response.json({ hata: tr.ortak.oturumGerekli }, { status: 401 });
  }
  const db = supabaseAdmin();
  const { data } = await db
    .from("on_farkindalik_yanit")
    .select("madde_kod, deger_sayi")
    .eq("participant_id", session.sub);
  const yanitlar: Record<string, number> = {};
  for (const r of data ?? []) {
    if (r.deger_sayi !== null) yanitlar[r.madde_kod] = r.deger_sayi;
  }
  return Response.json({ yanitlar });
}

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

  // Tüm katmanların geçerli maddeleri (k1:1-5, k2:1-10, k3:0-max).
  const temiz: { participant_id: string; madde_kod: string; deger_sayi: number; updated_at: string }[] = [];
  const simdi = new Date().toISOString();
  for (const y of ham) {
    const kod = typeof y?.kod === "string" ? y.kod : "";
    const deger = Number(y?.deger);
    if (!gecerliYanit(kod, deger)) {
      return Response.json({ hata: tr.onFarkindalik.hata }, { status: 400 });
    }
    temiz.push({ participant_id: session.sub, madde_kod: kod, deger_sayi: deger, updated_at: simdi });
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

  // Güncel tüm yanıtları çek, tüm katmanları profile damıt (görev motoru yakıtı).
  const { data: hepsi } = await db
    .from("on_farkindalik_yanit")
    .select("madde_kod, deger_sayi")
    .eq("participant_id", session.sub);
  const yanitlar: Record<string, number> = {};
  for (const r of hepsi ?? []) {
    if (r.deger_sayi !== null) yanitlar[r.madde_kod] = r.deger_sayi;
  }
  const profil = profilHesapla(yanitlar);

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

import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tumKayitlar } from "@/lib/tumKayitlar";
import { tr } from "@/lib/i18n/tr";
import {
  profilleriHesapla,
  turlariOlustur,
  type Katilimci,
  type RatingSatir,
} from "@/lib/aynaEsi";

// AYNA EŞİ — admin: eşleştirmeleri (yeniden) hesapla, yayınla/kapat.
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const aksiyon = body?.aksiyon;
  const db = supabaseAdmin();

  if (aksiyon === "ac" || aksiyon === "kapat") {
    const { error } = await db.from("settings").upsert({
      key: "ayna_esi_acik",
      value: aksiyon === "ac" ? "true" : "false",
      updated_at: new Date().toISOString(),
    });
    if (error) return Response.json({ hata: tr.aynaEsi.hata }, { status: 500 });
    return Response.json({ ok: true, acik: aksiyon === "ac" });
  }

  if (aksiyon !== "hesapla") {
    return Response.json({ hata: tr.aynaEsi.hata }, { status: 400 });
  }

  // Katılımcılar + tüm akran puanları (sayfa sayfa — 1000+ satır).
  const [{ data: kisilerHam }, ratings] = await Promise.all([
    db.from("participants").select("id, full_name, team").eq("role", "participant"),
    tumKayitlar<RatingSatir>((bas, son) =>
      db
        .from("ratings")
        .select("target_id, trait_id, score, is_self, is_hidden")
        .order("id")
        .range(bas, son)
    ),
  ]);
  const katilimcilar = (kisilerHam ?? []) as Katilimci[];

  const profiller = profilleriHesapla(katilimcilar, ratings);
  if (profiller.length < 2) {
    return Response.json({ hata: tr.aynaEsi.yetersizVeri }, { status: 409 });
  }
  const eslesmeler = turlariOlustur(profiller);
  if (eslesmeler.length === 0) {
    return Response.json({ hata: tr.aynaEsi.yetersizVeri }, { status: 409 });
  }

  // Hesaplama her zaman yayını kapatır — admin inceleyip manuel "Yayınla"ya basmalı.
  await db.from("settings").upsert({ key: "ayna_esi_acik", value: "false", updated_at: new Date().toISOString() });

  // Eskiyi temizle, yeniyi yaz (tek seferlik tam yeniden hesap).
  const { error: silErr } = await db.from("ayna_esi").delete().not("id", "is", null);
  if (silErr) return Response.json({ hata: tr.aynaEsi.hata }, { status: 500 });

  const satirlar = eslesmeler.map((e) => ({
    tur: e.tur,
    slot: e.slot,
    a_id: e.aId,
    b_id: e.bId,
    a_verir: e.aVerir,
    b_verir: e.bVerir,
  }));
  const { error: yazErr } = await db.from("ayna_esi").insert(satirlar as never);
  if (yazErr) return Response.json({ hata: tr.aynaEsi.hata }, { status: 500 });

  // Açıkta kalan (hiç eşleşmemiş) kişi sayısı — admin görsün.
  const eslesenler = new Set<string>();
  for (const e of eslesmeler) {
    eslesenler.add(e.aId);
    eslesenler.add(e.bId);
  }
  const acikta = profiller.length - eslesenler.size;

  return Response.json({
    ok: true,
    eslesmeSayi: eslesmeler.length,
    kisiSayi: profiller.length,
    acikta,
  });
}

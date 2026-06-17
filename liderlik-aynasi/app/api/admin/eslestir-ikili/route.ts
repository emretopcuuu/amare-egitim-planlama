import { randomInt } from "node:crypto";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

// GELİŞTİRME #8: Akran ikilileri TAMAMLAYICI kurulur — Ön Farkındalık'a göre
// herkes, kendi EN ZAYIF alanında GÜÇLÜ olan biriyle eşlenir (karşılıklı
// koçluk: güçlü olan zayıf olana yol gösterir, ikisi de öğretir/öğrenir).
// ÖF doldurmayanlar rastgele tamamlanır. Tek kalan eşsiz kalır.
export async function POST() {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }

  const db = supabaseAdmin();
  const { data: kisiler, error } = await db
    .from("participants")
    .select("id")
    .eq("role", "participant");
  if (error) {
    return Response.json({ hata: tr.admin.ikili.hata }, { status: 500 });
  }

  // Fisher-Yates karıştırma (kripto): eşit tamamlayıcılıkta seçim rastgele olsun.
  const idler = (kisiler ?? []).map((k) => k.id);
  for (let i = idler.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [idler[i], idler[j]] = [idler[j], idler[i]];
  }

  // Ön Farkındalık profilleri: her kişinin en zayıf + en güçlü alanı.
  const { data: oflar } = idler.length
    ? await db.from("on_farkindalik").select("participant_id, profil").in("participant_id", idler)
    : { data: [] as { participant_id: string; profil: unknown }[] };
  const profil = new Map<string, { zayif: string | null; guclu: string | null }>();
  for (const o of oflar ?? []) {
    const p = o.profil as {
      katman1?: { bloklar?: { kod: string; puan: number }[]; enZayif?: string | null };
    } | null;
    if (!p?.katman1) continue;
    const bloklar = p.katman1.bloklar ?? [];
    const guclu = bloklar.length ? bloklar.reduce((a, c) => (c.puan > a.puan ? c : a)).kod : null;
    profil.set(o.participant_id, { zayif: p.katman1.enZayif ?? null, guclu });
  }

  // Açgözlü tamamlayıcı eşleme: her kişi için en iyi tamamlayan partner.
  const havuz = [...idler];
  const ikililer: { a_id: string; b_id: string }[] = [];
  while (havuz.length >= 2) {
    const a = havuz.shift()!;
    const pa = profil.get(a) ?? { zayif: null, guclu: null };
    let enIyi = 0;
    let enIyiSkor = -1;
    for (let i = 0; i < havuz.length; i++) {
      const pb = profil.get(havuz[i]) ?? { zayif: null, guclu: null };
      let skor = 0;
      if (pa.zayif && pb.guclu === pa.zayif) skor += 2; // b, a'ya koçluk edebilir
      if (pb.zayif && pa.guclu === pb.zayif) skor += 2; // a, b'ye koçluk edebilir (karşılıklı)
      if (pa.zayif && pb.zayif && pa.zayif !== pb.zayif) skor += 1; // farklı zayıflık
      if (skor > enIyiSkor) {
        enIyiSkor = skor;
        enIyi = i;
      }
    }
    const b = havuz.splice(enIyi, 1)[0];
    ikililer.push({ a_id: a, b_id: b });
  }

  // Eski ikilileri (ve mesajları cascade ile) temizle, yenilerini yaz
  await db.from("pairs").delete().not("id", "is", null);
  if (ikililer.length > 0) {
    const { error: yazHata } = await db.from("pairs").insert(ikililer);
    if (yazHata) {
      return Response.json({ hata: tr.admin.ikili.hata }, { status: 500 });
    }
  }

  return Response.json({ ok: true, ikiliSayisi: ikililer.length });
}

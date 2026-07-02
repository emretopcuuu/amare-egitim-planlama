import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { satirEylemiUygula } from "@/lib/orkestrator";
import { yazAuditLog } from "@/lib/auditLog";
import { tr } from "@/lib/i18n/tr";

// FAZ 9.4 — KUMANDA: orkestratör senaryosuna admin müdahalesi.
// islem: 'atesle' (şimdi ateşle / 'hata' durumundaysa yeniden dene) | 'atla' |
//        'kaydir' (+dakika tüm bekleyenler) | 'durdur' | 'devam'.
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as
    | { islem?: string; id?: string; dakika?: number }
    | null;
  const islem = body?.islem ?? "";
  const db = supabaseAdmin();
  const simdi = new Date().toISOString();

  if ((islem === "atesle" || islem === "atla") && body?.id) {
    const { data: satir } = await db
      .from("kamp_senaryosu")
      .select("id, olay_kodu, eylem_tipi, eylem_hedef, eylem_baslik, eylem_deger, durum")
      .eq("id", body.id)
      .maybeSingle();
    const isleneblirDurumlar = islem === "atla" ? ["bekliyor"] : ["bekliyor", "hata"];
    if (!satir || !isleneblirDurumlar.includes(satir.durum)) {
      return Response.json({ hata: "Satır bu işlem için uygun durumda değil." }, { status: 409 });
    }
    if (islem === "atla") {
      await db.from("kamp_senaryosu").update({ durum: "atlandi" }).eq("id", satir.id).eq("durum", "bekliyor");
      await yazAuditLog(db, null, "senaryo_atla", { olay_kodu: satir.olay_kodu });
      return Response.json({ ok: true });
    }
    // atesle: sahiplen (bekliyor VEYA hata'dan) → eylemi uygula → audit
    const { data: alindi } = await db
      .from("kamp_senaryosu")
      .update({ durum: "atesledi", atesleme_zamani: simdi })
      .eq("id", satir.id)
      .in("durum", ["bekliyor", "hata"])
      .select("id")
      .maybeSingle();
    if (!alindi) return Response.json({ hata: "Satır çoktan işlendi." }, { status: 409 });
    try {
      await satirEylemiUygula(db, satir);
    } catch {
      await db.from("kamp_senaryosu").update({ durum: "hata" }).eq("id", satir.id);
      await yazAuditLog(db, null, "orkestrator_hata", { olay_kodu: satir.olay_kodu });
      return Response.json({ hata: "Eylem yine başarısız oldu." }, { status: 500 });
    }
    await yazAuditLog(db, null, satir.durum === "hata" ? "senaryo_yeniden_dene" : "senaryo_manuel_atesle", {
      olay_kodu: satir.olay_kodu,
    });
    return Response.json({ ok: true });
  }

  if (islem === "kaydir" && typeof body?.dakika === "number") {
    const { data: mevcut } = await db
      .from("settings").select("value").eq("key", "senaryo_kaydirma_dk").maybeSingle();
    const yeni = (Number(mevcut?.value) || 0) + body.dakika;
    await db.from("settings").upsert({ key: "senaryo_kaydirma_dk", value: String(yeni) });
    await yazAuditLog(db, null, "senaryo_kaydir", { dakika: body.dakika, toplam: yeni });
    return Response.json({ ok: true, toplamKaydirma: yeni });
  }

  if (islem === "durdur" || islem === "devam") {
    await db.from("settings").upsert({ key: "orkestrator_durduruldu", value: String(islem === "durdur") });
    await yazAuditLog(db, null, "senaryo_" + islem, {});
    return Response.json({ ok: true });
  }

  return Response.json({ hata: tr.admin.aynaDirektor.hata }, { status: 400 });
}

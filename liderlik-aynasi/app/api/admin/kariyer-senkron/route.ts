import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { kariyerSenkronCalistir, amareKayitlariGetir, csvCoz } from "@/lib/kariyerSenkron";
import { yazAuditLog } from "@/lib/auditLog";
import { tr } from "@/lib/i18n/tr";

export const maxDuration = 60;

// [E12] Kariyer senkron: body.csv verilmişse CSV fallback; yoksa dış kaynak
// (amare_raw_members, env). Yalnız kariyer YÜKSELİŞİ uygulanır + kutlama push'u.
export async function POST(req: Request) {
  const session = await adminOturumu();
  if (!session) return Response.json({ hata: tr.admin.yetkisiz }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { csv?: unknown } | null;
  const csv = typeof body?.csv === "string" ? body.csv.trim() : "";

  const kayitlar = csv ? csvCoz(csv) : await amareKayitlariGetir();
  if (!kayitlar) {
    return Response.json(
      { hata: "Dış kaynak (amare) env tanımlı değil — CSV yükleyerek senkronla." },
      { status: 400 }
    );
  }
  if (kayitlar.length === 0) {
    return Response.json({ hata: "Kayıt bulunamadı (CSV boş ya da biçimsiz)." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const sonuc = await kariyerSenkronCalistir(db, kayitlar);
  await yazAuditLog(db, session.sub, "kariyer_senkron", {
    kaynak: csv ? "csv" : "amare",
    taranan: sonuc.taranan,
    guncellenen: sonuc.guncellenen,
  });
  return Response.json({ ok: true, ...sonuc });
}

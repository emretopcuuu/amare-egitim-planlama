import { randomInt } from "node:crypto";
import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { csvAyristir, basliklariEsle, kodUret, type KatilimciSatiri } from "@/lib/csv";
import { tr } from "@/lib/i18n/tr";

const MAX_SATIR = 500;

// CSV import: tamamı geçerliyse yazar (kısmi import kafa karıştırır).
// Her kişiye mevcutlarla çakışmayan rastgele 6 haneli kod üretilir.
export async function POST(req: Request) {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }

  let csv: unknown;
  try {
    ({ csv } = await req.json());
  } catch {
    return Response.json({ hata: tr.admin.katilimcilar.hataBosDosya }, { status: 400 });
  }
  if (typeof csv !== "string" || !csv.trim()) {
    return Response.json({ hata: tr.admin.katilimcilar.hataBosDosya }, { status: 400 });
  }

  const satirlar = csvAyristir(csv);
  if (satirlar.length < 2) {
    return Response.json({ hata: tr.admin.katilimcilar.hataBosDosya }, { status: 400 });
  }
  if (satirlar.length - 1 > MAX_SATIR) {
    return Response.json({ hata: tr.admin.katilimcilar.hataCokSatir }, { status: 400 });
  }

  const esleme = basliklariEsle(satirlar[0]);
  if (![...esleme.values()].includes("ad")) {
    return Response.json({ hata: tr.admin.katilimcilar.hataBaslik }, { status: 400 });
  }

  const kayitlar: KatilimciSatiri[] = [];
  const hatalar: string[] = [];
  satirlar.slice(1).forEach((hucreler, i) => {
    const kayit: KatilimciSatiri = {
      ad: "", takim: null, sehir: null, telefon: null, eposta: null,
    };
    esleme.forEach((alan, sutun) => {
      const deger = (hucreler[sutun] ?? "").trim();
      if (!deger) return;
      if (alan === "ad") kayit.ad = deger;
      else kayit[alan as "takim" | "sehir" | "telefon" | "eposta"] = deger;
    });
    if (!kayit.ad) {
      hatalar.push(tr.admin.katilimcilar.hataSatir(i + 2, tr.admin.katilimcilar.hataAdEksik));
      return;
    }
    kayitlar.push(kayit);
  });

  if (hatalar.length > 0) {
    return Response.json({ hata: hatalar.slice(0, 10).join(" · ") }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: mevcutlar, error: kodHatasi } = await db
    .from("participants")
    .select("login_code");
  if (kodHatasi) {
    return Response.json({ hata: tr.admin.katilimcilar.hataSunucu }, { status: 500 });
  }

  const kullanilmis = new Set(mevcutlar.map((m) => m.login_code));
  const eklenecekler = kayitlar.map((k) => ({
    full_name: k.ad,
    team: k.takim,
    city: k.sehir,
    phone: k.telefon,
    email: k.eposta,
    login_code: kodUret(kullanilmis, randomInt),
    role: "participant" as const,
  }));

  const { error } = await db.from("participants").insert(eklenecekler);
  if (error) {
    return Response.json({ hata: tr.admin.katilimcilar.hataSunucu }, { status: 500 });
  }

  return Response.json({ eklenen: eklenecekler.length });
}

// Tüm katılımcıları siler (admin kalır); puanlar ve atamalar cascade ile gider.
// Geri dönüşü yok — onay istemci tarafında "SİL" yazdırılarak alınır.
export async function DELETE() {
  if (!(await adminOturumu())) {
    return Response.json({ hata: tr.admin.yetkisiz }, { status: 403 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("participants")
    .delete()
    .eq("role", "participant")
    .select("id");

  if (error) {
    return Response.json({ hata: tr.admin.katilimcilar.hataSunucu }, { status: 500 });
  }

  return Response.json({ silinen: data.length });
}

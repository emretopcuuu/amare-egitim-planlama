import { adminOturumu } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tumKayitlar } from "@/lib/tumKayitlar";
import { elmasSkorla, type ElmasGirdi, type OFProfil } from "@/lib/elmasSkoru";

export const maxDuration = 60;

// GELİŞTİRME #6 (2.tur): Rapor ihracatı. Tüm adayların ÖF özeti + öz/dış algı +
// Elmas skoru + görev/kıvılcım + kayma durumu CSV olarak indirilir (Excel uyumlu).
const MKOD = ["m1", "m2", "m3", "m4", "m5", "m6"] as const;
const OZ_ALAN_AD: Record<string, string> = {
  oz_saygi: "Öz Saygı",
  oz_guven: "Öz Güven",
  oz_yeterlilik: "Öz Yeterlilik",
};

function ort(satir: Record<string, number | string | null>): number | null {
  const v = MKOD.map((k) => satir[k]).filter((x): x is number => typeof x === "number");
  return v.length ? Number((v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)) : null;
}
function kac(s: unknown): string {
  return `"${String(s ?? "").replace(/"/g, '""')}"`;
}

export async function GET() {
  if (!(await adminOturumu())) return new Response("yetkisiz", { status: 403 });

  const db = supabaseAdmin();
  const [{ data: kisiler }, { data: oflar }, { data: ozler }, disler, gorevler, { data: churnlar }] =
    await Promise.all([
      db.from("participants").select("id, full_name, team, login_code").eq("role", "participant"),
      db.from("on_farkindalik").select("participant_id, profil, tamamlandi_at"),
      db.from("mini360_oz").select("participant_id, m1, m2, m3, m4, m5, m6"),
      tumKayitlar<{ target_id: string; m1: number | null; m2: number | null; m3: number | null; m4: number | null; m5: number | null; m6: number | null }>(
        (bas, son) => db.from("mini360_dis").select("target_id, m1, m2, m3, m4, m5, m6").order("id").range(bas, son)
      ),
      tumKayitlar<{ participant_id: string; spark_points: number }>((bas, son) =>
        db.from("missions").select("participant_id, spark_points").eq("status", "scored").order("participant_id").range(bas, son)
      ),
      db.from("churn_radar").select("participant_id").not("nudged_at", "is", null),
    ]);

  const profilHarita = new Map<string, OFProfil>();
  const ofTamam = new Map<string, boolean>();
  for (const o of oflar ?? []) {
    profilHarita.set(o.participant_id, (o.profil ?? null) as OFProfil);
    ofTamam.set(o.participant_id, !!o.tamamlandi_at);
  }
  const ozHarita = new Map<string, number | null>();
  for (const z of ozler ?? []) ozHarita.set(z.participant_id, ort(z));
  const disTop = new Map<string, { toplam: number; adet: number }>();
  for (const d of disler) {
    const o = ort(d);
    if (o === null) continue;
    const m = disTop.get(d.target_id) ?? { toplam: 0, adet: 0 };
    m.toplam += o;
    m.adet += 1;
    disTop.set(d.target_id, m);
  }
  const gorevTop = new Map<string, { say: number; kiv: number }>();
  for (const g of gorevler) {
    const m = gorevTop.get(g.participant_id) ?? { say: 0, kiv: 0 };
    m.say += 1;
    m.kiv += g.spark_points ?? 0;
    gorevTop.set(g.participant_id, m);
  }
  const kayanSet = new Set((churnlar ?? []).map((c) => c.participant_id));

  const girdiler: ElmasGirdi[] = (kisiler ?? []).map((k) => {
    const dis = disTop.get(k.id);
    return {
      pid: k.id,
      ad: k.full_name,
      takim: k.team,
      profil: profilHarita.get(k.id) ?? null,
      mini360: { ozAvg: ozHarita.get(k.id) ?? null, disAvg: dis ? dis.toplam / dis.adet : null, disSayi: dis ? dis.adet : 0 },
    };
  });
  const { sonuclar } = elmasSkorla(girdiler);
  const elmasHarita = new Map(sonuclar.map((s) => [s.pid, s]));

  const basliklar = [
    "Ad", "Takım", "Kod", "ÖF Tamam", "En Zayıf Alan", "Ritim", "Öz Algı", "Dış Algı", "Dış Sayı",
    "Elmas Skoru", "Aday", "Kör Nokta Farkı", "Tamamlanan Görev", "Kıvılcım", "Kayan",
  ];
  const satirlar = (kisiler ?? []).map((k) => {
    const p = profilHarita.get(k.id);
    const enZayif = p?.katman1?.enZayif ? OZ_ALAN_AD[p.katman1.enZayif] ?? p.katman1.enZayif : "";
    const dis = disTop.get(k.id);
    const e = elmasHarita.get(k.id);
    const gv = gorevTop.get(k.id);
    return [
      k.full_name,
      k.team ?? "",
      k.login_code,
      ofTamam.get(k.id) ? "Evet" : "Hayır",
      enZayif,
      p?.katman3?.ritim ?? "",
      ozHarita.get(k.id) ?? "",
      dis ? (dis.toplam / dis.adet).toFixed(1) : "",
      dis?.adet ?? 0,
      e?.puanlandi ? e.elmas : "",
      e?.aday ? "Evet" : "",
      e?.korNoktaFarki ?? "",
      gv?.say ?? 0,
      gv?.kiv ?? 0,
      kayanSet.has(k.id) ? "Evet" : "",
    ].map(kac).join(",");
  });

  const csv = "﻿" + [basliklar.map(kac).join(","), ...satirlar].join("\r\n");
  const tarih = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="liderlik-aynasi-rapor-${tarih}.csv"`,
    },
  });
}

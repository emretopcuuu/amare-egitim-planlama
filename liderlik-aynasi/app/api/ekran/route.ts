import { supabaseAdmin } from "@/lib/supabase/server";
import { acikDalga, aktifOzellikler } from "@/lib/degerlendirme";

// Büyük ekran verisi — bu uç HERKESE AÇIK (sahne bilgisayarı giriş yapmaz).
// Bu yüzden yalnızca isimsiz agregalar döner: sayılar, özellik ortalamaları
// ve takım-renkli isimsiz düğümlerden oluşan gözlem ağı. Gizli gözlem
// atamaları ele verilmesin diye bağlar yönsüzdür ve isim taşımaz.

export type EkranVerisi = {
  dalgaAdi: string | null;
  katilimci: number;
  ozTamam: number;
  toplamPuan: number;
  tamDegerlendirme: number;
  ozellikler: { ad: string; ort: number | null }[];
  takimlar: string[];
  dugumler: { t: number }[]; // t: takım indeksi (-1 = takımsız)
  baglar: { a: number; b: number; capraz: boolean }[];
  caprazOran: number | null;
};

export async function GET() {
  const db = supabaseAdmin();
  const [dalga, ozellikler, kisilerSonuc, puanlarSonuc] = await Promise.all([
    acikDalga(db),
    aktifOzellikler(db),
    db.from("participants").select("id, team").eq("role", "participant"),
    db.from("ratings").select("rater_id, target_id, trait_id, score, is_self"),
  ]);
  if (kisilerSonuc.error || puanlarSonuc.error) {
    return Response.json({ hata: "Veri alınamadı." }, { status: 500 });
  }

  const kisiler = kisilerSonuc.data;
  const puanlar = puanlarSonuc.data;
  const ozellikSayisi = ozellikler.length;

  // Düğümler: isim yok, yalnızca takım indeksi
  const takimlar = [...new Set(kisiler.map((k) => k.team).filter(Boolean))] as string[];
  takimlar.sort((a, b) => a.localeCompare(b, "tr-TR"));
  const takimIndeksi = new Map(takimlar.map((t, i) => [t, i]));
  const dugumIndeksi = new Map(kisiler.map((k, i) => [k.id, i]));
  const dugumler = kisiler.map((k) => ({
    t: k.team ? takimIndeksi.get(k.team)! : -1,
  }));

  // Özellik ortalamaları (dış puanlar, tüm dalgalar) + öz tamamlama + bağlar
  const ozellikToplam = new Map<number, { t: number; n: number }>();
  const ozSayilari = new Map<string, number>();
  const ciftler = new Map<string, { a: number; b: number; capraz: boolean }>();
  const tamCiftSayilari = new Map<string, number>();

  for (const p of puanlar) {
    if (p.is_self) {
      ozSayilari.set(p.rater_id, (ozSayilari.get(p.rater_id) ?? 0) + 1);
      continue;
    }
    const k = ozellikToplam.get(p.trait_id) ?? { t: 0, n: 0 };
    k.t += p.score;
    k.n += 1;
    ozellikToplam.set(p.trait_id, k);

    const a = dugumIndeksi.get(p.rater_id);
    const b = dugumIndeksi.get(p.target_id);
    if (a === undefined || b === undefined) continue;
    const anahtar = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (!ciftler.has(anahtar)) {
      const ta = dugumler[a].t;
      const tb = dugumler[b].t;
      ciftler.set(anahtar, { a, b, capraz: ta !== tb || ta === -1 });
    }
    const yonlu = `${p.rater_id}|${p.target_id}`;
    tamCiftSayilari.set(yonlu, (tamCiftSayilari.get(yonlu) ?? 0) + 1);
  }

  const baglar = [...ciftler.values()];
  const caprazSayisi = baglar.filter((b) => b.capraz).length;
  const ozTamam = [...ozSayilari.values()].filter((n) => n >= ozellikSayisi).length;
  const tamDegerlendirme = [...tamCiftSayilari.values()].filter(
    (n) => n >= ozellikSayisi
  ).length;

  const veri: EkranVerisi = {
    dalgaAdi: dalga?.name ?? null,
    katilimci: kisiler.length,
    ozTamam,
    toplamPuan: puanlar.length,
    tamDegerlendirme,
    ozellikler: ozellikler.map((o) => {
      const k = ozellikToplam.get(o.id);
      return { ad: o.name, ort: k ? k.t / k.n : null };
    }),
    takimlar,
    dugumler,
    baglar,
    caprazOran:
      baglar.length > 0 ? Math.round((caprazSayisi / baglar.length) * 100) : null,
  };

  return Response.json(veri);
}

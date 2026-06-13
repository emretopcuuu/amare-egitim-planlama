import { supabaseAdmin } from "@/lib/supabase/server";
import { acikDalga, aktifOzellikler } from "@/lib/degerlendirme";
import { unvanBul } from "@/lib/kivilcim";

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
  // Kıvılcım Ligi: oyunlaştırma sıralaması isimlidir (puan/yorum değil,
  // görev puanı — sahne alkışı için bilinçli olarak açık).
  lig: { ad: string; kivilcim: number; unvan: string }[];
  takimLigi: { takim: string; kivilcim: number }[];
  // Senkron An canlı katılımı (aktif pencere yoksa null)
  senkron: { baslik: string; yanit: number; toplam: number; kalanSn: number } | null;
  // Sahne olayları: /ekran'ın bir kez oynatacağı taze sinyaller (≤4 dk)
  sahne: {
    fiero: { id: string; ad: string; sesUrl: string | null } | null;
    dalga: { id: number; olayId: string } | null;
    anons: { id: string; sesUrl: string | null } | null;
    // Host'un sahne kumandasından gönderdiği anlık serbest duyuru (≤3 dk taze)
    duyuru: { metin: string } | null;
  };
};

export async function GET() {
  const db = supabaseAdmin();
  const simdi = new Date();
  const [
    dalga,
    ozellikler,
    kisilerSonuc,
    puanlarSonuc,
    gorevSonuc,
    senkronSonuc,
    fieroSonuc,
    sahneAyarSonuc,
  ] = await Promise.all([
      acikDalga(db),
      aktifOzellikler(db),
      db
        .from("participants")
        .select("id, full_name, team")
        .eq("role", "participant"),
      db.from("ratings").select("rater_id, target_id, trait_id, score, is_self"),
      db
        .from("missions")
        .select("participant_id, spark_points")
        .eq("status", "scored"),
      db
        .from("missions")
        .select("title, status, due_at")
        .eq("kind", "senkron")
        .gt("due_at", simdi.toISOString())
        .order("issued_at", { ascending: false })
        .limit(300),
      db
        .from("missions")
        .select("id, participant_id, scored_at")
        .eq("ai_score", 10)
        .gte("scored_at", new Date(simdi.getTime() - 4 * 60_000).toISOString())
        .order("scored_at", { ascending: false })
        .limit(1),
      db
        .from("settings")
        .select("key, value")
        .in("key", ["sahne_dalga", "sahne_anons", "sahne_duyuru"]),
    ]);
  if (kisilerSonuc.error || puanlarSonuc.error || gorevSonuc.error) {
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

  // Kıvılcım Ligi
  const kivilcimlar = new Map<string, number>();
  for (const g of gorevSonuc.data) {
    kivilcimlar.set(
      g.participant_id,
      (kivilcimlar.get(g.participant_id) ?? 0) + g.spark_points
    );
  }
  const lig = kisiler
    .map((k) => ({
      ad: k.full_name,
      takim: k.team,
      kivilcim: kivilcimlar.get(k.id) ?? 0,
    }))
    .filter((k) => k.kivilcim > 0)
    .sort((a, b) => b.kivilcim - a.kivilcim);
  const takimToplam = new Map<string, number>();
  for (const k of lig) {
    if (!k.takim) continue;
    takimToplam.set(k.takim, (takimToplam.get(k.takim) ?? 0) + k.kivilcim);
  }

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
    lig: lig.slice(0, 5).map((k) => ({
      ad: k.ad,
      kivilcim: k.kivilcim,
      unvan: unvanBul(k.kivilcim).mevcut.ad,
    })),
    takimLigi: [...takimToplam.entries()]
      .map(([takim, kivilcim]) => ({ takim, kivilcim }))
      .sort((a, b) => b.kivilcim - a.kivilcim),
    sahne: await (async () => {
      const ayar = new Map((sahneAyarSonuc.data ?? []).map((a) => [a.key, a.value]));
      const taze = (deger: string | undefined, dakika: number) => {
        if (!deger) return null;
        const ayrac = deger.indexOf(":");
        const id = deger.slice(0, ayrac);
        const ts = new Date(deger.slice(ayrac + 1)).getTime();
        return simdi.getTime() - ts <= dakika * 60_000 ? { id, deger } : null;
      };
      const imzali = async (yol: string) => {
        const { data } = await db.storage.from("sesler").createSignedUrl(yol, 600);
        return data?.signedUrl ?? null;
      };

      const fieroHam = (fieroSonuc.data ?? [])[0];
      const fiero = fieroHam
        ? {
            id: fieroHam.id,
            ad:
              kisiler.find((k) => k.id === fieroHam.participant_id)?.full_name ??
              "Bir katılımcı",
            sesUrl: await imzali(`anons/fiero-${fieroHam.id}.mp3`),
          }
        : null;

      const dalgaTaze = taze(ayar.get("sahne_dalga"), 4);
      const anonsTaze = taze(ayar.get("sahne_anons"), 4);
      // Anlık duyuru "ts|metin" biçiminde saklanır (metin iki nokta içerebilir
      // diye taze() değil; ts ilk borudan önce). 3 dk taze kalır.
      let duyuru: { metin: string } | null = null;
      const duyuruHam = ayar.get("sahne_duyuru");
      if (duyuruHam) {
        const ayrac = duyuruHam.indexOf("|");
        const ts = new Date(duyuruHam.slice(0, ayrac)).getTime();
        if (ayrac > 0 && simdi.getTime() - ts <= 3 * 60_000) {
          duyuru = { metin: duyuruHam.slice(ayrac + 1) };
        }
      }
      return {
        fiero,
        dalga: dalgaTaze
          ? { id: Number(dalgaTaze.id), olayId: dalgaTaze.deger }
          : null,
        anons: anonsTaze
          ? {
              id: anonsTaze.deger,
              sesUrl: await imzali(`anons/program-${anonsTaze.id}.mp3`),
            }
          : null,
        duyuru,
      };
    })(),
    senkron: (() => {
      const aktifler = senkronSonuc.data ?? [];
      if (aktifler.length === 0) return null;
      const baslik = aktifler[0].title;
      const ayni = aktifler.filter((s) => s.title === baslik);
      return {
        baslik,
        yanit: ayni.filter((s) => s.status !== "pending").length,
        toplam: ayni.length,
        kalanSn: Math.max(
          0,
          Math.round(
            (new Date(ayni[0].due_at).getTime() - simdi.getTime()) / 1000
          )
        ),
      };
    })(),
  };

  return Response.json(veri);
}

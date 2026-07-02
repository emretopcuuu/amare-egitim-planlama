import { supabaseAdmin } from "@/lib/supabase/server";
import { acikDalga, aktifOzellikler } from "@/lib/degerlendirme";
import { unvanBul } from "@/lib/kivilcim";
import { arketipBul } from "@/lib/arketip";
import { kampBaslangicGetir } from "@/lib/kampZaman";
import { sozMuhurDurumu } from "@/lib/sozMuhur";

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
  // UX #8 — spotlight: sahnedeki kişi salt sayı değil; arketipi + en güçlü
  // yönü gösterilir. Salon "kim bu?" sorusuna 2 saniyede yanıt alır.
  lig: {
    ad: string;
    kivilcim: number;
    unvan: string;
    arketip: { ad: string; simge: string } | null;
    enGuclu: string | null;
  }[];
  takimLigi: { takim: string; kivilcim: number }[];
  // Bugünün canlı sayaçları (Istanbul günü) — salonun enerjisini görünür kılar.
  bugun: { gorev: number; gozlem: number; takdir: number; fiero: number };
  // KÜMÜLATİF kamp efsanesi — sahne asla "0/ölü" görünmesin; toplam kahraman sayaç.
  kumulatif: { kivilcim: number; gorev: number; takdir: number; fiero: number; anlar: number };
  // Kampın 1. gününün Istanbul tarihi ("YYYY-MM-DD") — ŞİMDİ/SIRADA program
  // slaytı bunu kullanır (sahne bilgisayarı oturumsuz; gün/blok bundan türer).
  kampGun1: string | null;
  // CANLI OLAY AKIŞI: AYNA'nın o an ne yaptığının kanıtı (ticker + karar anı).
  // Gizlilik: görev/fiero/takdir İSİMLE (AYNA'nın eylemi / olumlu), gözlem
  // ANONİM (kim kimi gözledi sızmaz). tur: "gorev" anı karar-flash'ı tetikler.
  olaylar: { tur: string; ikon: string; metin: string; ts: string }[];
  // Senkron An canlı katılımı (aktif pencere yoksa null)
  senkron: { baslik: string; yanit: number; toplam: number; kalanSn: number } | null;
  // Sahne Vitrini (DJ): host belirli bir slaydı sabitlediyse onun indeksi,
  // yoksa null (ekran otomatik döngüye devam eder). 30 dk taze.
  vitrin: number | null;
  // Onaylı anı duvarı fotoğraflarının imzalı URL'leri (en yeni)
  anilar: string[];
  // [9] SALON MOZAİĞİ — kolektif dönüşüm haritası. Tamamen İSİMSİZ: her katılımcı
  // için yalnız arketip ikon+ad döner (sıra karışık — kimin hangisi olduğu
  // eşleştirilemez). körNoktaKapananOran: dalga-dalga öz/dış açığı daralan
  // kişilerin oranı (yeterli veri olan kişiler arasında). enCokBuyuyenOzellik:
  // kamp genelinde ilk→son dalga dış-puan ortalaması en çok yükselen özellik.
  mozaik: {
    arketipler: { simge: string; ad: string }[];
    korNoktaKapananOran: number | null;
    korNoktaOrneklem: number;
    enCokBuyuyenOzellik: { ad: string; fark: number } | null;
  };
  // #8 Anonim sosyal kıvılcım: yüksek puanlı (≥8), gizlenmemiş, öz-olmayan
  // yorum metinleri — KİMLİKSİZ. Kim kime yazdı taşınmaz; sadece olumlu söz.
  yansimalar: string[];
  // FAZ 3.5 — kamp zinciri: en uzun aktif zincirin ulaştığı halka sayısı.
  zincir: { uzunluk: number } | null;
  // FAZ 5.2 — bugün altın görevi tamamlayanlar (isimli kutlama).
  altinKazananlar: string[];
  // [1.5] Salon Daveti: bu salondan çıkan (gönderildi işaretli) davet sayısı.
  salonDavetSayisi: number;
  // [E3] Kolektif söz finali: mühürlenen söz sayısı / söz veren sayısı.
  sozMuhur: { muhurlu: number; sozVeren: number } | null;
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
    fotoSonuc,
    yansimaSonuc,
  ] = await Promise.all([
      acikDalga(db),
      aktifOzellikler(db),
      db
        .from("participants")
        .select("id, full_name, team")
        .eq("role", "participant"),
      db.from("ratings").select("rater_id, target_id, trait_id, score, is_self, wave"),
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
        .in("key", ["sahne_dalga", "sahne_anons", "sahne_duyuru", "sahne_slayt"]),
      db
        .from("photos")
        .select("path")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(12),
      // #8: SADECE yorum metni + skor seçilir — rater_id/target_id ASLA çekilmez
      // ki kimlik bu uçtan (herkese açık) sızamasın. Yüksek puan + gizlenmemiş.
      db
        .from("ratings")
        .select("comment")
        .gte("score", 8)
        .eq("is_self", false)
        .eq("is_hidden", false)
        .not("comment", "is", null)
        .order("created_at", { ascending: false })
        .limit(60),
    ]);
  if (kisilerSonuc.error || puanlarSonuc.error || gorevSonuc.error) {
    return Response.json({ hata: "Veri alınamadı." }, { status: 500 });
  }

  // Bugünün canlı sayaçları (Istanbul günü başından beri).
  const bugunIst = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
  }).format(simdi);
  const gunBasi = new Date(`${bugunIst}T00:00:00+03:00`).toISOString();
  const [bgGorev, bgGozlem, bgTakdir, bgFiero] = await Promise.all([
    db.from("missions").select("id", { count: "exact", head: true }).eq("status", "scored").gte("scored_at", gunBasi),
    db.from("ratings").select("id", { count: "exact", head: true }).eq("is_self", false).gte("created_at", gunBasi),
    db.from("kudos").select("id", { count: "exact", head: true }).eq("is_hidden", false).gte("created_at", gunBasi),
    db.from("missions").select("id", { count: "exact", head: true }).eq("ai_score", 10).gte("scored_at", gunBasi),
  ]);
  const bugun = {
    gorev: bgGorev.count ?? 0,
    gozlem: bgGozlem.count ?? 0,
    takdir: bgTakdir.count ?? 0,
    fiero: bgFiero.count ?? 0,
  };

  // KÜMÜLATİF: kampın bugüne dek toplam efsanesi (sahne hero sayaç).
  const [kumGorev, kumTakdir, kumFiero, kumAnlar] = await Promise.all([
    db.from("missions").select("id", { count: "exact", head: true }).eq("status", "scored"),
    db.from("kudos").select("id", { count: "exact", head: true }).eq("is_hidden", false),
    db.from("missions").select("id", { count: "exact", head: true }).eq("ai_score", 10),
    db.from("photos").select("id", { count: "exact", head: true }).eq("status", "approved"),
  ]);
  const kumulatif = {
    kivilcim: (gorevSonuc.data ?? []).reduce((s, g) => s + (g.spark_points ?? 0), 0),
    gorev: kumGorev.count ?? 0,
    takdir: kumTakdir.count ?? 0,
    fiero: kumFiero.count ?? 0,
    anlar: kumAnlar.count ?? 0,
  };

  // FAZ 3.5 — KAMP ZİNCİRİ: en uzun aktif zincirin şu ana dek ulaştığı halka
  // sayısı. İsimsiz — yalnız sayı, kimin zincirde olduğu asla açığa çıkmaz.
  const { data: zincirSatirlari } = await db
    .from("missions")
    .select("zincir_id, zincir_sira")
    .not("zincir_id", "is", null);
  let zincirUzunluk = 0;
  for (const z of zincirSatirlari ?? []) {
    if ((z.zincir_sira ?? 0) > zincirUzunluk) zincirUzunluk = z.zincir_sira ?? 0;
  }

  // FAZ 5.2 — ALTIN GÖREV KUTLAMASI: bugün altın görevi TAMAMLAYAN kişiler,
  // İSİMLİ (bilinçli istisna — bu bir kutlama, ifşa değil; başkalarının
  // puanı/yorumu değil kişinin kendi başarısı gösterilir).
  const { data: altinKazananHam } = await db
    .from("missions")
    .select("participant_id")
    .eq("altin", true)
    .eq("status", "scored")
    .gte("scored_at", gunBasi);
  const altinKazananIdler = [...new Set((altinKazananHam ?? []).map((m) => m.participant_id))];
  const altinKazananlar = altinKazananIdler
    .map((id) => kisilerSonuc.data?.find((k) => k.id === id)?.full_name)
    .filter((ad): ad is string => !!ad);

  // [1.5] Salon Daveti sayacı — bu salondan çıkan davetler (isimsiz, yalnız sayı).
  const { count: salonDavetCount } = await db
    .from("salon_daveti")
    .select("id", { count: "exact", head: true })
    .not("gonderildi_at", "is", null);
  const salonDavetSayisi = salonDavetCount ?? 0;

  // [E3] Kolektif söz mühür sayacı (büyük ekran için).
  const sozMuhurEkran = await sozMuhurDurumu(db);

  // CANLI OLAY AKIŞI — son 45 dk'lık aktivite. Kişinin EYLEMİ görünür ama
  // YAPTIĞININ İÇERİĞİ/HEDEFİ değil: görev başlığı yazılmaz; peer eylemler
  // (değerlendirme/takdir) "kim kimi" sızdırmadan anonim ("biri ...").
  const olayBasi = new Date(simdi.getTime() - 45 * 60_000).toISOString();
  const [sonGorevler, sonTamamlanan, sonKudos, sonGozlemler] = await Promise.all([
    db
      .from("missions")
      .select("participant_id, kind, issued_at")
      .gte("issued_at", olayBasi)
      .order("issued_at", { ascending: false })
      .limit(20),
    db
      .from("missions")
      .select("participant_id, ai_score, scored_at")
      .not("scored_at", "is", null)
      .gte("scored_at", olayBasi)
      .order("scored_at", { ascending: false })
      .limit(20),
    db
      .from("kudos")
      .select("created_at")
      .eq("is_hidden", false)
      .gte("created_at", olayBasi)
      .order("created_at", { ascending: false })
      .limit(8),
    db
      .from("ratings")
      .select("created_at")
      .eq("is_self", false)
      .gte("created_at", olayBasi)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // Onaylı anı duvarı fotoğrafları — büyük ekran slaytı için imzalı URL'ler
  const anilar = (
    await Promise.all(
      (fotoSonuc.data ?? []).map(async (f) => {
        const { data } = await db.storage.from("sesler").createSignedUrl(f.path, 600);
        return data?.signedUrl ?? null;
      })
    )
  ).filter((u): u is string => u !== null);

  const kisiler = kisilerSonuc.data;
  const puanlar = puanlarSonuc.data;
  const ozellikSayisi = ozellikler.length;
  const ozellikAd = new Map(ozellikler.map((o) => [o.id, o.name]));

  // Kişinin EYLEMİ görünür, içeriği/hedefi GİZLİ. Görev = AYNA→kişi (isimli,
  // başlıksız). Tamamlama/fiero = kişinin kendi eylemi (isimli). Peer eylemler
  // (değerlendirme/takdir) ANONİM — kim kimi sızmaz ("biri ...").
  const adOf = (id: string) =>
    (kisiler.find((k) => k.id === id)?.full_name ?? "Biri").split(" ")[0];
  const olaylar: EkranVerisi["olaylar"] = [];
  // Yeni görev aldı (başlık yok)
  for (const g of sonGorevler.data ?? []) {
    if (g.kind === "senkron" || g.kind === "soz") continue;
    olaylar.push({ tur: "gorev", ikon: "🤖", metin: `${adOf(g.participant_id)} → yeni görev aldı`, ts: g.issued_at });
  }
  // Görev tamamladı / 10'da 10 (fiero) — içerik yok
  for (const m of sonTamamlanan.data ?? []) {
    if (!m.scored_at) continue;
    if (m.ai_score === 10) {
      olaylar.push({ tur: "fiero", ikon: "⭐", metin: `${adOf(m.participant_id)} → aynayı parlattı`, ts: m.scored_at });
    } else {
      olaylar.push({ tur: "tamam", ikon: "✅", metin: `${adOf(m.participant_id)} → bir görev tamamladı`, ts: m.scored_at });
    }
  }
  // Peer eylemler — ANONİM (kim kimi yok)
  for (const k of sonKudos.data ?? []) {
    olaylar.push({ tur: "takdir", ikon: "💛", metin: "biri bir takdir yazdı", ts: k.created_at });
  }
  for (const r of sonGozlemler.data ?? []) {
    olaylar.push({ tur: "gozlem", ikon: "👁", metin: "biri birini değerlendirdi", ts: r.created_at });
  }
  olaylar.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  // #8 Olumlu yansımalar: kısa, anlamlı, isimsiz sözler. Çok kısa/çok uzun
  // olanları ele, en yeni 60'tan deterministik bir karışımla 14 tanesini al.
  const yansimalar = (yansimaSonuc.data ?? [])
    .map((r) => (r.comment ?? "").trim())
    .filter((c) => c.length >= 12 && c.length <= 180)
    .slice(0, 14);

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
  // UX #8 — kişi başına özellik dış-ortalaması (lig spotlight: arketip + güçlü yön).
  const hedefOzellik = new Map<string, Map<number, { t: number; n: number }>>();

  for (const p of puanlar) {
    if (p.is_self) {
      ozSayilari.set(p.rater_id, (ozSayilari.get(p.rater_id) ?? 0) + 1);
      continue;
    }
    const k = ozellikToplam.get(p.trait_id) ?? { t: 0, n: 0 };
    k.t += p.score;
    k.n += 1;
    ozellikToplam.set(p.trait_id, k);

    const ho = hedefOzellik.get(p.target_id) ?? new Map<number, { t: number; n: number }>();
    const hk = ho.get(p.trait_id) ?? { t: 0, n: 0 };
    hk.t += p.score;
    hk.n += 1;
    ho.set(p.trait_id, hk);
    hedefOzellik.set(p.target_id, ho);

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

  // [9] SALON MOZAİĞİ — kolektif dönüşüm haritası için ek toplamalar.
  // Kişi başına öz puan (trait), kişi başına dalga-bazlı dış ortalama (trait) ve
  // kamp geneli dalga-bazlı dış ortalama (trait) — hepsi tek geçişte.
  const ozPuanlari = new Map<string, Map<number, { t: number; n: number }>>();
  const hedefOzellikDalga = new Map<string, Map<number, Map<number, { t: number; n: number }>>>();
  const kampDalgaOzellik = new Map<number, Map<number, { t: number; n: number }>>();
  for (const p of puanlar) {
    if (p.is_self) {
      const om = ozPuanlari.get(p.target_id) ?? new Map<number, { t: number; n: number }>();
      const ok = om.get(p.trait_id) ?? { t: 0, n: 0 };
      ok.t += p.score;
      ok.n += 1;
      om.set(p.trait_id, ok);
      ozPuanlari.set(p.target_id, om);
      continue;
    }
    if (p.wave === null) continue;
    const hd = hedefOzellikDalga.get(p.target_id) ?? new Map<number, Map<number, { t: number; n: number }>>();
    const hdw = hd.get(p.trait_id) ?? new Map<number, { t: number; n: number }>();
    const hdk = hdw.get(p.wave) ?? { t: 0, n: 0 };
    hdk.t += p.score;
    hdk.n += 1;
    hdw.set(p.wave, hdk);
    hd.set(p.trait_id, hdw);
    hedefOzellikDalga.set(p.target_id, hd);

    const kd = kampDalgaOzellik.get(p.wave) ?? new Map<number, { t: number; n: number }>();
    const kdk = kd.get(p.trait_id) ?? { t: 0, n: 0 };
    kdk.t += p.score;
    kdk.n += 1;
    kd.set(p.trait_id, kdk);
    kampDalgaOzellik.set(p.wave, kd);
  }

  // Arketip mozaiği: her yeterli-verili kişi için isimsiz {simge, ad} — sıralama
  // KARIŞIK (kimin hangisi olduğu eşleştirilemez, spotlight'tan bağımsız hesap).
  const arketipMozaik = kisiler
    .map((k) => {
      const ho = hedefOzellik.get(k.id);
      if (!ho || ho.size === 0) return null;
      const satirlar = ozellikler.map((o) => {
        const kk = ho.get(o.id);
        return { ad: o.name, dis: kk ? kk.t / kk.n : null, oz: null };
      });
      const ark = arketipBul(satirlar);
      return { simge: ark.simge, ad: ark.ad };
    })
    .filter((x): x is { simge: string; ad: string } => x !== null)
    .sort(() => Math.random() - 0.5);

  // Kör nokta kapanma oranı: kişi başına en büyük |öz-dış| açığına sahip trait'i
  // bul, o trait'in dalga-dalga dış ortalamasına bak (rapor.ts ile aynı mantık,
  // toplu). ≥2 dalga verisi olanlar örneklem; son açık ilk açıktan küçükse kapandı.
  let kapananSayisi = 0;
  let ornekSayisi = 0;
  for (const k of kisiler) {
    const om = ozPuanlari.get(k.id);
    const ho = hedefOzellik.get(k.id);
    const hd = hedefOzellikDalga.get(k.id);
    if (!om || !ho || !hd) continue;
    let enFark = -1;
    let korTrait: number | null = null;
    for (const [traitId, ok] of om) {
      const dis = ho.get(traitId);
      if (!dis) continue;
      const oz = ok.t / ok.n;
      const disOrt = dis.t / dis.n;
      const fark = Math.abs(oz - disOrt);
      if (fark > enFark) {
        enFark = fark;
        korTrait = traitId;
      }
    }
    if (korTrait === null) continue;
    const oz = om.get(korTrait)!;
    const ozDeger = oz.t / oz.n;
    const dalgaVerisi = hd.get(korTrait);
    if (!dalgaVerisi) continue;
    const dalgalarSirali = [...dalgaVerisi.entries()].sort((a, b) => a[0] - b[0]);
    if (dalgalarSirali.length < 2) continue;
    const ilkFark = Math.abs(ozDeger - dalgalarSirali[0][1].t / dalgalarSirali[0][1].n);
    const sonFark = Math.abs(
      ozDeger - dalgalarSirali[dalgalarSirali.length - 1][1].t / dalgalarSirali[dalgalarSirali.length - 1][1].n
    );
    ornekSayisi++;
    if (sonFark < ilkFark) kapananSayisi++;
  }

  // En çok büyüyen özellik (kamp geneli): ilk→son dalga dış-puan ortalaması
  // farkı en büyük özellik (bireysel değil, tüm katılımcıların toplamı).
  let enCokBuyuyenOzellik: { ad: string; fark: number } | null = null;
  {
    const dalgaSirali = [...kampDalgaOzellik.keys()].sort((a, b) => a - b);
    if (dalgaSirali.length >= 2) {
      const ilkDalga = kampDalgaOzellik.get(dalgaSirali[0])!;
      const sonDalga = kampDalgaOzellik.get(dalgaSirali[dalgaSirali.length - 1])!;
      for (const [traitId, sonK] of sonDalga) {
        const ilkK = ilkDalga.get(traitId);
        if (!ilkK) continue;
        const fark = sonK.t / sonK.n - ilkK.t / ilkK.n;
        if (fark > 0 && (!enCokBuyuyenOzellik || fark > enCokBuyuyenOzellik.fark)) {
          enCokBuyuyenOzellik = { ad: ozellikAd.get(traitId) ?? "", fark: Number(fark.toFixed(1)) };
        }
      }
    }
  }

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
      id: k.id,
      ad: k.full_name,
      takim: k.team,
      kivilcim: kivilcimlar.get(k.id) ?? 0,
    }))
    .filter((k) => k.kivilcim > 0)
    .sort((a, b) => b.kivilcim - a.kivilcim);
  // UX #8 — bir kişinin arketip + en güçlü yönünü dış-puanlarından çıkar.
  const spotlight = (kisiId: string) => {
    const ho = hedefOzellik.get(kisiId);
    if (!ho || ho.size === 0) return { arketip: null, enGuclu: null };
    const satirlar = ozellikler.map((o) => {
      const k = ho.get(o.id);
      return { ad: o.name, dis: k ? k.t / k.n : null, oz: null };
    });
    let enGuclu: string | null = null;
    let enYuksek = -1;
    for (const [traitId, k] of ho) {
      const ort = k.t / k.n;
      if (ort > enYuksek) {
        enYuksek = ort;
        enGuclu = ozellikAd.get(traitId) ?? null;
      }
    }
    const ark = arketipBul(satirlar);
    return { arketip: { ad: ark.ad, simge: ark.simge }, enGuclu };
  };
  // FAZ 7.7 — TAKIM ÇEKİMİ: takım skoru ham kıvılcım toplamı DEĞİL, üyelerin
  // TAMAMLAMA ORANIYLA çarpılmış hâli. Böylece tek kişinin 300'ü, 5 kişinin
  // 60'ından az eder — "birlikte tamamlayan" takım kazanır, tek yıldız değil.
  const takimHam = new Map<string, number>();
  for (const k of lig) {
    if (!k.takim) continue;
    takimHam.set(k.takim, (takimHam.get(k.takim) ?? 0) + k.kivilcim);
  }
  const takimUye = new Map<string, number>();
  const takimAktif = new Map<string, number>();
  const kivilcimliIdler = new Set(lig.filter((k) => k.kivilcim > 0).map((k) => k.id));
  for (const k of kisiler) {
    if (!k.team) continue;
    takimUye.set(k.team, (takimUye.get(k.team) ?? 0) + 1);
    if (kivilcimliIdler.has(k.id)) takimAktif.set(k.team, (takimAktif.get(k.team) ?? 0) + 1);
  }
  const takimToplam = new Map<string, number>();
  for (const [takim, ham] of takimHam) {
    const uye = takimUye.get(takim) ?? 1;
    const aktif = takimAktif.get(takim) ?? 0;
    const oran = uye > 0 ? aktif / uye : 0; // tamamlama genişliği
    takimToplam.set(takim, Math.round(ham * oran));
  }

  // Sahne Vitrini (DJ): host sabitlediği slayt indeksi (30 dk taze) ya da null
  let vitrin: number | null = null;
  const vitrinHam = (sahneAyarSonuc.data ?? []).find((a) => a.key === "sahne_slayt")?.value;
  if (vitrinHam && vitrinHam !== "-") {
    const ayrac = vitrinHam.indexOf("|");
    const idx = Number(vitrinHam.slice(0, ayrac));
    const ts = new Date(vitrinHam.slice(ayrac + 1)).getTime();
    if (ayrac > 0 && Number.isInteger(idx) && simdi.getTime() - ts <= 30 * 60_000) {
      vitrin = idx;
    }
  }

  const veri: EkranVerisi = {
    dalgaAdi: dalga?.name ?? null,
    vitrin,
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
    lig: lig.slice(0, 5).map((k) => {
      const s = spotlight(k.id);
      return {
        ad: k.ad,
        kivilcim: k.kivilcim,
        unvan: unvanBul(k.kivilcim).mevcut.ad,
        arketip: s.arketip,
        enGuclu: s.enGuclu,
      };
    }),
    takimLigi: [...takimToplam.entries()]
      .map(([takim, kivilcim]) => ({ takim, kivilcim }))
      .sort((a, b) => b.kivilcim - a.kivilcim),
    mozaik: {
      arketipler: arketipMozaik,
      korNoktaKapananOran:
        ornekSayisi > 0 ? Math.round((kapananSayisi / ornekSayisi) * 100) : null,
      korNoktaOrneklem: ornekSayisi,
      enCokBuyuyenOzellik,
    },
    zincir: zincirUzunluk > 0 ? { uzunluk: zincirUzunluk } : null,
    altinKazananlar,
    salonDavetSayisi,
    sozMuhur: sozMuhurEkran.sozVeren > 0 ? { muhurlu: sozMuhurEkran.muhurlu, sozVeren: sozMuhurEkran.sozVeren } : null,
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
    anilar,
    yansimalar,
    bugun,
    kumulatif,
    kampGun1: (await kampBaslangicGetir(db)) ?? null,
    olaylar: olaylar.slice(0, 16),
  };

  return Response.json(veri);
}

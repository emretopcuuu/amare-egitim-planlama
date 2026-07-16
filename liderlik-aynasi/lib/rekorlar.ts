import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { herkeseBildir } from "@/lib/push";
import { tumKayitlar } from "@/lib/tumKayitlar";

// ============================================================================
// G3 — REKORLAR: kişisel bestler + kamp kürsüsü (çok kategori)
// ============================================================================
// 12 kategori → herkes bir şeyde birinci olabilir. Rekorlar mevcut verilerden
// hesaplanır (rekorlar tablosu yalnız o anki rekortmeni saklar). Kırılınca
// herkese push. GUARDRAIL: sıfır suçlama — kimse "geride" diye anılmaz; yalnız
// rekortmen kutlanır ve "rekora uzaklığın" pozitif hedef olarak gösterilir.

export type Yon = "max" | "min";
export type Kategori = {
  key: string;
  ad: string;
  ikon: string;
  yon: Yon;
  birim: string;
  /** Kısa paragraf — /rekorlar'da kart açıklaması (neyi ölçtüğü, neden değerli). */
  aciklama: string;
  /** Onur cümlesi — Kürsü Brifi'nde rekortmen için sahnede okunacak tek satır. */
  onur: string;
};

export const KATEGORILER: Kategori[] = [
  {
    key: "hizli_teslim", ad: "En Hızlı Teslim", ikon: "⚡", yon: "min", birim: "dk",
    aciklama: "Bu rozet hızı değil, tereddütsüzlüğü ölçer. Zihninde 'ama'lar birikmeden harekete geçebilmek — bir görev geldiğinde onu ertelemeden, dosdoğru işe koyulmak.",
    onur: "Kararsızlığın en büyük düşman olduğu anlarda bile, ilk adımı atan sensin.",
  },
  {
    key: "gece_kusu", ad: "Gece Kuşu", ikon: "🦉", yon: "max", birim: ":00",
    aciklama: "Herkes uykuya çekilirken hâlâ sahada olmak, motivasyonun değil disiplinin işidir. Günün en yorgun anında bile kendine verdiğin sözü erteleyenlerden değil, yerine getirenlerden yana olduğunu gösteriyor.",
    onur: "Gece Kuşu, günün bittiğini bilir ama sözünün bitmediğini de bilir.",
  },
  {
    key: "erken_kalkan", ad: "Erken Kalkan", ikon: "🌅", yon: "min", birim: ":00",
    aciklama: "Kimse seni izlemezken, kimse alkışlamazken kendine verdiğin sözü tutmak — gerçek disiplin burada başlıyor. Günün kazanılmasının aslında gün doğmadan önce başladığını kanıtlıyor.",
    onur: "Sen, güneş daha doğmadan harekete geçensin.",
  },
  {
    key: "cok_gorev", ad: "Görev Canavarı", ikon: "🎯", yon: "max", birim: "görev",
    aciklama: "Büyük değişim tek bir anda değil, küçük tekrarların üst üste binmesinde doğar. Ham hacmi değil, o hacmin ardındaki sebatı ölçüyor — her gün yeniden 'evet' diyebilme gücünü.",
    onur: "Sen, büyük dönüşümün küçük adımlardan geldiğini yaşayarak kanıtlayansın.",
  },
  {
    key: "yuksek_puan", ad: "Zirve Puanı", ikon: "💎", yon: "max", birim: "/10",
    aciklama: "Bazen tek bir cümle, tek bir cevap, tek bir an her şeyi değiştirir. En iyi hâlinin bir hayal değil, gerçekten var olan ve bir kez bile olsa ona dokunulmuş bir yer olduğunu kanıtlıyor.",
    onur: "En iyi hâlinin gerçek olduğunu, sen kanıtladın.",
  },
  {
    key: "tam_puan", ad: "On Numara", ikon: "🔟", yon: "max", birim: "kez",
    aciklama: "Bir kez mükemmel olmak şans olabilir; tekrar tekrar mükemmel olmak bir seçimdir. En yüksek anını tesadüften çıkarıp bir alışkanlığa dönüştürdüğünü gösteriyor.",
    onur: "Mükemmelliğin senin için bir an değil, bir alışkanlık olduğunu gördük.",
  },
  {
    key: "istikrar", ad: "İstikrar Ustası", ikon: "📅", yon: "max", birim: "gün",
    aciklama: "Heves parlak ama kısa sürer; istikrar sessiz ama kalıcıdır. Motivasyonun düştüğü günlerde bile sahaya çıkmayı seçtiğini — gerçek liderliğin heyecanla değil kararlılıkla kurulduğunu gösteriyor.",
    onur: "Sen, hevesin değil kararlılığın gerçek liderliği kurduğunu bize gösterdin.",
  },
  {
    key: "cok_kivilcim", ad: "Kıvılcım Lideri", ikon: "✨", yon: "max", birim: "⚡",
    aciklama: "Her küçük katılım, her deneme, her adım bir kıvılcım bırakır. O kıvılcımların en çok kimin etrafında biriktiğini — kimin enerjisinin en çok yayıldığını gösteriyor.",
    onur: "Etrafındakileri en çok ısıtan ateş sende yandı.",
  },
  {
    key: "comert_takdirci", ad: "En Cömert Takdirci", ikon: "💛", yon: "max", birim: "takdir",
    aciklama: "Takdir etmek küçük bir eylem gibi görünür ama bencil olmayan bir dikkat ister — kendi başarına değil, başkasınınkine bakabilmeyi. Liderliğin aslında başkasını büyütmekle başladığını hatırlatıyor.",
    onur: "Sen, başkasını büyüterek kendi liderliğini gösterdin.",
  },
  {
    key: "takdir_alan", ad: "En Çok Takdir Alan", ikon: "🤍", yon: "max", birim: "takdir",
    aciklama: "Bir performans ölçütü değil — sessizce etkilediğin insan sayısının kanıtı. Başkalarının senin hakkında konuşma ihtiyacı duyması, kendiliğinden oluşan gerçek bir etkinin işareti.",
    onur: "Fark ettirmeden dokunduğun herkes, bugün bunu sana söylüyor.",
  },
  {
    key: "ret_cesuru", ad: "Ret Cesuru", ikon: "🔥", yon: "max", birim: "ret",
    aciklama: "Bu rozet bir kayıp saymıyor — tam tersini kutluyor. Reddi göze almak, 'evet' duyma ihtimaline inanmaktır; her 'hayır', aslında sahada olduğunun kanıtıdır.",
    onur: "Sen, 'hayır' duymaktan korkmayarak zaten kazanmış olduğunu kanıtladın.",
  },
  {
    key: "cok_sandik", ad: "Sandık Avcısı", ikon: "🎁", yon: "max", birim: "sandık",
    aciklama: "Ciddiyetin karşıtı değil, tamamlayıcısı — büyük bir yolculuğun ortasında bile merakını, oyunbazlığını kaybetmemek. En derin dönüşüm bile bir gülümsemeyle daha hafif taşınır.",
    onur: "Yolun ciddiyetinde bile neşeni kaybetmeyen sensin.",
  },
];

const IST_OFFSET = 3 * 3_600_000;
function istSaat(ts: string): number {
  return (new Date(ts).getUTCHours() + 3) % 24;
}
function istGun(ts: string): string {
  return new Date(Date.parse(ts) + IST_OFFSET).toISOString().slice(0, 10);
}

// Rekorlar KAMP BAŞLAYINCA KENDİLİĞİNDEN açılır: `ayna_baslangic` set edildiği an
// (kampın başlatıldığı an) otomatik aktif — kimsenin bir düğmeye basması gerekmez.
// Onboarding'de (ayna_baslangic yok) kapalı kalır ki yarım veriyle sıralama
// görünmesin. `rekorlar_acik` manuel bayrağı yalnız PROVA/erken-test için ek kapı.
export async function rekorlarAcikMi(db: Db): Promise<boolean> {
  const { data } = await db
    .from("settings")
    .select("key, value")
    .in("key", ["ayna_baslangic", "rekorlar_acik"]);
  const ayar = new Map((data ?? []).map((r) => [r.key, r.value]));
  if (ayar.get("ayna_baslangic")) return true; // kamp başladı → otomatik açık
  return ayar.get("rekorlar_acik") === "true"; // prova/erken test için manuel kapı
}

// Her kategori için kişi-bazlı değerler (Map<pid, number>). Tek yerde hesaplanır;
// hem kamp rekoru (lider) hem kişisel best bundan türer.
type KategoriHesap = Map<string, Map<string, number>>; // kategori.key → (pid → deger)

async function hesapla(db: Db): Promise<KategoriHesap> {
  // missions/kudos 1000-satır PostgREST tavanını aşabilir (150 kişi × birçok
  // görev); sayfalı çek, yoksa Gün 2'den itibaren kürsü sıralaması yanlış çıkar
  // ve Gün 3'te Emre sahneye YANLIŞ kişiyi "Görev Canavarı" diye çağırabilir.
  const [gorevler, kudos, redler, sandik] = await Promise.all([
    tumKayitlar<{
      participant_id: string;
      issued_at: string | null;
      responded_at: string | null;
      ai_score: number | null;
      spark_points: number | null;
      status: string;
    }>((bas, son) =>
      db
        .from("missions")
        .select("participant_id, issued_at, responded_at, ai_score, spark_points, status")
        .order("id")
        .range(bas, son)
    ),
    tumKayitlar<{ from_id: string; to_id: string }>((bas, son) =>
      db.from("kudos").select("from_id, to_id").eq("is_hidden", false).order("id").range(bas, son)
    ),
    tumKayitlar<{ participant_id: string }>((bas, son) =>
      db.from("redler").select("participant_id").order("id").range(bas, son)
    ),
    tumKayitlar<{ participant_id: string }>((bas, son) =>
      db.from("sandik_gecmisi").select("participant_id").order("id").range(bas, son)
    ),
  ]);

  const h: KategoriHesap = new Map(KATEGORILER.map((k) => [k.key, new Map<string, number>()]));
  const set = (key: string, pid: string, deger: number, yon: Yon) => {
    const m = h.get(key)!;
    const onceki = m.get(pid);
    if (onceki === undefined || (yon === "max" ? deger > onceki : deger < onceki)) m.set(pid, deger);
  };
  const artir = (key: string, pid: string, n = 1) => {
    const m = h.get(key)!;
    m.set(pid, (m.get(pid) ?? 0) + n);
  };

  const gunSet = new Map<string, Set<string>>(); // pid → distinct günler
  for (const g of (gorevler ?? []) as {
    participant_id: string;
    issued_at: string | null;
    responded_at: string | null;
    ai_score: number | null;
    spark_points: number | null;
    status: string;
  }[]) {
    const scored = g.status === "scored";
    if (g.responded_at) {
      const saat = istSaat(g.responded_at);
      set("gece_kusu", g.participant_id, saat, "max");
      set("erken_kalkan", g.participant_id, saat, "min");
      const gset = gunSet.get(g.participant_id) ?? new Set<string>();
      gset.add(istGun(g.responded_at));
      gunSet.set(g.participant_id, gset);
      if (g.issued_at) {
        const dk = (Date.parse(g.responded_at) - Date.parse(g.issued_at)) / 60_000;
        if (dk > 0 && dk < 100_000) set("hizli_teslim", g.participant_id, Math.round(dk), "min");
      }
    }
    if (scored) {
      artir("cok_gorev", g.participant_id, 1);
      if (g.ai_score != null) {
        set("yuksek_puan", g.participant_id, g.ai_score, "max");
        if (g.ai_score >= 10) artir("tam_puan", g.participant_id, 1);
      }
      if (g.spark_points) artir("cok_kivilcim", g.participant_id, g.spark_points);
    }
  }
  for (const [pid, gunler] of gunSet) set("istikrar", pid, gunler.size, "max");

  for (const k of (kudos ?? []) as { from_id: string; to_id: string }[]) {
    artir("comert_takdirci", k.from_id, 1);
    artir("takdir_alan", k.to_id, 1);
  }
  for (const r of (redler ?? []) as { participant_id: string }[]) artir("ret_cesuru", r.participant_id, 1);
  for (const s of (sandik ?? []) as { participant_id: string }[]) artir("cok_sandik", s.participant_id, 1);

  return h;
}

function lider(m: Map<string, number>, yon: Yon): { pid: string; deger: number } | null {
  let best: { pid: string; deger: number } | null = null;
  for (const [pid, deger] of m) {
    if (!best || (yon === "max" ? deger > best.deger : deger < best.deger)) best = { pid, deger };
  }
  return best;
}

// TARAMA — mevcut rekorları hesapla, tabloyla karşılaştır, kırılanı güncelle +
// herkese push. İlk doldurmada (önceki kayıt yok) SESSİZ set eder (spam yok).
// tik'ten (mod=kamp, bayrak açık) çağrılır. Kendi hatasını yutar.
export async function rekorTara(db: Db): Promise<{ kirilan: number }> {
  try {
    const [h, { data: mevcutlar }] = await Promise.all([
      hesapla(db),
      db.from("rekorlar").select("kategori, participant_id, deger"),
    ]);
    const mevcut = new Map((mevcutlar ?? []).map((r) => [r.kategori, r]));
    let kirilan = 0;
    for (const kat of KATEGORILER) {
      const l = lider(h.get(kat.key)!, kat.yon);
      if (!l) continue;
      const eski = mevcut.get(kat.key);
      const yeniRekorMu =
        !eski || (kat.yon === "max" ? l.deger > eski.deger : l.deger < eski.deger);
      if (!yeniRekorMu) continue;
      await db.from("rekorlar").upsert({
        kategori: kat.key,
        participant_id: l.pid,
        deger: l.deger,
        tarih: new Date().toISOString(),
      });
      // Yalnız MEVCUT bir rekor kırılınca duyur (ilk doldurma sessiz).
      if (eski) {
        kirilan++;
        await herkeseBildir(
          db,
          `🏆 ${kat.ad} rekoru kırıldı!`,
          `Yeni rekor: ${degerYazi(kat, l.deger)}. Sen de dene — belki sıradaki sensin.`,
          "/rekorlar"
        ).catch(() => {});
      }
    }
    return { kirilan };
  } catch {
    return { kirilan: 0 };
  }
}

export function degerYazi(kat: Kategori, deger: number): string {
  if (kat.key === "gece_kusu" || kat.key === "erken_kalkan") {
    return `${String(Math.floor(deger)).padStart(2, "0")}:00`;
  }
  return `${deger}${kat.birim === "/10" ? "/10" : kat.birim ? " " + kat.birim : ""}`;
}

// KAMP KÜRSÜSÜ — her kategorinin rekortmeni (isimle).
export type KursuSatiri = { kategori: Kategori; ad: string | null; deger: number | null };

export async function kampKursusu(db: Db): Promise<KursuSatiri[]> {
  const { data } = await db.from("rekorlar").select("kategori, participant_id, deger");
  const rekor = new Map((data ?? []).map((r) => [r.kategori, r]));
  const pidler = [...new Set((data ?? []).map((r) => r.participant_id).filter(Boolean))] as string[];
  const { data: kisiler } = pidler.length
    ? await db.from("participants").select("id, full_name").in("id", pidler)
    : { data: [] as { id: string; full_name: string }[] };
  const adMap = new Map((kisiler ?? []).map((k) => [k.id, k.full_name]));
  return KATEGORILER.map((kat) => {
    const r = rekor.get(kat.key);
    return {
      kategori: kat,
      ad: r?.participant_id ? adMap.get(r.participant_id) ?? null : null,
      deger: r ? r.deger : null,
    };
  });
}

// KİŞİSEL REKORLAR — kendi bestin + kamp rekoru + uzaklık + CANLI SIRALAMA.
// `sira`: bu kategoride kaçıncısın (1-bazlı; eşitlikte "benden kesin iyi olan
// sayısı + 1" → beraberlikte aynı sıra). `toplam`: kategoride değeri olan kişi
// sayısı (yarışın gerçek boyutu). Değerin yoksa sira=null.
export type KisiselSatir = {
  kategori: Kategori;
  benim: number | null;
  rekor: number | null;
  liderMi: boolean;
  uzaklik: string | null;
  sira: number | null;
  toplam: number;
};

export async function kisiselRekorlar(db: Db, pid: string): Promise<KisiselSatir[]> {
  const [h, { data: rekorlar }] = await Promise.all([
    hesapla(db),
    db.from("rekorlar").select("kategori, participant_id, deger"),
  ]);
  const rekor = new Map((rekorlar ?? []).map((r) => [r.kategori, r]));
  return KATEGORILER.map((kat) => {
    const m = h.get(kat.key)!;
    const benim = m.get(pid) ?? null;
    const r = rekor.get(kat.key);
    const rekorDeger = r ? r.deger : null;
    const liderMi = !!r && r.participant_id === pid;

    // Canlı sıra: benden KESİN daha iyi kaç kişi var? (yön max→büyük iyi, min→küçük iyi)
    const toplam = m.size;
    let sira: number | null = null;
    if (benim != null) {
      let dahaIyi = 0;
      for (const v of m.values()) {
        if (kat.yon === "max" ? v > benim : v < benim) dahaIyi++;
      }
      sira = dahaIyi + 1;
    }

    let uzaklik: string | null = null;
    if (benim != null && rekorDeger != null && !liderMi) {
      const fark = Math.abs(rekorDeger - benim);
      uzaklik = `${degerYazi(kat, Math.round(fark * 10) / 10)} uzağında`;
    }
    return { kategori: kat, benim, rekor: rekorDeger, liderMi, uzaklik, sira, toplam };
  });
}

// ============================================================================
// KÜRSÜ BRİFİ — "AYNA seni böyle seçti" sahne ödülleri (admin, İSİMLİ)
// ============================================================================
// Her kategorinin 1./2./3.'sü (isimle) + veriden türeyen kısa GEREKÇE. Sahnede
// Emre "AYNA seni şu veriyle seçti" der — uydurma yok, hep gerçek sayı. 2. ve 3.
// YEDEK: 1. kişi sahneye çıkmak istemezse Emre bir alttakini çağırır. Bu brif
// YALNIZ admindir; salona isim okunması Emre'nin kararıdır (önce kişiden onay).

const KURSU_GEREKCE: Record<string, (d: number) => string> = {
  hizli_teslim: (d) => `En hızlı teslim: ${d} dk — tereddütsüz aksiyon.`,
  gece_kusu: (d) => `Gece ${String(Math.floor(d)).padStart(2, "0")}:00'de sahadaydı — hiç durmadı.`,
  erken_kalkan: (d) => `Sabah ${String(Math.floor(d)).padStart(2, "0")}:00'de başladı — en erken.`,
  cok_gorev: (d) => `${d} görev tamamladı — kamptaki en üretken.`,
  yuksek_puan: (d) => `En yüksek tek puan: ${d}/10 — zirveye dokundu.`,
  tam_puan: (d) => `${d} kez 10/10 aldı — mükemmelliği tekrarladı.`,
  istikrar: (d) => `${d} farklı gün aktif — hiç ara vermedi.`,
  cok_kivilcim: (d) => `${d} kıvılcım topladı — enerjinin lideri.`,
  comert_takdirci: (d) => `${d} kez başkasını takdir etti — en cömert.`,
  takdir_alan: (d) => `${d} takdir aldı — en çok dokunan.`,
  ret_cesuru: (d) => `${d} kez "ret"i göze aldı — en cesur.`,
  cok_sandik: (d) => `${d} sandık açtı — en meraklı avcı.`,
};

export type BrifAday = { pid: string; ad: string; deger: number; sira: number; gerekce: string };
export type KursuBrifSatiri = { kategori: Kategori; adaylar: BrifAday[] };

export async function kursuBrifi(db: Db): Promise<KursuBrifSatiri[]> {
  const h = await hesapla(db);
  const pidSet = new Set<string>();
  for (const m of h.values()) for (const p of m.keys()) pidSet.add(p);
  const { data: kisiler } = pidSet.size
    ? await db.from("participants").select("id, full_name").in("id", [...pidSet])
    : { data: [] as { id: string; full_name: string }[] };
  const adMap = new Map((kisiler ?? []).map((k) => [k.id, k.full_name]));

  return KATEGORILER.map((kat) => {
    const m = h.get(kat.key)!;
    const sirali = [...m.entries()]
      .sort((a, b) => (kat.yon === "max" ? b[1] - a[1] : a[1] - b[1]))
      .slice(0, 3);
    const gerekceFn = KURSU_GEREKCE[kat.key] ?? ((d: number) => degerYazi(kat, d));
    const adaylar: BrifAday[] = sirali.map(([pid, deger], i) => ({
      pid,
      ad: adMap.get(pid) ?? "—",
      deger,
      sira: i + 1,
      gerekce: gerekceFn(deger),
    }));
    return { kategori: kat, adaylar };
  });
}

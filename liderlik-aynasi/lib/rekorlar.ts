import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { herkeseBildir } from "@/lib/push";

// ============================================================================
// G3 — REKORLAR: kişisel bestler + kamp kürsüsü (çok kategori)
// ============================================================================
// 12 kategori → herkes bir şeyde birinci olabilir. Rekorlar mevcut verilerden
// hesaplanır (rekorlar tablosu yalnız o anki rekortmeni saklar). Kırılınca
// herkese push. GUARDRAIL: sıfır suçlama — kimse "geride" diye anılmaz; yalnız
// rekortmen kutlanır ve "rekora uzaklığın" pozitif hedef olarak gösterilir.

export type Yon = "max" | "min";
export type Kategori = { key: string; ad: string; ikon: string; yon: Yon; birim: string };

export const KATEGORILER: Kategori[] = [
  { key: "hizli_teslim", ad: "En Hızlı Teslim", ikon: "⚡", yon: "min", birim: "dk" },
  { key: "gece_kusu", ad: "Gece Kuşu", ikon: "🦉", yon: "max", birim: ":00" },
  { key: "erken_kalkan", ad: "Erken Kalkan", ikon: "🌅", yon: "min", birim: ":00" },
  { key: "cok_gorev", ad: "Görev Canavarı", ikon: "🎯", yon: "max", birim: "görev" },
  { key: "yuksek_puan", ad: "Zirve Puanı", ikon: "💎", yon: "max", birim: "/10" },
  { key: "tam_puan", ad: "On Numara", ikon: "🔟", yon: "max", birim: "kez" },
  { key: "istikrar", ad: "İstikrar Ustası", ikon: "📅", yon: "max", birim: "gün" },
  { key: "cok_kivilcim", ad: "Kıvılcım Lideri", ikon: "✨", yon: "max", birim: "⚡" },
  { key: "comert_takdirci", ad: "En Cömert Takdirci", ikon: "💛", yon: "max", birim: "takdir" },
  { key: "takdir_alan", ad: "En Çok Takdir Alan", ikon: "🤍", yon: "max", birim: "takdir" },
  { key: "ret_cesuru", ad: "Ret Cesuru", ikon: "🔥", yon: "max", birim: "ret" },
  { key: "cok_sandik", ad: "Sandık Avcısı", ikon: "🎁", yon: "max", birim: "sandık" },
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
  const [{ data: gorevler }, { data: kudos }, { data: redler }, { data: sandik }] = await Promise.all([
    db.from("missions").select("participant_id, issued_at, responded_at, ai_score, spark_points, status"),
    db.from("kudos").select("from_id, to_id").eq("is_hidden", false),
    db.from("redler").select("participant_id"),
    db.from("sandik_gecmisi").select("participant_id"),
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

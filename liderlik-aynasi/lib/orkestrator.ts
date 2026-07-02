import "server-only";
import type { supabaseAdmin } from "@/lib/supabase/server";
import { yazAuditLog } from "@/lib/auditLog";
import { herkeseBildir } from "@/lib/push";
import { p72Gun1, p72Gun2, p72Gun3, odev10Gun, odev15Gun, agustosOdev, agustosGrupOdev } from "@/lib/kampSonrasi";
import { kampArkadasiAta, kampArkadasiHatirlat } from "@/lib/kampArkadasi";

type Db = ReturnType<typeof supabaseAdmin>;

// FAZ 9 — OTOMATİK KAMP ORKESTRATÖRÜ (çekirdek motor).
// /api/tik her atışta çağırır. Zamanı gelmiş 'bekliyor' senaryo satırlarını
// İDEMPOTENT işler: satırı önce 'atesledi'ye "sahiplenir" (yarış guard'ı), sonra
// eylemi uygular, audit_log'a yazar. Kamp başlamadan (baslangicIso yokken) hiçbir
// şey ateşlenmez. Tüm göreli zamanlar ayna_baslangic'tan hesaplanır.

export type SenaryoSatiri = {
  id: string;
  olay_kodu: string;
  tetik_tipi: string;
  gun: number | null;
  saat: number | null;
  baz_olay: string | null;
  sonra_dk: number | null;
  eylem_tipi: string;
  eylem_hedef: string;
  eylem_baslik: string | null;
  eylem_deger: string | null;
  durum: string;
  atesleme_zamani: string | null;
  sira: number;
};

/** Bir kamp_gorelli satırın ateşlenme zamanını hesaplar (ms epoch). */
function kampGorelliZaman(baslangic: Date, gun: number, saat: number): number {
  // Gün 1 = başlangıç günü. İstanbul'da saat:00'a denk gelmesi için başlangıç
  // gününün yerel gün başını al, (gun-1) gün + saat saat ekle. Basitlik için
  // baslangic UTC'sine göre hesaplıyoruz; kamp saatleri ±birkaç dk tolere edilir.
  return baslangic.getTime() + (gun - 1) * 86_400_000 + saat * 3_600_000;
}

/** Adlandırılmış fonksiyon eylemleri kaydı. Bilinmeyen ad → atlanır (loglanır).
 * Senaryo satırı eylem_tipi='fonksiyon' + eylem_hedef=bu anahtar. */
const FONKSIYONLAR: Record<string, (db: Db) => Promise<void>> = {
  // FAZ 2.2 — 72 saat protokolü
  p72_gun1: p72Gun1,
  p72_gun2: p72Gun2,
  p72_gun3: p72Gun3,
  // FAZ 2.4 — ödev paketleri
  odev_10gun: odev10Gun,
  odev_15gun: odev15Gun,
  agustos_odev: agustosOdev,
  // FAZ 3.1 — kamp arkadaşı hattı
  kamp_arkadasi_ata: kampArkadasiAta,
  kamp_arkadasi_hatirlat: kampArkadasiHatirlat,
  // FAZ 4.3 — Ağustos grup ödevi (her takıma isimli grup-birlikte ödevi)
  agustos_grup_odev: agustosGrupOdev,
};

/** Tek bir senaryo satırının eylemini uygular (settings/push/fonksiyon).
 * Hem otomatik akış hem admin "şimdi ateşle" bunu kullanır. */
export async function satirEylemiUygula(
  db: Db,
  s: Pick<SenaryoSatiri, "eylem_tipi" | "eylem_hedef" | "eylem_baslik" | "eylem_deger">
): Promise<void> {
  if (s.eylem_tipi === "ayar_ac" || s.eylem_tipi === "ayar_kapat") {
    // eylem_deger verilmişse onu yaz (ör. sistem_modu='yolculuk'); yoksa
    // ayar_ac → 'true', ayar_kapat → 'false' varsayılanı.
    const deger = s.eylem_deger ?? (s.eylem_tipi === "ayar_ac" ? "true" : "false");
    await db.from("settings").upsert({ key: s.eylem_hedef, value: deger });
  } else if (s.eylem_tipi === "push") {
    await herkeseBildir(db, s.eylem_baslik ?? "AYNA", s.eylem_deger ?? "", "/");
  } else if (s.eylem_tipi === "fonksiyon") {
    const fn = FONKSIYONLAR[s.eylem_hedef];
    if (fn) await fn(db);
  }
}

export type OrkestratorSonuc = { atesLenen: number; olaylar: string[] };

export async function orkestratoduIsle(
  db: Db,
  simdi: Date,
  baslangicIso: string | null | undefined
): Promise<OrkestratorSonuc> {
  const sonuc: OrkestratorSonuc = { atesLenen: 0, olaylar: [] };
  // Kamp başlamadıysa orkestratör sessiz — hiçbir satır ateşlenmez.
  if (!baslangicIso) return sonuc;
  const baslangic = new Date(baslangicIso);

  // [9.4] Kumanda kontrolleri: DURDUR anahtarı + tüm bekleyenleri öteleyen
  // genel kaydırma (dk). Admin /admin/senaryo'dan yönetir.
  const { data: kontrolAyar } = await db
    .from("settings")
    .select("key, value")
    .in("key", ["orkestrator_durduruldu", "senaryo_kaydirma_dk"]);
  const kontrol = new Map((kontrolAyar ?? []).map((a) => [a.key, a.value]));
  if (kontrol.get("orkestrator_durduruldu") === "true") return sonuc;
  const kaydirmaMs = (Number(kontrol.get("senaryo_kaydirma_dk")) || 0) * 60_000;

  const { data: satirlar } = await db
    .from("kamp_senaryosu")
    .select(
      "id, olay_kodu, tetik_tipi, gun, saat, baz_olay, sonra_dk, eylem_tipi, eylem_hedef, eylem_baslik, eylem_deger, durum, atesleme_zamani, sira"
    )
    .eq("durum", "bekliyor")
    .order("sira", { ascending: true });
  if (!satirlar || satirlar.length === 0) return sonuc;

  // olay_gorelli tetikler için: ateşlenmiş olayların ateşleme zamanları.
  const { data: atesLenenler } = await db
    .from("kamp_senaryosu")
    .select("olay_kodu, atesleme_zamani")
    .eq("durum", "atesledi");
  const atesZaman = new Map(
    (atesLenenler ?? [])
      .filter((r) => r.atesleme_zamani)
      .map((r) => [r.olay_kodu, new Date(r.atesleme_zamani as string).getTime()])
  );

  const simdiMs = simdi.getTime();

  for (const s of satirlar as SenaryoSatiri[]) {
    // Zamanı geldi mi?
    let hedefMs: number | null = null;
    if (s.tetik_tipi === "kamp_gorelli" && s.gun != null && s.saat != null) {
      hedefMs = kampGorelliZaman(baslangic, s.gun, s.saat);
    } else if (s.tetik_tipi === "olay_gorelli" && s.baz_olay && s.sonra_dk != null) {
      const bazMs = atesZaman.get(s.baz_olay);
      if (bazMs != null) hedefMs = bazMs + s.sonra_dk * 60_000;
    }
    if (hedefMs == null) continue;
    if (simdiMs < hedefMs + kaydirmaMs) continue; // [9.4] genel öteleme

    // SAHİPLEN (idempotent yarış guard'ı): yalnız hâlâ 'bekliyor' ise al.
    const { data: sahiplenilen } = await db
      .from("kamp_senaryosu")
      .update({ durum: "atesledi", atesleme_zamani: simdi.toISOString() })
      .eq("id", s.id)
      .eq("durum", "bekliyor")
      .select("id")
      .maybeSingle();
    if (!sahiplenilen) continue; // başka bir tik/instance sahiplendi

    // EYLEMİ UYGULA
    try {
      await satirEylemiUygula(db, s);
      await yazAuditLog(db, null, "orkestrator_atesle", {
        olay_kodu: s.olay_kodu,
        eylem_tipi: s.eylem_tipi,
        eylem_hedef: s.eylem_hedef,
      });
      sonuc.atesLenen++;
      sonuc.olaylar.push(s.olay_kodu);
      atesZaman.set(s.olay_kodu, simdiMs); // aynı tikte olay_gorelli zincirleri
    } catch {
      // Eylem düşse bile satır 'atesledi' kaldı (tekrar denemez). Audit'e hata yaz.
      await yazAuditLog(db, null, "orkestrator_hata", { olay_kodu: s.olay_kodu });
    }
  }

  return sonuc;
}

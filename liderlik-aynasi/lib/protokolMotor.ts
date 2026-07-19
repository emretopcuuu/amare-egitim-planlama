import "server-only";
import type { supabaseAdmin } from "@/lib/supabase/server";
import { pusulaCekirdek } from "@/lib/pusula";
import {
  PRATIKLER,
  CEKIRDEK_PRATIKLER,
  ENGEL_PRATIK,
  type PratikKodu,
  type Pratik,
} from "@/lib/protokol";

type Db = ReturnType<typeof supabaseAdmin>;

// 90 GÜN PROTOKOLÜ — sunucu motoru. Kişiselleştirme: herkese çekirdek (P1,P6,P10
// + aile ise P9) + iç engeline göre 2-3 kişisel pratik. Aşırı yük = terk; kişisel
// pratik 3'le sınırlı, günlük seçim tek pratik verir → toplam ≤20 dk korunur.

const KISISEL_TAVAN = 3;

/** Kişinin protokolünü İLK KEZ kurar (idempotent — zaten kuruluysa dokunmaz).
 * Kişiselleştirme pusula (iç engel + çekirdek neden) + kudos (takdir yazmış mı) +
 * gece deseninden hesaplanır. */
export async function protokolKur(db: Db, pid: string): Promise<number> {
  const { count: mevcut } = await db
    .from("protokol_pratik")
    .select("id", { count: "exact", head: true })
    .eq("participant_id", pid);
  if ((mevcut ?? 0) > 0) return 0; // zaten kurulmuş

  const pusula = await pusulaCekirdek(db, pid).catch(() => null);

  // Çekirdek (herkes): P1, P6, P10 (+ çekirdek nedeni aile ise P9).
  const cekirdek = new Set<PratikKodu>(CEKIRDEK_PRATIKLER);
  const nedenMetni = (pusula?.cekirdek_neden ?? []).join(" ").toLowerCase();
  if (/aile|çocuk|cocuk|eşim|esim|anne|baba|evlat/.test(nedenMetni)) cekirdek.add("P9");

  // Kişisel: iç engel kategorisine göre.
  const kisisel: PratikKodu[] = [...(ENGEL_PRATIK[pusula?.ic_engel_kat ?? ""] ?? [])];

  // P5 (Önce Sen Gör): hiç takdir YAZMAMIŞSA.
  const { count: yazdigiTakdir } = await db
    .from("kudos")
    .select("id", { count: "exact", head: true })
    .eq("from_id", pid);
  if ((yazdigiTakdir ?? 0) === 0) kisisel.push("P5");

  // P8 (Kapanış Nefesi): gece-yoğun (00-06 arası teslim ≥3).
  const { data: teslimler } = await db
    .from("missions")
    .select("responded_at")
    .eq("participant_id", pid)
    .not("responded_at", "is", null);
  const geceSayisi = (teslimler ?? []).filter((m) => {
    const s = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Istanbul",
      hour: "2-digit",
      hour12: false,
    }).format(new Date(m.responded_at as string));
    const saat = Number(s);
    return saat >= 0 && saat < 6;
  }).length;
  if (geceSayisi >= 3) kisisel.push("P8");

  // Dedup: çekirdekte olanı kişiselden çıkar, tavanı uygula.
  const kisiselTemiz = [...new Set(kisisel)].filter((k) => !cekirdek.has(k)).slice(0, KISISEL_TAVAN);

  const satirlar = [
    ...[...cekirdek].map((kod) => ({ participant_id: pid, pratik_kodu: kod, cekirdek: true })),
    ...kisiselTemiz.map((kod) => ({ participant_id: pid, pratik_kodu: kod, cekirdek: false })),
  ];
  const { error } = await db.from("protokol_pratik").insert(satirlar);
  return error ? 0 : satirlar.length;
}

export type AktifPratik = { kod: PratikKodu; cekirdek: boolean };

/** Kişinin AÇIK (kapatılmamış) pratikleri. */
export async function aktifPratikler(db: Db, pid: string): Promise<AktifPratik[]> {
  const { data } = await db
    .from("protokol_pratik")
    .select("pratik_kodu, cekirdek")
    .eq("participant_id", pid)
    .eq("kapatildi", false);
  return (data ?? [])
    .filter((r) => PRATIKLER[r.pratik_kodu as PratikKodu])
    .map((r) => ({ kod: r.pratik_kodu as PratikKodu, cekirdek: r.cekirdek }));
}

/** Günün GÜNLÜK pratiği (haftalık P7/P10 hariç) — gün sayısına göre döner.
 * Yolculuk günde tek görev ürettiği için tek pratik seçilir. */
export async function gununPratigi(
  db: Db,
  pid: string,
  gun: number
): Promise<Pratik | null> {
  const aktif = await aktifPratikler(db, pid);
  const gunluk = aktif
    .map((a) => PRATIKLER[a.kod])
    .filter((p) => p.blok !== "haftalik")
    .sort((a, b) => a.kod.localeCompare(b.kod));
  if (gunluk.length === 0) return null;
  return gunluk[((gun % gunluk.length) + gunluk.length) % gunluk.length];
}

/** Bir pratik bugün tamamlandı olarak işaretlenir (idempotent). */
export async function pratikTamamla(
  db: Db,
  pid: string,
  kod: PratikKodu,
  tarih: string
): Promise<void> {
  await db
    .from("protokol_tamamlama")
    .upsert(
      { participant_id: pid, pratik_kodu: kod, tarih },
      { onConflict: "participant_id,pratik_kodu,tarih" }
    );
}

/** "Bana göre değil" — pratiği kapatır; bir daha görev üretmez. */
export async function pratikKapat(db: Db, pid: string, kod: PratikKodu): Promise<void> {
  await db
    .from("protokol_pratik")
    .update({ kapatildi: true })
    .eq("participant_id", pid)
    .eq("pratik_kodu", kod);
}

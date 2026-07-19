import "server-only";
import type { supabaseAdmin } from "@/lib/supabase/server";
import { pusulaCekirdek } from "@/lib/pusula";
import { tumKayitlar } from "@/lib/tumKayitlar";
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
  let aktif = await aktifPratikler(db, pid);
  // Tembel kurulum: protokolü olmayan kişi ilk yolculuk görevinde kurulur
  // (kendini iyileştirir; ayrı senaryo satırına gerek kalmaz).
  if (aktif.length === 0) {
    const { count } = await db
      .from("protokol_pratik")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", pid);
    if ((count ?? 0) === 0) {
      await protokolKur(db, pid).catch(() => {});
      aktif = await aktifPratikler(db, pid);
    }
  }
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

export type ProtokolKart = {
  pratik: Pratik;
  cekirdek: boolean;
  bugunYapildi: boolean;
  toplam: number; // bu pratiği kaç gün yaptı
};

/** /protokol sayfası için: kişinin açık pratikleri + bugün yapıldı mı + toplam. */
export async function protokolKartlari(
  db: Db,
  pid: string,
  bugun: string
): Promise<ProtokolKart[]> {
  const aktif = await aktifPratikler(db, pid);
  if (aktif.length === 0) return [];
  const { data: tamamlar } = await db
    .from("protokol_tamamlama")
    .select("pratik_kodu, tarih")
    .eq("participant_id", pid);
  const bugunSet = new Set<string>();
  const toplam = new Map<string, number>();
  for (const t of tamamlar ?? []) {
    toplam.set(t.pratik_kodu, (toplam.get(t.pratik_kodu) ?? 0) + 1);
    if (t.tarih === bugun) bugunSet.add(t.pratik_kodu);
  }
  return aktif
    .map((a) => ({
      pratik: PRATIKLER[a.kod],
      cekirdek: a.cekirdek,
      bugunYapildi: bugunSet.has(a.kod),
      toplam: toplam.get(a.kod) ?? 0,
    }))
    .sort((x, y) => (x.cekirdek === y.cekirdek ? 0 : x.cekirdek ? -1 : 1));
}

// ---- ADMIN ÖZET ----
export type PratikOzet = { kod: PratikKodu; ad: string; aktif: number; kapatildi: number; tamamlama: number };
export type ProtokolAdminOzet = {
  kuranKisi: number;
  pratikler: PratikOzet[];
  enCokKapatilan: { ad: string; adet: number } | null;
  buHaftaKarne: { kisi: number; davet: number; gorusme: number; takip: number };
};

/** Admin protokol paneli: pratik başına aktif/kapatıldı/tamamlama + en çok
 * kapatılan (ürün sinyali) + bu haftanın karne toplamı. */
export async function protokolAdminOzet(db: Db, buHafta: string): Promise<ProtokolAdminOzet> {
  const [pratikRows, tamamRows, karneRows] = await Promise.all([
    tumKayitlar<{ pratik_kodu: string; kapatildi: boolean; participant_id: string }>((b, s) =>
      db.from("protokol_pratik").select("pratik_kodu, kapatildi, participant_id").order("id").range(b, s)
    ),
    tumKayitlar<{ pratik_kodu: string }>((b, s) =>
      db.from("protokol_tamamlama").select("pratik_kodu").order("id").range(b, s)
    ),
    db.from("pazar_karnesi").select("davet, gorusme, takip").eq("hafta", buHafta),
  ]);

  const aktif = new Map<string, number>();
  const kapali = new Map<string, number>();
  const kuranSet = new Set<string>();
  for (const r of pratikRows) {
    kuranSet.add(r.participant_id);
    if (r.kapatildi) kapali.set(r.pratik_kodu, (kapali.get(r.pratik_kodu) ?? 0) + 1);
    else aktif.set(r.pratik_kodu, (aktif.get(r.pratik_kodu) ?? 0) + 1);
  }
  const tamamlama = new Map<string, number>();
  for (const r of tamamRows) tamamlama.set(r.pratik_kodu, (tamamlama.get(r.pratik_kodu) ?? 0) + 1);

  const pratikler: PratikOzet[] = (Object.keys(PRATIKLER) as PratikKodu[]).map((kod) => ({
    kod,
    ad: PRATIKLER[kod].ad,
    aktif: aktif.get(kod) ?? 0,
    kapatildi: kapali.get(kod) ?? 0,
    tamamlama: tamamlama.get(kod) ?? 0,
  }));
  const enCok = [...kapali.entries()].sort((a, b) => b[1] - a[1])[0];

  const karne = (karneRows.data ?? []) as { davet: number; gorusme: number; takip: number }[];
  return {
    kuranKisi: kuranSet.size,
    pratikler,
    enCokKapatilan: enCok ? { ad: PRATIKLER[enCok[0] as PratikKodu]?.ad ?? enCok[0], adet: enCok[1] } : null,
    buHaftaKarne: {
      kisi: karne.length,
      davet: karne.reduce((t, k) => t + (k.davet ?? 0), 0),
      gorusme: karne.reduce((t, k) => t + (k.gorusme ?? 0), 0),
      takip: karne.reduce((t, k) => t + (k.takip ?? 0), 0),
    },
  };
}

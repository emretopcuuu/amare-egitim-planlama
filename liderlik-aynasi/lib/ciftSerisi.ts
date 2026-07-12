import "server-only";
import type { Db } from "@/lib/degerlendirme";
import { katilimciyaBildir } from "@/lib/push";

// ============================================================================
// G4 — ÇİFT SERİSİ (snapstreak)
// ============================================================================
// Kamp arkadaşı grubundaki HERKES aynı gün ≥1 anlamlı eylem yaparsa ortak alev
// +1. Anlamlı eylem = görev teslimi (responded) VEYA günlük check-in (soz_takip).
// Bozulunca alev söner ama KÜL kalır (sayı silinmez); 3 gün üst üste ikisi de
// beslerse yeniden doğar, eski sayının YARISINDAN. Tam sıfırlama YOK.

const REVIVE_GUN = 3;

export async function ciftSerisiAcikMi(db: Db): Promise<boolean> {
  const { data } = await db.from("settings").select("value").eq("key", "cift_serisi_acik").maybeSingle();
  return data?.value === "true";
}

function istBugun(simdi = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(simdi);
}
function gunEkle(tarih: string, n: number): string {
  const [y, m, d] = tarih.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n, 12)).toISOString().slice(0, 10);
}

// Bugün en az bir anlamlı eylem yapan katılımcı id'leri.
async function aktifBugun(db: Db, bugun: string): Promise<Set<string>> {
  const gunBasi = new Date(`${bugun}T00:00:00+03:00`).toISOString();
  const [{ data: gorevler }, { data: checkinler }] = await Promise.all([
    db.from("missions").select("participant_id").gte("responded_at", gunBasi).not("responded_at", "is", null),
    db.from("soz_takip").select("participant_id").eq("gun", bugun),
  ]);
  const s = new Set<string>();
  for (const g of gorevler ?? []) s.add(g.participant_id);
  for (const c of checkinler ?? []) s.add(c.participant_id);
  return s;
}

type Grup = { id: string; uyeler: string[] };
type SeriRow = { id: string; arkadasi_id: string; gun_sayisi: number; son_besleme: string | null; kul: boolean; kul_gun_sayac: number };

// Ana değerlendirme — tik'ten (mod=kamp, bayrak açık) çağrılır. Besleme + kül +
// yeniden doğuş; 20:00 penceresinde eksik besleyene nazik hatırlatma.
export async function ciftSerisiDegerlendir(
  db: Db,
  simdi: Date,
  saat: number,
  dakika: number
): Promise<{ beslenen: number }> {
  try {
    const bugun = istBugun(simdi);
    const dun = gunEkle(bugun, -1);
    const [{ data: gruplar }, { data: seriler }, aktif] = await Promise.all([
      db.from("kamp_arkadasi").select("id, uyeler"),
      db.from("cift_serisi").select("id, arkadasi_id, gun_sayisi, son_besleme, kul, kul_gun_sayac"),
      aktifBugun(db, bugun),
    ]);
    const seriMap = new Map((seriler ?? []).map((s) => [s.arkadasi_id, s as SeriRow]));
    let beslenen = 0;

    for (const g of (gruplar ?? []) as Grup[]) {
      const uyeler = (g.uyeler as string[]) ?? [];
      if (uyeler.length < 2) continue;
      const s: SeriRow = seriMap.get(g.id) ?? {
        id: "",
        arkadasi_id: g.id,
        gun_sayisi: 0,
        son_besleme: null,
        kul: false,
        kul_gun_sayac: 0,
      };
      if (s.son_besleme === bugun) continue; // bugün zaten beslendi
      const herkesActi = uyeler.every((u) => aktif.has(u));

      if (herkesActi) {
        let { gun_sayisi, kul, kul_gun_sayac } = s;
        if (kul) {
          kul_gun_sayac += 1;
          if (kul_gun_sayac >= REVIVE_GUN) {
            kul = false;
            gun_sayisi = Math.max(1, Math.floor(gun_sayisi / 2));
            kul_gun_sayac = 0;
          }
        } else {
          gun_sayisi += 1;
        }
        await db.from("cift_serisi").upsert(
          { arkadasi_id: g.id, gun_sayisi, son_besleme: bugun, kul, kul_gun_sayac, updated_at: new Date().toISOString() },
          { onConflict: "arkadasi_id" }
        );
        beslenen++;
      } else if (s.son_besleme && s.son_besleme < dun) {
        // Bir tam gün kaçtı → alev söner (KÜL), sayı korunur. Kül'deyse
        // yeniden-doğuş ilerlemesi sıfırlanır (3 gün ÜST ÜSTE şart).
        if (!s.kul) {
          await db.from("cift_serisi").upsert(
            { arkadasi_id: g.id, gun_sayisi: s.gun_sayisi, son_besleme: s.son_besleme, kul: true, kul_gun_sayac: 0, updated_at: new Date().toISOString() },
            { onConflict: "arkadasi_id" }
          );
        } else if (s.kul_gun_sayac !== 0) {
          await db.from("cift_serisi").update({ kul_gun_sayac: 0 }).eq("arkadasi_id", g.id);
        }
      }
    }

    // 20:00 — biri besledi öbürü beslemediyse eksik olana NAZİK hatırlatma
    // (günde bir kez, settings kilidi). Suçlama değil davet.
    if (saat === 20 && dakika < 10) {
      const { error: kilit } = await db.from("settings").insert({ key: `cift_nudge_${bugun}`, value: "1" });
      if (!kilit) await besleHatirlat(db, (gruplar ?? []) as Grup[], seriMap, aktif, bugun);
    }
    return { beslenen };
  } catch {
    return { beslenen: 0 };
  }
}

async function besleHatirlat(db: Db, gruplar: Grup[], seriMap: Map<string, SeriRow>, aktif: Set<string>, bugun: string): Promise<void> {
  const { data: kisiler } = await db.from("participants").select("id, full_name");
  const ad = new Map((kisiler ?? []).map((k) => [k.id, k.full_name.split(" ")[0]]));
  for (const g of gruplar) {
    const uyeler = (g.uyeler as string[]) ?? [];
    if (uyeler.length < 2) continue;
    const s = seriMap.get(g.id);
    if (s?.son_besleme === bugun) continue; // zaten tamam
    const yapanlar = uyeler.filter((u) => aktif.has(u));
    const eksikler = uyeler.filter((u) => !aktif.has(u));
    if (yapanlar.length === 0 || eksikler.length === 0) continue; // ya kimse ya herkes
    const besleyen = ad.get(yapanlar[0]) ?? "Arkadaşın";
    for (const u of eksikler) {
      await katilimciyaBildir(
        db,
        u,
        "🔥 Alevi söndürme",
        `${besleyen} bugün alevi besledi. Tek bir adım yeter — seriniz sürsün.`,
        "/"
      ).catch(() => {});
    }
  }
}

// Kişinin grup alevi — ana sayfada gösterilir.
export type CiftDurum = {
  gunSayisi: number;
  kul: boolean;
  bugunTam: boolean; // bugün herkes besledi
  partnerAdlari: string[];
  benBesledim: boolean;
  eksikVar: boolean; // biri besledi biri beslemedi
};

export async function ciftSeriDurum(db: Db, pid: string): Promise<CiftDurum | null> {
  const bugun = istBugun();
  const { data: gruplar } = await db.from("kamp_arkadasi").select("id, uyeler");
  const grup = ((gruplar ?? []) as Grup[]).find((g) => ((g.uyeler as string[]) ?? []).includes(pid));
  if (!grup) return null;
  const uyeler = (grup.uyeler as string[]) ?? [];
  const [{ data: seri }, aktif, { data: kisiler }] = await Promise.all([
    db.from("cift_serisi").select("gun_sayisi, son_besleme, kul").eq("arkadasi_id", grup.id).maybeSingle(),
    aktifBugun(db, bugun),
    db.from("participants").select("id, full_name"),
  ]);
  const ad = new Map((kisiler ?? []).map((k) => [k.id, k.full_name.split(" ")[0]]));
  const digerler = uyeler.filter((u) => u !== pid);
  const yapan = uyeler.filter((u) => aktif.has(u));
  return {
    gunSayisi: seri?.gun_sayisi ?? 0,
    kul: seri?.kul ?? false,
    bugunTam: seri?.son_besleme === bugun,
    partnerAdlari: digerler.map((u) => ad.get(u) ?? "arkadaşın"),
    benBesledim: aktif.has(pid),
    eksikVar: yapan.length > 0 && yapan.length < uyeler.length,
  };
}

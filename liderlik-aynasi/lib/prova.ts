import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { KAMP_GUNLERI } from "@/lib/kampProgrami";

type Db = ReturnType<typeof supabaseAdmin>;

// PROVA KAMPI — gerçek kayıtlı kişilerle 3 günlük kampı hızlandırılmış yaşatır.
// Sanal saat kamp tarihine (17-19 Temmuz) demirlenir; AYNA motoru (lib/tik.ts)
// `simdi` parametresini sanal saatle alır ve o güne göre BİREBİR görev/ses/senkron
// üretir — gerçek kişilerin telefonuna düşer. Gün içi sanal saat OLCEK kadar hızlı
// akar, gün sınırında durur (clamp). Sonraki güne admin onayıyla geçilir, böylece
// her "gün" elastik (25-45 dk). Tekrar tekrar başlatılabilir; her başlangıç temiz.

// Zamana bağlı pencere kilitleri — silinince sanal güne göre yeniden tetiklenir.
const KILIT_DESENLERI =
  "key.like.senkron_%,key.like.fisilti_%,key.like.gece_%,key.like.momentum_%,key.like.kayma_%,key.like.sabah_soz_%,key.like.mentorluk_%,key.eq.sahne_anons";

const OLCEK = 36; // 1 gerçek dk ≈ 36 sanal dk → bir kamp günü ≈ 30 dk gerçek
const GUN_BAS = 6; // sanal gün 06:00'da başlar
const GUN_SON_MS = 24 * 3_600_000; // ...24:00'da biter (gün başından itibaren)

export type ProvaDurum = {
  aktif: boolean;
  gun: number; // 1-3
  gunBaslangic: string | null; // bu sanal günün gerçek başladığı an (ISO)
  // GÜVENLİK KİLİDİ: prova artık yalnız TEK bir katılımcıyla koşar. Tik'in
  // katılımcı sorgusu bu id'ye sabitlenir — gerçek onboarding'deki herkese
  // görev/bildirim gitmesin diye (bkz. lib/tik.ts provaModu dalı).
  katilimciId: string | null;
};

export async function provaDurum(db: Db): Promise<ProvaDurum> {
  const { data } = await db
    .from("settings")
    .select("key, value")
    .in("key", ["prova_aktif", "prova_gun", "prova_gun_baslangic", "prova_katilimci_id"]);
  const m = new Map((data ?? []).map((r) => [r.key, r.value]));
  return {
    aktif: m.get("prova_aktif") === "true",
    gun: Math.min(3, Math.max(1, Number(m.get("prova_gun") ?? "1") || 1)),
    gunBaslangic: m.get("prova_gun_baslangic") ?? null,
    katilimciId: m.get("prova_katilimci_id") ?? null,
  };
}

/** Prova durumuna göre o anki SANAL kamp saati (gün sınırında durur). */
export function provaSanalSaat(durum: ProvaDurum, simdi: Date): Date | null {
  if (!durum.aktif || !durum.gunBaslangic) return null;
  const tarih = KAMP_GUNLERI[durum.gun - 1];
  const gunSifir = new Date(`${tarih}T00:00:00+03:00`).getTime();
  const gunBasiMs = gunSifir + GUN_BAS * 3_600_000;
  const gecen = Math.max(0, simdi.getTime() - new Date(durum.gunBaslangic).getTime());
  const sanal = gunBasiMs + gecen * OLCEK;
  const sonMs = gunSifir + GUN_SON_MS - 60_000;
  return new Date(Math.min(sanal, sonMs));
}

async function ayar(db: Db, key: string, value: string) {
  await db
    .from("settings")
    .upsert({ key, value, updated_at: new Date().toISOString() });
}

async function kilitleriTemizle(db: Db) {
  await db.from("settings").delete().or(KILIT_DESENLERI);
}

/** Provayı başlat: Gün 1, sanal saat şimdiden akmaya başlar, motor uyanır, kilitler temiz.
 * katilimciId ZORUNLU — prova artık yalnız bu tek kişiyle koşar (gerçek
 * onboarding'deki diğer herkes tik'in katılımcı sorgusunda elenir). */
export async function provaBaslat(db: Db, simdi: Date, katilimciId: string) {
  await kilitleriTemizle(db);
  await ayar(db, "prova_aktif", "true");
  await ayar(db, "prova_gun", "1");
  await ayar(db, "prova_gun_baslangic", simdi.toISOString());
  await ayar(db, "prova_katilimci_id", katilimciId);
  await ayar(db, "ayna_aktif", "true");
  await ayar(db, "sistem_modu", "kamp");
}

/** Sonraki güne geç (admin onayı). Son gündeyse aynı günde kalır. */
export async function provaGunGec(db: Db, simdi: Date): Promise<number> {
  const d = await provaDurum(db);
  const yeni = Math.min(3, d.gun + 1);
  await kilitleriTemizle(db);
  await ayar(db, "prova_gun", String(yeni));
  await ayar(db, "prova_gun_baslangic", simdi.toISOString());
  return yeni;
}

/** Provayı bitir (motor durmaz; sadece sanal saat devre dışı → gerçek zamana döner). */
export async function provaBitir(db: Db) {
  await ayar(db, "prova_aktif", "false");
  await db.from("settings").delete().eq("key", "prova_katilimci_id");
}

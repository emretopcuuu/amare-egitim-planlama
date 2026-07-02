import "server-only";
import type { supabaseAdmin } from "@/lib/supabase/server";
import { katilimciyaBildir } from "@/lib/push";
import { karsilasmaBul } from "@/lib/karsilasma";

type Db = ReturnType<typeof supabaseAdmin>;

// [3.1] KAMP ARKADAŞI HATTI — kalıcı ikili/üçlü atama + haftalık çift taraflı
// hatırlatma + check-in. Orkestratör fonksiyonlarından çağrılır.

// ATAMA: bir kez çalışır (mevcut kayıt varsa atlar). Önce "gerçek miydi?" puanı
// en yüksek çiftleri eşler; kalanları karsilasma.ts persona eşleşmesiyle bağlar;
// tek kalan olursa son ikiliye katıp üçlü yapar (kimse dışarıda kalmaz).
export async function kampArkadasiAta(db: Db): Promise<void> {
  const { count } = await db
    .from("kamp_arkadasi")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) return; // zaten atanmış

  const { data: kisiler } = await db
    .from("participants").select("id").eq("role", "participant");
  const hepsi = (kisiler ?? []).map((k) => k.id);
  if (hepsi.length < 2) return;

  const eslenmemis = new Set(hepsi);
  const gruplar: string[][] = [];

  // 1) "gerçek miydi?" ≥4 olan çiftler — en güçlü kamp bağları önce.
  const { data: eslesmeler } = await db
    .from("gorev_eslesme")
    .select("kaynak_id, hedef_id, gercek_miydi")
    .gte("gercek_miydi", 4)
    .order("gercek_miydi", { ascending: false });
  for (const e of eslesmeler ?? []) {
    if (eslenmemis.has(e.kaynak_id) && eslenmemis.has(e.hedef_id)) {
      gruplar.push([e.kaynak_id, e.hedef_id]);
      eslenmemis.delete(e.kaynak_id);
      eslenmemis.delete(e.hedef_id);
    }
  }

  // 2) Kalanları persona-tamamlayıcı eşleşmeyle bağla (karsilasma.ts).
  for (const pid of [...eslenmemis]) {
    if (!eslenmemis.has(pid)) continue;
    eslenmemis.delete(pid);
    const k = await karsilasmaBul(db, pid);
    const partner = k?.partnerId && eslenmemis.has(k.partnerId) ? k.partnerId : null;
    if (partner) {
      eslenmemis.delete(partner);
      gruplar.push([pid, partner]);
    } else {
      // Partner bulunamadı: sıradaki eşsizle bağla ya da beklet.
      const diger = [...eslenmemis][0];
      if (diger) {
        eslenmemis.delete(diger);
        gruplar.push([pid, diger]);
      } else {
        // Tek kaldı → son ikiliye kat (üçlü).
        if (gruplar.length > 0) gruplar[gruplar.length - 1].push(pid);
        else gruplar.push([pid]); // tek kişi (havuz 1) — teorik
      }
    }
  }

  const satirlar = gruplar.filter((g) => g.length >= 2).map((uyeler) => ({ uyeler }));
  if (satirlar.length > 0) await db.from("kamp_arkadasi").insert(satirlar);
}

// HAFTALIK HATIRLATMA: her gruptaki herkese AYNI ANDA "10 dk arayın" push'u.
export async function kampArkadasiHatirlat(db: Db): Promise<void> {
  const { data: gruplar } = await db.from("kamp_arkadasi").select("id, uyeler");
  const { data: kisiler } = await db.from("participants").select("id, full_name");
  const adHarita = new Map((kisiler ?? []).map((k) => [k.id, k.full_name.split(" ")[0]]));
  for (const g of gruplar ?? []) {
    const uyeler = (g.uyeler as string[]) ?? [];
    for (const uye of uyeler) {
      const digerleri = uyeler.filter((u) => u !== uye).map((u) => adHarita.get(u) ?? "arkadaşın");
      await katilimciyaBildir(
        db,
        uye,
        "🤝 Kamp arkadaşın",
        `${digerleri.join(" ve ")} ile 10 dakika arayın — planları değil hâlinizi konuşun.`,
        "/"
      );
    }
  }
}

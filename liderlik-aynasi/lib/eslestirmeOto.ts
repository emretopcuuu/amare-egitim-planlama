import "server-only";
import type { supabaseAdmin } from "@/lib/supabase/server";
import { eslestirEkle } from "@/lib/eslestirme";

type Db = ReturnType<typeof supabaseAdmin>;

// Otomatik eşleştirme tamamlama (orkestratör fonksiyonu). Admin "Eksikleri
// Tamamla" butonuyla aynı iş — ama elle basmaya gerek yok. Mevcut atamalara
// DOKUNMAZ, yalnız hedef sayısının altında kalanları (yeni katılımcılar dahil)
// tamamlar. Dışlama listesi (excluded_pairs) korunur. Panel varsayılanları:
// 5 grup-içi + 3 grup-dışı.
export const ESLESME_GRUP_ICI = 5;
export const ESLESME_GRUP_DISI = 3;

export async function eslestirmeyiOtoTamamla(db: Db): Promise<number> {
  const [{ data: kisiler, error }, { data: mevcutAtamalar }, { data: dislananlar }] =
    await Promise.all([
      db.from("participants").select("id, team").eq("role", "participant"),
      db.from("assignments").select("observer_id, target_id").eq("type", "shadow"),
      db.from("excluded_pairs").select("a_id, b_id"),
    ]);

  if (error || (kisiler ?? []).length < 2) return 0;

  const dislamaSet = new Set<string>((dislananlar ?? []).map((d) => `${d.a_id}|${d.b_id}`));

  const yeniAtamalar = eslestirEkle(
    kisiler ?? [],
    mevcutAtamalar ?? [],
    ESLESME_GRUP_ICI,
    ESLESME_GRUP_DISI,
    Math.random,
    dislamaSet
  );

  if (yeniAtamalar.length === 0) return 0;

  const { error: yazHata } = await db.from("assignments").insert(yeniAtamalar);
  if (yazHata) return 0;
  return yeniAtamalar.length;
}

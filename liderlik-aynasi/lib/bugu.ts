import "server-only";
import type { Db } from "@/lib/degerlendirme";

// G9 — elmas buğusu bayrağı (varsayılan KAPALI). Nazik, sıfır-borç görsel katman.
export async function buguAcikMi(db: Db): Promise<boolean> {
  const { data } = await db.from("settings").select("value").eq("key", "bugu_acik").maybeSingle();
  return data?.value === "true";
}

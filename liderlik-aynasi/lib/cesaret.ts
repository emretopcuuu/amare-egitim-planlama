import "server-only";
import type { supabaseAdmin } from "@/lib/supabase/server";
import { katilimciyaBildir } from "@/lib/push";
import { tr } from "@/lib/i18n/tr";

type Db = ReturnType<typeof supabaseAdmin>;

// [E5] gorevId tohumlu deterministik cesaret fısıltısı (BaslaButonu ile aynı havuz).
function fisiltiSec(gorevId: string): string {
  const havuz = tr.gorevler.cesaretFisiltilari;
  let h = 0;
  for (const ch of gorevId) h = (h * 31 + ch.charCodeAt(0)) % havuz.length;
  return havuz[h];
}

// [E5] "Başladım"dan ~60 sn sonra hâlâ pending görevlere cesaret fısıltısı PUSH'u.
// In-app fısıltıyı tamamlar: uygulama arkaplandayken de telefona ulaşır. Tek
// seferlik (cesaret_push guard'ı). Dakikalık cron (app/api/cron/olaylar) çağırır.
export async function cesaretPushGonder(db: Db): Promise<number> {
  const esik = new Date(Date.now() - 60_000).toISOString();
  const { data: gorevler } = await db
    .from("missions")
    .select("id, participant_id")
    .eq("status", "pending")
    .eq("cesaret_push", false)
    .not("started_at", "is", null)
    .lte("started_at", esik)
    .is("responded_at", null)
    .limit(100);

  let gonderilen = 0;
  for (const g of gorevler ?? []) {
    // Guard'ı ÖNCE işaretle (çift push yarış koruması).
    const { data: sahip } = await db
      .from("missions")
      .update({ cesaret_push: true })
      .eq("id", g.id)
      .eq("cesaret_push", false)
      .select("id")
      .maybeSingle();
    if (!sahip) continue;
    await katilimciyaBildir(db, g.participant_id, "🕯 Cesaret", fisiltiSec(g.id), "/gorevler").catch(() => {});
    gonderilen++;
  }
  return gonderilen;
}

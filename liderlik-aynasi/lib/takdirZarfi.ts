import "server-only";
import type { supabaseAdmin } from "@/lib/supabase/server";
import { katilimciyaBildir } from "@/lib/push";
import { tr } from "@/lib/i18n/tr";

type Db = ReturnType<typeof supabaseAdmin>;

// A8 — AKŞAM TAKDİR ZARFI. Her gün 22:00 penceresinde, o gün takdir ALAN her
// kişiye "Bugün N kişi seni gördü — zarfını aç" push'u gider; kişi /takdir'e
// gelince günün takdirleri zarf açılışıyla tekrar yaşatılır. Gün sonu ikinci
// bir duygu dalgası — anlık bildirim (dağınık) yerine toplu, sıcak bir kapanış.
// İdempotent: gün başına tek sefer (settings kilidi). Kendi hatasını yutar.

const PENCERE_BAS = 22 * 60; // 22:00 (Istanbul dk)
const PENCERE_SON = 22 * 60 + 9; // 22:09

export async function takdirZarfiTik(
  db: Db,
  gunDk: number,
  bugun: string
): Promise<number> {
  if (gunDk < PENCERE_BAS || gunDk > PENCERE_SON) return 0;

  // Gün başına tek sefer — settings kilidi (insert çakışırsa zaten gönderilmiş).
  const { error: kilit } = await db
    .from("settings")
    .insert({ key: `takdir_zarfi_${bugun}`, value: "1" });
  if (kilit) return 0;

  // Bugün (Istanbul) gelen takdirleri say — alıcı bazında.
  const gunBasi = `${bugun}T00:00:00+03:00`;
  const { data: bugunku } = await db
    .from("kudos")
    .select("to_id")
    .eq("is_hidden", false)
    .gte("created_at", gunBasi);
  if (!bugunku?.length) return 0;

  const sayac = new Map<string, number>();
  for (const k of bugunku) sayac.set(k.to_id, (sayac.get(k.to_id) ?? 0) + 1);

  let gonderilen = 0;
  for (const [pid, adet] of sayac) {
    try {
      await katilimciyaBildir(
        db,
        pid,
        tr.takdir.zarfPush.baslik,
        tr.takdir.zarfPush.govde(adet),
        "/takdir?zarf=1"
      );
      gonderilen++;
    } catch {
      // push yapılandırılmamış olabilir — sessizce geç
    }
  }
  return gonderilen;
}

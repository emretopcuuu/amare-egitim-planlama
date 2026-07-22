import "server-only";
import type { Db } from "@/lib/degerlendirme";

// [B#14] SÖZ DUVARI — opt-in. Yalnız duvarda=true + mühürlü (sesli) sözlerden
// İSİMSİZ ilham cümleleri. Kimlik/isim ASLA dönmez; sözün ilk cümlesi alınır.

function ilkCumle(metin: string): string {
  const m = metin.trim().match(/^[^.!?]*[.!?]/);
  const c = (m?.[0] ?? metin.slice(0, 140)).trim();
  return c.length > 160 ? c.slice(0, 157) + "…" : c;
}

// Duvara açık sözlerden en çok `limit` isimsiz alıntı. İzleyenin KENDİ sözü
// hariç tutulur (kendi sözünü "ilham" diye görmesin). Deterministik değil;
// çağıran taraf isterse karıştırır — burada sıralamayı DB'ye bırakıyoruz.
export async function duvarAlintilari(
  db: Db,
  hariçPid: string,
  limit = 3
): Promise<string[]> {
  const { data } = await db
    .from("soz")
    .select("participant_id, metin")
    .eq("duvarda", true)
    .eq("durum", "sesli")
    .not("metin", "is", null)
    .limit(40);
  const havuz = (data ?? [])
    .filter((r) => r.participant_id !== hariçPid && r.metin)
    .map((r) => ilkCumle(r.metin as string));
  // Basit karıştırma tohumsuz Math.random YOK (SSR/hydration): gün bazlı dönüş.
  const gun = Math.floor(Date.now() / 86_400_000);
  const dizili = havuz
    .map((c, i) => ({ c, k: (i * 2654435761 + gun) % (havuz.length || 1) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.c);
  return dizili.slice(0, limit);
}

export async function duvarToggle(db: Db, pid: string, duvarda: boolean): Promise<boolean> {
  const { error } = await db.from("soz").update({ duvarda }).eq("participant_id", pid);
  return !error;
}

import "server-only";
import type { supabaseAdmin } from "@/lib/supabase/server";
import { katilimciyaBildir } from "@/lib/push";
import { tumKayitlar } from "@/lib/tumKayitlar";
import { tr } from "@/lib/i18n/tr";

type Db = ReturnType<typeof supabaseAdmin>;

// A7 — SESSİZ KAHRAMAN. Çok takdir GÖNDEREN ama az ALAN kişi: "görme" davranışının
// kendisini ödüllendir. Radyo "isim asla geçmez" ilkesini bozmamak için bu
// onurlandırma DOĞRUDAN kişiye özel gider (isimli anons değil) — sessiz kahraman
// unutulmuş hissetmesin diye ona sıcak bir "seni gördüm" push'u.
//
// GUARDRAIL'ler: kill-switch (settings.sessiz_kahraman_acik === "false" → kapalı),
// gün başına tek sefer (settings kilidi), en çok 3 kişi. Kendi hatasını yutar.

const PENCERE_BAS = 19 * 60; // 19:00 (akşam, sakin)
const PENCERE_SON = 19 * 60 + 9;
const MIN_GONDERI = 3; // en az 3 takdir göndermiş olmalı
const KISI_TAVAN = 3;

export async function sessizKahramanTik(
  db: Db,
  gunDk: number,
  bugun: string
): Promise<number> {
  if (gunDk < PENCERE_BAS || gunDk > PENCERE_SON) return 0;

  const { data: bayrak } = await db
    .from("settings")
    .select("value")
    .eq("key", "sessiz_kahraman_acik")
    .maybeSingle();
  if (bayrak?.value === "false") return 0;

  const { error: kilit } = await db
    .from("settings")
    .insert({ key: `sessiz_kahraman_${bugun}`, value: "1" });
  if (kilit) return 0;

  // Tüm takdirler (from_id, to_id) — gönderdi/aldı sayacı.
  const kudos = await tumKayitlar<{ from_id: string; to_id: string }>((bas, son) =>
    db.from("kudos").select("from_id, to_id").eq("is_hidden", false).order("id").range(bas, son)
  );
  const gonderdi = new Map<string, number>();
  const aldi = new Map<string, number>();
  for (const k of kudos) {
    gonderdi.set(k.from_id, (gonderdi.get(k.from_id) ?? 0) + 1);
    aldi.set(k.to_id, (aldi.get(k.to_id) ?? 0) + 1);
  }

  // Sessiz kahraman: çok gönderen (>=MIN_GONDERI) ve gönderdiğinin en çok 1/3'ü
  // kadar alan (verdiğinden belirgin az geri dönen). Puan = gönderdi - aldı.
  const adaylar = [...gonderdi.entries()]
    .map(([pid, g]) => ({ pid, g, a: aldi.get(pid) ?? 0 }))
    .filter((x) => x.g >= MIN_GONDERI && x.a <= x.g / 3)
    .sort((a, b) => b.g - b.a - (a.g - a.a))
    .slice(0, KISI_TAVAN);

  let onurlanan = 0;
  for (const x of adaylar) {
    try {
      await katilimciyaBildir(
        db,
        x.pid,
        tr.takdir.sessizKahramanPush.baslik,
        tr.takdir.sessizKahramanPush.govde,
        "/takdir"
      );
      onurlanan++;
    } catch {
      // push yapılandırılmamış olabilir — sessizce geç
    }
  }
  return onurlanan;
}

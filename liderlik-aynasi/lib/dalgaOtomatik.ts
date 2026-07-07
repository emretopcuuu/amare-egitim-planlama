import "server-only";
import type { supabaseAdmin } from "@/lib/supabase/server";
import { kampGorelliZaman } from "@/lib/orkestrator";

type Db = ReturnType<typeof supabaseAdmin>;

// Değerlendirme dalgalarının otomatik açılış bilgisi (admin panelinde "elle
// açmana gerek yok" mesajı). Dalga ismi → senaryo olayı eşlemesi:
//   • "…Değerlendirme…" → degerlendirme_ac (Gün 2 21:00)
//   • "…90…"            → ikinci_ayna_daveti (Gün 90 11:00)
// Zaman ayna_baslangic'tan hesaplanır; kamp başlamadıysa görece ("Gün N · SS:00").
// Olay zaten ateşlendiyse (durum≠bekliyor) null döner (yanlış bilgi vermesin).

export type SenaryoOzet = { olay_kodu: string; gun: number | null; saat: number | null; durum: string | null };

export async function dalgaSenaryolari(db: Db): Promise<{ senaryolar: SenaryoOzet[]; baslangic: Date | null }> {
  const [{ data: senaryolar }, { data: baslangicRow }] = await Promise.all([
    db
      .from("kamp_senaryosu")
      .select("olay_kodu, gun, saat, durum")
      .in("olay_kodu", ["degerlendirme_ac", "ikinci_ayna_daveti"]),
    db.from("settings").select("value").eq("key", "ayna_baslangic").maybeSingle(),
  ]);
  return {
    senaryolar: (senaryolar ?? []) as SenaryoOzet[],
    baslangic: baslangicRow?.value ? new Date(baslangicRow.value) : null,
  };
}

export function dalgaOtomatikMetin(
  ad: string,
  baslangic: Date | null,
  senaryolar: SenaryoOzet[]
): string | null {
  const kod = /değerlend/i.test(ad) ? "degerlendirme_ac" : /90/.test(ad) ? "ikinci_ayna_daveti" : null;
  if (!kod) return null;
  const s = senaryolar.find((x) => x.olay_kodu === kod);
  if (!s || s.gun == null || s.saat == null) return null;
  if (s.durum && s.durum !== "bekliyor") return null; // zaten ateşlendi
  const ss = `${String(s.saat).padStart(2, "0")}:00`;
  if (baslangic) {
    const t = new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    }).format(new Date(kampGorelliZaman(baslangic, s.gun, s.saat)));
    return `🕒 Otomatik açılır: ${t} — elle açmana gerek yok`;
  }
  return `🕒 Otomatik açılır: kamp Gün ${s.gun} · ${ss} — elle açmana gerek yok`;
}

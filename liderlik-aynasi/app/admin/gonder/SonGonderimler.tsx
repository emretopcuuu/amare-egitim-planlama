import { supabaseAdmin } from "@/lib/supabase/server";

// [ADMIN-UX8] SON GÖNDERİMLER — "az önce ne gönderdim, gitti mi?" panikte
// görünür olsun; çift gönderme korkusu bitsin. audit_log'tan son 5 duyuru/WA.
function saatYazi(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function SonGonderimler() {
  const db = supabaseAdmin();
  const { data: kayitlar } = await db
    .from("audit_log")
    .select("eylem, detay, created_at")
    .in("eylem", ["duyuru_gonderildi", "whatsapp_gonderim"])
    .order("created_at", { ascending: false })
    .limit(5);
  if (!kayitlar?.length) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-midnight-card/40 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">🕐 Son gönderimler</p>
      <ul className="mt-2 space-y-1.5">
        {kayitlar.map((k, i) => {
          const d = (k.detay ?? {}) as {
            baslik?: string;
            sablon?: string;
            hedef?: string;
            sayi?: number;
            basarili?: number;
          };
          const etiket =
            k.eylem === "whatsapp_gonderim"
              ? `WhatsApp · ${d.sablon ?? "şablon"} · ${d.basarili ?? 0} kişi`
              : `Duyuru · ${d.baslik ?? "—"} · ${d.hedef === "herkes" ? "herkese" : (d.hedef ?? "")}${d.sayi ? ` (${d.sayi})` : ""}`;
          return (
            <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-slate-300">{etiket}</span>
              <span className="shrink-0 font-mono text-xs text-slate-500">{saatYazi(k.created_at)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

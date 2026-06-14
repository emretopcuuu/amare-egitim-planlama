import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import Ipucu from "./Ipucu";

const t = tr.islemGunlugu;

function etkinlikAdi(eylem: string): string {
  return t.eylemler[eylem] ?? eylem;
}

function formatZaman(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function IslemGunlugu() {
  const db = supabaseAdmin();
  const { data: kayitlar } = await db
    .from("audit_log")
    .select("id, eylem, detay, ip, created_at, participants(full_name)")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gold-light">
        {t.baslik}
        <Ipucu {...tr.admin.yardim.islemGunlugu} />
      </h2>
      <p className="mt-1 mb-4 text-sm text-slate-400">{t.aciklama}</p>

      {!kayitlar?.length ? (
        <p className="text-sm text-slate-500">{t.bos}</p>
      ) : (
        <ul className="divide-y divide-royal/20">
          {kayitlar.map((k) => {
            const admin = (k.participants as { full_name: string } | null)?.full_name ?? "—";
            const detay =
              k.detay && typeof k.detay === "object" && Object.keys(k.detay).length > 0
                ? JSON.stringify(k.detay)
                : null;
            return (
              <li key={k.id} className="flex items-start justify-between gap-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-slate-100">{etkinlikAdi(k.eylem)}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {admin} · {k.ip ?? ""}
                    {detay && <span className="ml-1 text-slate-500">{detay}</span>}
                  </p>
                </div>
                <p className="shrink-0 text-xs tabular-nums text-slate-500">
                  {formatZaman(k.created_at)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

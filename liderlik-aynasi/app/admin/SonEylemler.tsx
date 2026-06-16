import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

const t = tr.admin.ux.sonEylem;
const e = tr.islemGunlugu;

function eylemAdi(eylem: string): string {
  return e.eylemler[eylem] ?? eylem;
}

function gecenSure(iso: string): string {
  const fark = Date.now() - new Date(iso).getTime();
  const dk = Math.floor(fark / 60000);
  if (dk < 1) return "az önce";
  if (dk < 60) return `${dk} dk önce`;
  const sa = Math.floor(dk / 60);
  if (sa < 24) return `${sa} sa önce`;
  return `${Math.floor(sa / 24)} gün önce`;
}

// #5 Son kritik eylemler şeridi: işlem günlüğünün son 3 kaydı panelin üstünde,
// bir bakışta görünür. "Az önce ne değiştirdim?" — yanlış basışı hızlı fark et.
// Geri-al, eylem anındaki tostta sunulur; buradan tam günlüğe geçilir.
export default async function SonEylemler() {
  const db = supabaseAdmin();
  const { data: kayitlar } = await db
    .from("audit_log")
    .select("id, eylem, created_at, participants(full_name)")
    .order("created_at", { ascending: false })
    .limit(3);

  if (!kayitlar?.length) return null;

  return (
    <section className="rounded-2xl border border-royal/20 bg-midnight-card/40 px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t.baslik}
        </p>
        <Link
          href="/admin#islem-gunlugu"
          className="text-xs text-royal-light underline-offset-2 hover:underline"
        >
          {t.tumu} →
        </Link>
      </div>
      <ul className="mt-2 space-y-1.5">
        {kayitlar.map((k) => {
          const admin = (k.participants as { full_name: string } | null)?.full_name ?? "—";
          return (
            <li key={k.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-slate-200">
                <span className="text-slate-500">•</span> {eylemAdi(k.eylem)}
                <span className="ml-1 text-xs text-slate-500">· {admin}</span>
              </span>
              <span className="shrink-0 text-xs tabular-nums text-slate-500">
                {gecenSure(k.created_at)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

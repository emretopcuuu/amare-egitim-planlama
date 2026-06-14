import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import Ipucu from "./Ipucu";

const t = tr.admin.hazirlik;

// #5 "Kampa hazır mısın?": tek bakışta ✓/✗ hazırlık kontrolü. Kendi sorgularını
// yapar (sunucu bileşeni). Eksik maddenin yanında "Düzelt" bağlantısı.
export default async function HazirlikPaneli() {
  const db = supabaseAdmin();
  const [{ count: kisi }, { count: atama }, { data: aynaAyar }, { count: abone }] =
    await Promise.all([
      db.from("participants").select("id", { count: "exact", head: true }).eq("role", "participant"),
      db.from("assignments").select("id", { count: "exact", head: true }),
      db.from("settings").select("value").eq("key", "ayna_aktif").maybeSingle(),
      db.from("push_subscriptions").select("id", { count: "exact", head: true }),
    ]);

  const vapidVar =
    !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY;

  const maddeler = [
    { ok: (kisi ?? 0) > 0, etiket: t.katilimci, ipucu: t.katilimciIpucu, href: "/admin/kurulum" },
    { ok: (atama ?? 0) > 0, etiket: t.eslestirme, ipucu: t.eslestirmeIpucu, href: "/admin/eslestirme" },
    { ok: aynaAyar?.value === "true", etiket: t.ayna, ipucu: t.aynaIpucu, href: "/admin/ayna-direktoru" },
    { ok: vapidVar && (abone ?? 0) > 0, etiket: t.bildirim, ipucu: t.bildirimIpucu, href: "/admin/kurulum" },
  ];
  const hepsi = maddeler.every((m) => m.ok);

  return (
    <section
      className={`kart-3d rounded-2xl p-6 shadow-xl ring-1 backdrop-blur ${
        hepsi ? "bg-emerald-500/5 ring-emerald-400/40" : "bg-midnight-card/60 ring-gold/40"
      }`}
    >
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gold-light">
        {t.baslik}
        <Ipucu {...tr.admin.yardim.hazirlik} />
      </h2>
      <p className={`mt-1 text-sm ${hepsi ? "text-emerald-300" : "text-slate-400"}`}>
        {hepsi ? t.hepsiTamam : t.eksikVar}
      </p>
      <ul className="mt-4 space-y-2">
        {maddeler.map((m) => (
          <li
            key={m.etiket}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <span className="flex items-center gap-3">
              <span className={`text-xl ${m.ok ? "text-emerald-400" : "text-slate-500"}`}>
                {m.ok ? "✓" : "○"}
              </span>
              <span className="text-sm font-medium text-slate-100">
                {m.ok ? m.etiket : m.ipucu}
              </span>
            </span>
            {!m.ok && (
              <Link
                href={m.href}
                className="shrink-0 rounded-lg bg-gold/15 px-3 py-1.5 text-xs font-bold text-gold-light transition-colors hover:bg-gold/25"
              >
                {t.duzelt}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

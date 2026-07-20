import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { protokolAdminOzet } from "@/lib/protokolMotor";
import { buHaftaAnahtari } from "@/lib/pazarKarnesi";

export const metadata = { title: "Protokol — Admin" };

// 90 GÜN PROTOKOLÜ admin paneli: pratik başına aktif/kapatıldı/tamamlama +
// en çok kapatılan pratik (ürün sinyali) + bu haftanın karne toplamı + söz→eylem.
export default async function AdminProtokolPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "admin") redirect("/");

  const db = supabaseAdmin();
  const ozet = await protokolAdminOzet(db, buHaftaAnahtari(new Date()));

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display altin-metin text-2xl font-bold">🌱 90 Gün Protokolü</h1>
          <p className="text-xs text-slate-500">{ozet.kuranKisi} kişinin protokolü kuruldu.</p>
        </div>
        <Link href="/admin" className="text-sm text-slate-400 hover:text-gold-light">← Panel</Link>
      </header>

      <section className="rounded-2xl border border-royal/25 bg-midnight-card/40 p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Pratikler</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="py-1">Pratik</th>
              <th className="py-1 text-right">Aktif</th>
              <th className="py-1 text-right">Kapatıldı</th>
              <th className="py-1 text-right">Tamamlama</th>
            </tr>
          </thead>
          <tbody>
            {ozet.pratikler.map((p) => (
              <tr key={p.kod} className="border-t border-white/5">
                <td className="py-1.5 text-slate-200">{p.ad}</td>
                <td className="py-1.5 text-right tabular-nums text-emerald-300">{p.aktif}</td>
                <td className="py-1.5 text-right tabular-nums text-slate-400">{p.kapatildi}</td>
                <td className="py-1.5 text-right tabular-nums text-gold-light">{p.tamamlama}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {ozet.enCokKapatilan && (
          <p className="mt-3 rounded-lg bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
            🚩 En çok kapatılan (ürün sinyali): <b>{ozet.enCokKapatilan.ad}</b> — {ozet.enCokKapatilan.adet} kişi.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-gold/25 bg-gold/[0.05] p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gold-light/80">Bu Hafta Pazar Karnesi</p>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div><div className="font-display text-2xl font-bold text-slate-100">{ozet.buHaftaKarne.kisi}</div><div className="text-xs text-slate-400">kişi</div></div>
          <div><div className="font-display text-2xl font-bold text-slate-100">{ozet.buHaftaKarne.davet}</div><div className="text-xs text-slate-400">davet</div></div>
          <div><div className="font-display text-2xl font-bold text-slate-100">{ozet.buHaftaKarne.gorusme}</div><div className="text-xs text-slate-400">görüşme</div></div>
          <div><div className="font-display text-2xl font-bold text-slate-100">{ozet.buHaftaKarne.takip}</div><div className="text-xs text-slate-400">takip</div></div>
        </div>
        {ozet.buHaftaKarne.davet > 0 && (
          <p className="mt-3 text-center text-xs text-slate-400">
            Söz→eylem: {ozet.buHaftaKarne.kisi} kişiden {ozet.buHaftaKarne.davet} davet çıktı
            (kişi başı ~{(ozet.buHaftaKarne.davet / Math.max(1, ozet.buHaftaKarne.kisi)).toFixed(1)}).
          </p>
        )}
      </section>
    </main>
  );
}

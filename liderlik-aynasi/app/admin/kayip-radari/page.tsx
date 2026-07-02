import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { kayipRadarListesi } from "@/lib/kayipRadar";

export const revalidate = 30;
export const metadata = { title: "Kayıp Radarı — Liderlik Aynası" };

// [E8] KAMP İÇİ KAYIP RADARI — sessizleşenler: kim + ne zamandır sessiz + önerilen
// insan dokunuşu. Kamp modunda 2 üst üste sessizde WhatsApp gider; burada 3+
// (admin'e işaretlenmiş) olanlar listelenir ki lider yüz yüze müdahale etsin.
export default async function KayipRadariPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const liste = await kayipRadarListesi(supabaseAdmin());

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">🛟 Kayıp Radarı</h1>
        <p className="mt-1 text-sm text-slate-400">
          Kamp içinde sessizleşenler. Sistem nazikçe dürttü/WhatsApp attı — buradakiler artık{" "}
          <b>insan dokunuşu</b> istiyor.
        </p>
      </div>

      {liste.length === 0 ? (
        <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] p-6 text-center text-sm text-emerald-200">
          Kayan kimse yok — salon canlı. 🌊
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-midnight-card/60 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Kişi</th>
                <th className="px-3 py-2 text-left">Sessiz</th>
                <th className="px-3 py-2 text-center">WA</th>
                <th className="px-3 py-2 text-left">Önerilen dokunuş</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="px-3 py-2 text-slate-200">
                    {r.ad}
                    {r.takim && <span className="ml-1 text-xs text-slate-500">· {r.takim}</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-rose-300">
                    {r.sessizSaat == null ? "hiç" : `${r.sessizSaat}sa`}
                  </td>
                  <td className="px-3 py-2 text-center">{r.waGonderildi ? "✓" : "—"}</td>
                  <td className="px-3 py-2 text-slate-300">{r.oneri}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { pazartesiRaporu, churnMerdiveni, eylulKapisi } from "@/lib/kapanisPanel";
import { sozMuhurDurumu } from "@/lib/sozMuhur";

export const revalidate = 30;
export const metadata = { title: "Kapanış — Liderlik Aynası" };

// FAZ 6 — ADMIN OTOMASYONU: [6.1] pazartesi raporu + [6.2] churn merdiveni +
// [6.3] Eylül kapısı panosu. Kamp sonrası 90 günün admin karar yüzeyi.
export default async function KapanisPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  // [FAZ3] E-serisi sayaçları: söz mühür N/M + İlk-72 taahhüt yapılan/toplam —
  // kapanış gecesinin iki kritik "herkes tamam mı" göstergesi bu panele taşındı.
  const [rapor, churn, kapi, soz, { data: taahhutler }] = await Promise.all([
    pazartesiRaporu(db),
    churnMerdiveni(db),
    eylulKapisi(db),
    sozMuhurDurumu(db),
    db.from("taahhut").select("durum"),
  ]);
  const taahhutToplam = (taahhutler ?? []).length;
  const taahhutYapilan = (taahhutler ?? []).filter((t) => t.durum === "yapildi").length;

  const churnRenk: Record<number, string> = {
    0: "text-slate-400",
    1: "text-amber-300",
    2: "text-orange-300",
    3: "text-rose-300",
  };
  const kararRozet: Record<string, string> = {
    devam: "bg-emerald-400/15 text-emerald-300",
    izle: "bg-amber-400/15 text-amber-300",
    risk: "bg-rose-400/15 text-rose-300",
  };

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-6">
      {/* [6.1] PAZARTESİ KOMUTA RAPORU */}
      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-gold-light">📋 Pazartesi Komuta Raporu</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { ad: "Aktif (7g)", v: `${rapor.aktif7}/${rapor.toplam}` },
            { ad: "Sessiz (7g+)", v: rapor.sessiz7 },
            { ad: "Kıvılcım (7g)", v: rapor.kivilcim7 },
            { ad: "Ara mühür teyit", v: rapor.muhurTeyit },
            { ad: "İş verisi giren", v: `${rapor.isVerisiGiren}/${rapor.toplam}` },
            { ad: "Söz mühürlü", v: `${soz.muhurlu}/${soz.sozVeren}` },
            { ad: "İlk-72 taahhüt ✓", v: `${taahhutYapilan}/${taahhutToplam}` },
          ].map((k) => (
            <div key={k.ad} className="rounded-2xl border border-white/10 bg-midnight-card/50 p-3 text-center">
              <div className="font-display text-2xl font-bold text-slate-100">{k.v}</div>
              <div className="text-xs text-slate-400">{k.ad}</div>
            </div>
          ))}
        </div>
      </section>

      {/* [6.2] CHURN MÜDAHALE MERDİVENİ */}
      <section>
        <h2 className="mb-1 font-display text-lg font-bold text-gold-light">🪜 Churn Müdahale Merdiveni</h2>
        <p className="mb-3 text-xs text-slate-500">En riskliden en aktife. Basamak arttıkça müdahale kişiselleşir.</p>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-midnight-card/60 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Kişi</th>
                <th className="px-3 py-2 text-left">Sessiz</th>
                <th className="px-3 py-2 text-left">Öneri</th>
              </tr>
            </thead>
            <tbody>
              {churn.map((c) => (
                <tr key={c.id} className="border-t border-white/5">
                  <td className="px-3 py-2 text-slate-200">
                    {c.ad}
                    {c.takim && <span className="ml-1 text-xs text-slate-500">· {c.takim}</span>}
                  </td>
                  <td className={`px-3 py-2 font-mono ${churnRenk[c.basamak]}`}>
                    {c.sessizGun == null ? "hiç" : `${c.sessizGun}g`}
                  </td>
                  <td className={`px-3 py-2 ${churnRenk[c.basamak]}`}>{c.oneri}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* [6.3] EYLÜL KAPISI KARAR PANOSU */}
      <section>
        <h2 className="mb-1 font-display text-lg font-bold text-gold-light">🚪 Eylül Kapısı Karar Panosu</h2>
        <p className="mb-3 text-xs text-slate-500">
          Aktiflik + iş verisi + Eylül Aynası puanı → önerilen karar. Nihai kararı sen verirsin.
        </p>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-midnight-card/60 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Kişi</th>
                <th className="px-3 py-2 text-center">Aktif</th>
                <th className="px-3 py-2 text-center">İş verisi</th>
                <th className="px-3 py-2 text-center">Ayna</th>
                <th className="px-3 py-2 text-center">Karar</th>
              </tr>
            </thead>
            <tbody>
              {kapi.map((k) => (
                <tr key={k.id} className="border-t border-white/5">
                  <td className="px-3 py-2 text-slate-200">{k.ad}</td>
                  <td className="px-3 py-2 text-center">{k.aktif ? "✓" : "—"}</td>
                  <td className="px-3 py-2 text-center">{k.isVerisi ? "✓" : "—"}</td>
                  <td className="px-3 py-2 text-center text-slate-300">{k.eylulPuan ?? "—"}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${kararRozet[k.karar]}`}>
                      {k.karar}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

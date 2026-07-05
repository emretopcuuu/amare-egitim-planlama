import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { planEksikKatilimcilar } from "@/lib/oyunPlani";
import SozAcKapat from "./SozAcKapat";
import PlanOnIsit from "./PlanOnIsit";
import { tr } from "@/lib/i18n/tr";
import Ipucu from "../Ipucu";
import Katlanir from "../Katlanir";
import OtoYenile from "../OtoYenile";

export const metadata = { title: "Kamp Sözleri — Liderlik Aynası" };

// FAZ 1 (tek söz) — admin panosu: "Kamp Sözünü Aç" tetikleyicisi + kim planını
// kurdu / kim söz verdi ilerlemesi + sahne öncesi plan ön-ısıtma.
export default async function SozlerPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [{ data: ayar }, { data: kisiler }, { data: planlar }, { data: sozler }, eksik] =
    await Promise.all([
      db.from("settings").select("value").eq("key", "soz_v2_acik").maybeSingle(),
      db
        .from("participants")
        .select("id, full_name, team")
        .eq("role", "participant")
        .order("full_name"),
      db.from("oyun_plani").select("participant_id, durum"),
      db.from("soz").select("participant_id, durum, voice_path"),
      planEksikKatilimcilar(db),
    ]);

  const acik = ayar?.value === "true";
  const planHarita = new Map((planlar ?? []).map((p) => [p.participant_id, p.durum]));
  const sozHarita = new Map(
    (sozler ?? []).map((s) => [s.participant_id, { durum: s.durum, ses: !!s.voice_path }])
  );

  const liste = (kisiler ?? []).map((k) => {
    const planD = planHarita.get(k.id) ?? null;
    const s = sozHarita.get(k.id) ?? null;
    const sozD = s?.ses ? "sesli" : s?.durum ?? null;
    return { ad: k.full_name, takim: k.team, planD, sozD };
  });

  const planKuran = liste.filter((r) => r.planD === "onaylandi").length;
  const sozVeren = liste.filter((r) => r.sozD === "sesli").length;

  const planEtiket = (d: string | null) =>
    d === "onaylandi" ? "kuruldu ✓" : d === "taslak" ? "taslak" : "—";
  const sozEtiket = (d: string | null) =>
    d === "sesli"
      ? "söz verildi ✓"
      : d === "onaylandi"
        ? "onaylı (ses bekliyor)"
        : d === "taslak"
          ? "taslak"
          : "—";

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <div className="flex justify-end">
        <OtoYenile saniye={20} />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gold">
          🤝 Kamp Sözleri <Ipucu {...tr.admin.yardim.sozler} />
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Kapanış: kişi önce 90 günlük oyun planını kurar, sonra sözünü verir. Aşağıdan tetikle ve ilerlemeyi izle.
        </p>
      </div>

      {/* TETİKLEYİCİ — sahnede basılır. Açılışta herkese push düşer. */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-gold/40 backdrop-blur">
        <p className="mb-3 text-sm text-slate-300">
          {acik
            ? "Kamp Sözü katılımcılara AÇIK — ana ekranları plan/söz akışında."
            : "Kamp Sözü kapalı. Sahnede aç: herkese “Söz zamanı” push’u düşer."}
        </p>
        <SozAcKapat acik={acik} />
      </section>

      {/* SAHNE ÖNCESİ — plan ön-ısıtma (bekleme olmasın). */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-royal-light">
          Sahne öncesi hazırlık
        </h2>
        <PlanOnIsit eksik={eksik.length} />
      </section>

      {/* İLERLEME — kim planını kurdu / söz verdi. */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-midnight-soft p-3">
            <p className="text-2xl font-bold text-gold">{liste.length}</p>
            <p className="mt-1 text-xs text-slate-400">katılımcı</p>
          </div>
          <div className="rounded-xl bg-midnight-soft p-3">
            <p className="text-2xl font-bold text-gold">{planKuran}</p>
            <p className="mt-1 text-xs text-slate-400">planını kurdu</p>
          </div>
          <div className="rounded-xl bg-midnight-soft p-3">
            <p className="text-2xl font-bold text-gold">{sozVeren}</p>
            <p className="mt-1 text-xs text-slate-400">söz verdi</p>
          </div>
        </div>
      </section>

      <Katlanir baslik="📋 Katılımcı ilerlemesi" ikon="📋">
        {liste.length === 0 ? (
          <p className="text-sm text-slate-400">Katılımcı yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="cizgili w-full text-left text-sm">
              <thead>
                <tr className="border-b border-royal/30 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-3">Kişi</th>
                  <th className="py-2 pr-3">Takım</th>
                  <th className="py-2 pr-3">Plan</th>
                  <th className="py-2">Söz</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-royal/20">
                {liste.map((r, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-3 font-medium text-slate-100">{r.ad}</td>
                    <td className="py-2 pr-3 text-slate-400">{r.takim ?? "—"}</td>
                    <td className={`py-2 pr-3 ${r.planD === "onaylandi" ? "text-emerald-300" : "text-slate-300"}`}>
                      {planEtiket(r.planD)}
                    </td>
                    <td className={`py-2 ${r.sozD === "sesli" ? "text-gold" : "text-slate-300"}`}>
                      {sozEtiket(r.sozD)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Katlanir>
    </main>
  );
}

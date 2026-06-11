import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { aktifOzellikler } from "@/lib/degerlendirme";
import { tr } from "@/lib/i18n/tr";
import DalgaKontrol from "./DalgaKontrol";

export const metadata = { title: "Yönetim Paneli — Liderlik Aynası" };

export default async function AdminPanel() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [{ data: dalgalar, error: dalgaHatasi }, ozellikler] = await Promise.all([
    db.from("waves").select("id, name, is_open, opened_at").order("id"),
    aktifOzellikler(db),
  ]);
  if (dalgaHatasi) throw dalgaHatasi;

  const acikDalga = dalgalar.find((d) => d.is_open) ?? null;

  // İlerleme yalnızca açık dalga için hesaplanır (kamp anlık tek dalga yaşar).
  let ilerleme: {
    katilimcilar: { id: string; ad: string; takim: string | null }[];
    ozTamamlar: Set<string>;
    puanladigi: Map<string, number>;
    onuPuanlayan: Map<string, number>;
    toplamPuan: number;
  } | null = null;

  if (acikDalga) {
    const [{ data: kisiler, error: kisiHatasi }, { data: puanlar, error: puanHatasi }] =
      await Promise.all([
        db
          .from("participants")
          .select("id, full_name, team")
          .eq("role", "participant")
          .order("full_name"),
        db
          .from("ratings")
          .select("rater_id, target_id")
          .eq("wave", acikDalga.id),
      ]);
    if (kisiHatasi) throw kisiHatasi;
    if (puanHatasi) throw puanHatasi;

    // (rater, target) çifti tüm özellikleri kapsıyorsa "tamamlanmış" sayılır.
    const ciftSayilari = new Map<string, number>();
    for (const p of puanlar) {
      const anahtar = `${p.rater_id}|${p.target_id}`;
      ciftSayilari.set(anahtar, (ciftSayilari.get(anahtar) ?? 0) + 1);
    }

    const ozTamamlar = new Set<string>();
    const puanladigi = new Map<string, number>();
    const onuPuanlayan = new Map<string, number>();
    for (const [anahtar, adet] of ciftSayilari) {
      if (adet < ozellikler.length) continue;
      const [rater, target] = anahtar.split("|");
      if (rater === target) {
        ozTamamlar.add(rater);
      } else {
        puanladigi.set(rater, (puanladigi.get(rater) ?? 0) + 1);
        onuPuanlayan.set(target, (onuPuanlayan.get(target) ?? 0) + 1);
      }
    }

    ilerleme = {
      katilimcilar: kisiler.map((k) => ({ id: k.id, ad: k.full_name, takim: k.team })),
      ozTamamlar,
      puanladigi,
      onuPuanlayan,
      toplamPuan: puanlar.length,
    };
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gold">{tr.admin.baslik}</h1>

      <section className="rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 className="text-lg font-semibold text-gold-light">
          {tr.admin.dalga.baslik}
        </h2>
        <p className="mt-1 text-sm text-slate-400">{tr.admin.dalga.aciklama}</p>
        <DalgaKontrol
          dalgalar={dalgalar.map((d) => ({
            id: d.id,
            ad: d.name,
            acik: d.is_open,
          }))}
        />
      </section>

      <section className="rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 className="text-lg font-semibold text-gold-light">
          {tr.admin.ilerleme.baslik}
          {acikDalga && (
            <span className="ml-2 text-sm font-normal text-slate-400">
              · {acikDalga.name}
            </span>
          )}
        </h2>

        {!ilerleme ? (
          <p className="mt-3 text-sm text-slate-400">
            {tr.admin.ilerleme.acikDalgaYok}
          </p>
        ) : (
          <>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-midnight-soft p-3">
                <dd className="text-2xl font-bold text-gold">
                  {ilerleme.katilimcilar.length}
                </dd>
                <dt className="mt-1 text-xs text-slate-400">
                  {tr.admin.ilerleme.katilimci}
                </dt>
              </div>
              <div className="rounded-xl bg-midnight-soft p-3">
                <dd className="text-2xl font-bold text-gold">
                  {ilerleme.ozTamamlar.size}/{ilerleme.katilimcilar.length}
                </dd>
                <dt className="mt-1 text-xs text-slate-400">
                  {tr.admin.ilerleme.ozTamam}
                </dt>
              </div>
              <div className="rounded-xl bg-midnight-soft p-3">
                <dd className="text-2xl font-bold text-gold">{ilerleme.toplamPuan}</dd>
                <dt className="mt-1 text-xs text-slate-400">
                  {tr.admin.ilerleme.toplamPuan}
                </dt>
              </div>
            </dl>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-royal/30 text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-3">{tr.admin.ilerleme.kisi}</th>
                    <th className="py-2 pr-3">{tr.admin.ilerleme.takim}</th>
                    <th className="py-2 pr-3 text-center">{tr.admin.ilerleme.oz}</th>
                    <th className="py-2 pr-3 text-center">
                      {tr.admin.ilerleme.puanladigi}
                    </th>
                    <th className="py-2 text-center">
                      {tr.admin.ilerleme.onuPuanlayan}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-royal/20">
                  {ilerleme.katilimcilar.map((k) => (
                    <tr key={k.id}>
                      <td className="py-2 pr-3 font-medium text-slate-100">{k.ad}</td>
                      <td className="py-2 pr-3 text-slate-400">{k.takim ?? "—"}</td>
                      <td className="py-2 pr-3 text-center">
                        {ilerleme.ozTamamlar.has(k.id) ? (
                          <span className="text-emerald-400">✓</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-center text-slate-300">
                        {ilerleme.puanladigi.get(k.id) ?? 0}
                      </td>
                      <td className="py-2 text-center text-slate-300">
                        {ilerleme.onuPuanlayan.get(k.id) ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

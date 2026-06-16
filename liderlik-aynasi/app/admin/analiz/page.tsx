import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tumKayitlar } from "@/lib/tumKayitlar";
import { tr } from "@/lib/i18n/tr";
import Ipucu from "../Ipucu";
import Katlanir from "../Katlanir";

export const metadata = { title: "Analiz — Liderlik Aynası" };

const KANIT_ESIK = 3;
const t = tr.admin.analiz;

// FAZ 4 (Eylül kapısı) + FAZ 5 (cascade): ölçüm panosu. Üç ekseni AYRI ölçer —
// kimlik dayanıklılığı (A), davranış/aktivite (motor), iş sonucu (dış). Altta
// takım kırılımı: liderler kendi ekibinin durumunu görür (ölçek provası).
export default async function AnalizSayfa() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin");

  const db = supabaseAdmin();
  // rcmt/mcmt/kud/miss kamp boyunca ~1000 satır sınırını aşar → sayfa sayfa çek.
  const [parts, pus, bos, rcmt, mcmt, kud, miss, churn, redSay, mom] =
    await Promise.all([
      db.from("participants").select("id, team").eq("role", "participant"),
      db.from("pusula").select("participant_id, tamamlandi_at"),
      db.from("bosluk_ani").select("participant_id, yeni_cumle"),
      tumKayitlar<{ target_id: string }>((bas, son) =>
        db.from("ratings").select("target_id").eq("is_hidden", false).not("comment", "is", null).order("target_id").range(bas, son)
      ),
      tumKayitlar<{ participant_id: string }>((bas, son) =>
        db.from("missions").select("participant_id").not("ai_comment", "is", null).order("participant_id").range(bas, son)
      ),
      tumKayitlar<{ to_id: string }>((bas, son) =>
        db.from("kudos").select("to_id").eq("is_hidden", false).order("to_id").range(bas, son)
      ),
      tumKayitlar<{ status: string }>((bas, son) =>
        db.from("missions").select("status").order("status").range(bas, son)
      ),
      db.from("churn_radar").select("participant_id, admin_alerted_at"),
      db.from("redler").select("id", { count: "exact", head: true }),
      db.from("momentum_scores").select("participant_id, score, week_start").order("week_start", { ascending: false }),
    ]);

  const kisiler = parts.data ?? [];
  const toplam = kisiler.length;

  // ---- Kimlik ekseni (A) ----
  const pusulaTamam = (pus.data ?? []).filter((p) => p.tamamlandi_at).length;
  const boslukSet = new Set((bos.data ?? []).filter((b) => b.yeni_cumle).map((b) => b.participant_id));
  const boslukTamam = boslukSet.size;

  // Kanıt sayımı (kanıtsız = içi boş an riski)
  const kanit = new Map<string, number>();
  const ekle = (id: string) => kanit.set(id, (kanit.get(id) ?? 0) + 1);
  rcmt.forEach((r) => ekle(r.target_id));
  mcmt.forEach((m) => ekle(m.participant_id));
  kud.forEach((k) => ekle(k.to_id));
  const kanitsiz = kisiler.filter((k) => (kanit.get(k.id) ?? 0) < KANIT_ESIK).length;

  // ---- Davranış ekseni (motor) ----
  const gorevler = miss;
  const gorevPuanli = gorevler.filter((g) => g.status === "scored").length;
  const gorevKapanan = gorevler.filter((g) => g.status === "scored" || g.status === "expired").length;
  const gorevOran = gorevKapanan ? Math.round((gorevPuanli / gorevKapanan) * 100) : 0;
  const churnRiskte = (churn.data ?? []).filter((c) => c.admin_alerted_at).length;
  const redToplam = redSay.count ?? 0;
  const sonMomentum = new Map<string, number>();
  for (const m of mom.data ?? []) {
    if (!sonMomentum.has(m.participant_id)) sonMomentum.set(m.participant_id, m.score);
  }
  const momentumOrt = sonMomentum.size
    ? Math.round([...sonMomentum.values()].reduce((a, b) => a + b, 0) / sonMomentum.size)
    : null;

  // ---- Takım kırılımı (FAZ 5) ----
  const takimlar = new Map<string, { toplam: number; pusula: number; bosluk: number; kanitsiz: number }>();
  const pusulaSet = new Set((pus.data ?? []).filter((p) => p.tamamlandi_at).map((p) => p.participant_id));
  for (const k of kisiler) {
    const ad = k.team ?? "—";
    const t = takimlar.get(ad) ?? { toplam: 0, pusula: 0, bosluk: 0, kanitsiz: 0 };
    t.toplam++;
    if (pusulaSet.has(k.id)) t.pusula++;
    if (boslukSet.has(k.id)) t.bosluk++;
    if ((kanit.get(k.id) ?? 0) < KANIT_ESIK) t.kanitsiz++;
    takimlar.set(ad, t);
  }
  const takimSatir = [...takimlar.entries()].sort((a, b) => a[0].localeCompare(b[0], "tr"));

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 p-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-gold">{t.baslik}</h1>
        <Ipucu {...tr.admin.yardim.analiz} />
      </div>
      <p className="-mt-4 text-sm text-slate-400">{t.aciklama}</p>

      {/* Eksen 1 — Kimlik */}
      <Eksen baslik={t.kimlikBaslik} aciklama={t.kimlikAciklama} yardim={tr.admin.yardim.analizKimlik}>
        <Kutu buyuk={`${pusulaTamam}/${toplam}`} kucuk={t.pusula} />
        <Kutu buyuk={`${boslukTamam}/${toplam}`} kucuk={t.bosluk} />
        <Kutu buyuk={String(kanitsiz)} kucuk={t.kanitsiz} uyari={kanitsiz > 0} />
      </Eksen>

      {/* Eksen 2 — Davranış */}
      <Eksen baslik={t.davranisBaslik} aciklama={t.davranisAciklama} yardim={tr.admin.yardim.analizDavranis}>
        <Kutu buyuk={`%${gorevOran}`} kucuk={t.gorevOran} />
        <Kutu buyuk={String(churnRiskte)} kucuk={t.churn} uyari={churnRiskte > 0} />
        <Kutu buyuk={String(redToplam)} kucuk={t.red} />
        <Kutu buyuk={momentumOrt === null ? "—" : String(momentumOrt)} kucuk={t.momentum} />
      </Eksen>

      {/* Eksen 3 — İş (dış) */}
      <Eksen baslik={t.isBaslik} aciklama={t.isAciklama} yardim={tr.admin.yardim.analizIs}>
        <p className="col-span-full rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm text-slate-500">
          {t.isNot}
        </p>
      </Eksen>

      {/* Takım kırılımı — FAZ 5 cascade (katlanır, varsayılan kapalı) */}
      <Katlanir baslik={t.takimBaslik} ikon="👥" aciklama={t.takimAciklama} yardim={tr.admin.yardim.analizTakim}>
        {/* #8 Masaüstü: tablo. Mobil: yığılı kartlar. */}
        <div className="hidden overflow-x-auto rounded-2xl ring-1 ring-royal/30 sm:block">
          <table className="w-full text-sm">
            <thead className="bg-midnight-card/60 text-slate-400">
              <tr>
                <th className="px-4 py-2 text-left font-medium">{t.takim}</th>
                <th className="px-3 py-2 text-right font-medium">{t.pusula}</th>
                <th className="px-3 py-2 text-right font-medium">{t.bosluk}</th>
                <th className="px-3 py-2 text-right font-medium">{t.kanitsiz}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-royal/20">
              {takimSatir.map(([ad, v]) => (
                <tr key={ad} className="bg-midnight-card/30">
                  <td className="px-4 py-2.5 font-medium text-slate-100">{ad}</td>
                  <td className="px-3 py-2.5 text-right text-slate-300">
                    {v.pusula}/{v.toplam}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-300">
                    {v.bosluk}/{v.toplam}
                  </td>
                  <td className={`px-3 py-2.5 text-right ${v.kanitsiz > 0 ? "text-amber-400" : "text-slate-300"}`}>
                    {v.kanitsiz}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="space-y-2.5 sm:hidden">
          {takimSatir.map(([ad, v]) => (
            <li
              key={ad}
              className="rounded-xl border border-royal/20 bg-midnight-card/30 p-3"
            >
              <p className="font-medium text-slate-100">{ad}</p>
              <dl className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <dt className="text-slate-500">{t.pusula}</dt>
                  <dd className="mt-0.5 text-slate-200">{v.pusula}/{v.toplam}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{t.bosluk}</dt>
                  <dd className="mt-0.5 text-slate-200">{v.bosluk}/{v.toplam}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{t.kanitsiz}</dt>
                  <dd className={`mt-0.5 ${v.kanitsiz > 0 ? "text-amber-400" : "text-slate-200"}`}>
                    {v.kanitsiz}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </Katlanir>
    </main>
  );
}

function Eksen({
  baslik,
  aciklama,
  yardim,
  children,
}: {
  baslik: string;
  aciklama: string;
  yardim: { baslik: string; metin: readonly string[] };
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gold-light">
        {baslik}
        <Ipucu {...yardim} />
      </h2>
      <p className="mb-3 text-sm text-slate-400">{aciklama}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>
    </section>
  );
}

function Kutu({ buyuk, kucuk, uyari = false }: { buyuk: string; kucuk: string; uyari?: boolean }) {
  return (
    <div
      className={`kart-3d rounded-2xl bg-midnight-card/60 p-4 text-center shadow-xl ring-1 backdrop-blur ${
        uyari ? "ring-amber-500/40" : "ring-royal/30"
      }`}
    >
      <p className={`text-2xl font-bold ${uyari ? "text-amber-400" : "text-gold"}`}>{buyuk}</p>
      <p className="mt-1 text-xs text-slate-400">{kucuk}</p>
    </div>
  );
}

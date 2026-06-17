import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tumKayitlar } from "@/lib/tumKayitlar";
import { tr } from "@/lib/i18n/tr";

export const metadata = { title: "Takım Sağlığı — Liderlik Aynası" };

const t = tr.admin.takimSagligi;

// GELİŞTİRME #5 (2.tur): Takım Sağlığı Endeksi. Komutan radarı kişi-bazlı;
// bu sayfa takım düzeyinde tek bir sağlık skoru (katılım + momentum + teslim +
// kayma) hesaplar ve takımları sıralar. Admin takımları yan yana görür.
export default async function TakimSagligiPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [{ data: kisiler }, momentumlar, { data: churnlar }, gorevler] = await Promise.all([
    db.from("participants").select("id, team, camp_unlocked_at").eq("role", "participant"),
    tumKayitlar<{ participant_id: string; score: number; week_start: string }>((bas, son) =>
      db.from("momentum_scores").select("participant_id, score, week_start").order("week_start", { ascending: false }).range(bas, son)
    ),
    db.from("churn_radar").select("participant_id").not("nudged_at", "is", null),
    tumKayitlar<{ participant_id: string; status: string }>((bas, son) =>
      db.from("missions").select("participant_id, status").in("status", ["scored", "expired"]).order("participant_id").range(bas, son)
    ),
  ]);

  // Kişi başı en güncel momentum (momentumlar zaten week_start desc).
  const sonMomentum = new Map<string, number>();
  for (const m of momentumlar) if (!sonMomentum.has(m.participant_id)) sonMomentum.set(m.participant_id, m.score);
  const kayanSet = new Set((churnlar ?? []).map((c) => c.participant_id));
  const teslimSay = new Map<string, { scored: number; expired: number }>();
  for (const g of gorevler) {
    const k = teslimSay.get(g.participant_id) ?? { scored: 0, expired: 0 };
    if (g.status === "scored") k.scored++;
    else k.expired++;
    teslimSay.set(g.participant_id, k);
  }

  type Takim = {
    ad: string;
    uye: number;
    kampta: number;
    momentumOrt: number | null;
    kayan: number;
    teslimOrani: number;
    saglik: number;
  };
  const grup = new Map<string, string[]>();
  for (const k of kisiler ?? []) {
    if (!k.team) continue;
    const liste = grup.get(k.team) ?? [];
    liste.push(k.id);
    grup.set(k.team, liste);
  }

  const takimlar: Takim[] = [];
  for (const [ad, idler] of grup) {
    const uye = idler.length;
    const kampta = (kisiler ?? []).filter((k) => k.team === ad && k.camp_unlocked_at).length;
    const momentumVals = idler.map((id) => sonMomentum.get(id)).filter((v): v is number => v !== undefined);
    const momentumOrt = momentumVals.length ? momentumVals.reduce((a, b) => a + b, 0) / momentumVals.length : null;
    const kayan = idler.filter((id) => kayanSet.has(id)).length;
    let scored = 0;
    let toplam = 0;
    for (const id of idler) {
      const s = teslimSay.get(id);
      if (s) {
        scored += s.scored;
        toplam += s.scored + s.expired;
      }
    }
    const teslimOrani = toplam > 0 ? scored / toplam : 1;
    const katilim = uye > 0 ? kampta / uye : 0;
    const kayanOran = uye > 0 ? kayan / uye : 0;

    // Ağırlıklı sağlık; eksik bileşen (momentum) ağırlığı yeniden dağıtılır.
    const ciftler: [number | null, number][] = [
      [momentumOrt, 0.35],
      [teslimOrani * 100, 0.25],
      [katilim * 100, 0.2],
      [(1 - kayanOran) * 100, 0.2],
    ];
    let wTop = 0;
    let sTop = 0;
    for (const [v, w] of ciftler) if (v !== null) { sTop += v * w; wTop += w; }
    const saglik = wTop > 0 ? Math.round(sTop / wTop) : 0;

    takimlar.push({ ad, uye, kampta, momentumOrt: momentumOrt === null ? null : Math.round(momentumOrt), kayan, teslimOrani, saglik });
  }
  takimlar.sort((a, b) => b.saglik - a.saglik);

  const renk = (s: number) => (s >= 70 ? "text-emerald-400" : s >= 45 ? "text-gold-light" : "text-red-400");
  const bar = (s: number) => (s >= 70 ? "from-emerald-500/70 to-emerald-400" : s >= 45 ? "from-gold-dim to-gold" : "from-red-500/70 to-red-400");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">{t.baslik}</h1>
        <p className="mt-1 text-sm text-slate-400">{t.aciklama}</p>
      </div>

      {takimlar.length === 0 ? (
        <p className="text-sm text-slate-400">{t.takimYok}</p>
      ) : (
        <ol className="space-y-3">
          {takimlar.map((tk, i) => (
            <li key={tk.ad} className="kart-3d rounded-2xl bg-midnight-card/60 p-4 ring-1 ring-royal/30">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-sm font-bold text-slate-500">{i + 1}</span>
                  <span className="font-semibold text-slate-100">{tk.ad}</span>
                </div>
                <span className={`text-2xl font-bold ${renk(tk.saglik)}`}>{tk.saglik}</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full bg-gradient-to-r ${bar(tk.saglik)}`} style={{ width: `${Math.max(3, tk.saglik)}%` }} />
              </div>
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                <span>{t.uye}: <b className="text-slate-200">{tk.kampta}/{tk.uye}</b></span>
                <span>{t.momentum}: <b className="text-slate-200">{tk.momentumOrt ?? "—"}</b></span>
                <span>{t.teslim}: <b className="text-slate-200">%{Math.round(tk.teslimOrani * 100)}</b></span>
                {tk.kayan > 0 && <span className="text-red-400/90">{t.kayan}: <b>{tk.kayan}</b></span>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}

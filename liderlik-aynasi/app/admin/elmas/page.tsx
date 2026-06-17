import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tumKayitlar } from "@/lib/tumKayitlar";
import { elmasSkorla, type ElmasGirdi, type OFProfil } from "@/lib/elmasSkoru";
import { tr } from "@/lib/i18n/tr";
import ElmasListe from "./ElmasListe";

export const metadata = { title: "Elmas Seçimi — Liderlik Aynası" };

const MKOD = ["m1", "m2", "m3", "m4", "m5", "m6"] as const;

function ortala(satir: Record<string, number | string | null>): number | null {
  const v = MKOD.map((k) => satir[k]).filter((x): x is number => typeof x === "number");
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export default async function ElmasPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [{ data: kisiler }, { data: oflar }, { data: ozler }, disler] = await Promise.all([
    db.from("participants").select("id, full_name, team").eq("role", "participant"),
    db.from("on_farkindalik").select("participant_id, profil"),
    db.from("mini360_oz").select("participant_id, m1, m2, m3, m4, m5, m6"),
    tumKayitlar<{ target_id: string; m1: number | null; m2: number | null; m3: number | null; m4: number | null; m5: number | null; m6: number | null }>(
      (bas, son) =>
        db.from("mini360_dis").select("target_id, m1, m2, m3, m4, m5, m6").order("id").range(bas, son)
    ),
  ]);

  const profilHarita = new Map<string, OFProfil>();
  for (const o of oflar ?? []) profilHarita.set(o.participant_id, (o.profil ?? null) as OFProfil);

  const ozHarita = new Map<string, number | null>();
  for (const z of ozler ?? []) ozHarita.set(z.participant_id, ortala(z));

  // Dış puanları hedefe göre topla: ortalama + adet.
  const disTop = new Map<string, { toplam: number; adet: number; satir: number }>();
  for (const d of disler) {
    const ort = ortala(d);
    if (ort === null) continue;
    const m = disTop.get(d.target_id) ?? { toplam: 0, adet: 0, satir: 0 };
    m.toplam += ort;
    m.satir += 1;
    disTop.set(d.target_id, m);
  }

  const girdiler: ElmasGirdi[] = (kisiler ?? []).map((k) => {
    const dis = disTop.get(k.id);
    return {
      pid: k.id,
      ad: k.full_name,
      takim: k.team,
      profil: profilHarita.get(k.id) ?? null,
      mini360: {
        ozAvg: ozHarita.get(k.id) ?? null,
        disAvg: dis ? dis.toplam / dis.satir : null,
        disSayi: dis ? dis.satir : 0,
      },
    };
  });

  const { sonuclar, esik, adaySayisi, puanlananSayisi } = elmasSkorla(girdiler);
  const takimlar = [...new Set((kisiler ?? []).map((k) => k.team).filter((x): x is string => !!x))].sort(
    (a, b) => (parseInt(a.replace(/\D/g, ""), 10) || 0) - (parseInt(b.replace(/\D/g, ""), 10) || 0)
  );

  const t = tr.admin.elmas;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">{t.baslik}</h1>
        <p className="mt-1 text-sm text-slate-400">{t.aciklama}</p>
        <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-300/90">
          {t.gizliUyari}
        </p>
        {/* #6 Rapor ihracatı: tüm adaylar CSV (Excel uyumlu) */}
        <a
          href="/api/admin/disa-aktar"
          className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-royal-light/30 px-4 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5"
        >
          📥 {t.csvIndir}
        </a>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white/[0.03] px-4 py-3">
          <dt className="text-xs text-slate-500">{t.ozetPuanlanan}</dt>
          <dd className="mt-0.5 text-2xl font-bold text-slate-100">
            {puanlananSayisi}
            <span className="text-sm font-normal text-slate-500"> / {girdiler.length}</span>
          </dd>
        </div>
        <div className="rounded-xl bg-white/[0.03] px-4 py-3">
          <dt className="text-xs text-slate-500">{t.ozetAday}</dt>
          <dd className="mt-0.5 text-2xl font-bold text-gold-light">{adaySayisi}</dd>
        </div>
        <div className="rounded-xl bg-white/[0.03] px-4 py-3">
          <dt className="text-xs text-slate-500">{t.ozetEsik}</dt>
          <dd className="mt-0.5 text-2xl font-bold text-slate-100">{esik ?? "—"}</dd>
        </div>
      </dl>

      {puanlananSayisi === 0 ? (
        <p className="text-sm text-slate-400">{t.veriYok}</p>
      ) : (
        <ElmasListe sonuclar={sonuclar} takimlar={takimlar} />
      )}
    </main>
  );
}

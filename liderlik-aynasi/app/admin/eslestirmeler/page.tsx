import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tumKayitlar } from "@/lib/tumKayitlar";
import { tr } from "@/lib/i18n/tr";
import Katlanir from "../Katlanir";
import Ipucu from "../Ipucu";
import OtoYenile from "../OtoYenile";
import EslestirmeFormu from "../eslestirme/EslestirmeFormu";
import AtamaDuzenle from "../eslestirme/AtamaDuzenle";
import EslestirmeMetrik from "../eslestirme/EslestirmeMetrik";
import DislaymaListesi from "../eslestirme/DislaymaListesi";
import AynaEsiPanel from "../ayna-esi/AynaEsiPanel";

export const metadata = { title: "Eşleştirmeler — Liderlik Aynası" };

type AtamaSatir = {
  type: string;
  observer: { id: string; full_name: string; team: string | null };
  target: { id: string; full_name: string; team: string | null };
};

type AynaEsiSatir = {
  id: string;
  tur: number;
  slot: string;
  a_verir: number;
  b_verir: number;
  a_tamam: boolean;
  b_tamam: boolean;
  a: { full_name: string; team: string | null } | null;
  b: { full_name: string; team: string | null } | null;
};

// S5: Gözlemci atamaları + Ayna Eşi tek sayfada birleşti.
export default async function EslestirmelerPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [atamalar, { data: kisilerHam }, { data: aynaAyar }, { data: aynaEsiSatirlar }] =
    await Promise.all([
      tumKayitlar<AtamaSatir>((bas, son) =>
        db
          .from("assignments")
          .select(
            "id, type, observer:participants!assignments_observer_id_fkey(id, full_name, team), target:participants!assignments_target_id_fkey(id, full_name, team)"
          )
          .order("observer_id")
          .range(bas, son)
      ),
      db
        .from("participants")
        .select("id, full_name, team")
        .eq("role", "participant")
        .order("full_name"),
      db.from("settings").select("value").eq("key", "ayna_esi_acik").maybeSingle(),
      db
        .from("ayna_esi")
        .select(
          "id, tur, slot, a_verir, b_verir, a_tamam, b_tamam, a:participants!ayna_esi_a_id_fkey(full_name, team), b:participants!ayna_esi_b_id_fkey(full_name, team)"
        )
        .order("tur")
        .order("slot"),
    ]);

  const kisiler = (kisilerHam ?? []).map((k) => ({
    id: k.id,
    ad: k.full_name,
    takim: k.team,
  }));
  const duzAtamalar = atamalar.map((a) => ({
    observerId: a.observer.id,
    observerAd: a.observer.full_name,
    observerTakim: a.observer.team,
    targetId: a.target.id,
    targetAd: a.target.full_name,
    targetTakim: a.target.team,
  }));
  const metrikAtamalar = duzAtamalar.map((a) => ({
    observerId: a.observerId,
    targetId: a.targetId,
    observerTakim: a.observerTakim,
    targetTakim: a.targetTakim,
  }));

  const aynaEsiAcik = aynaAyar?.value === "true";

  // Kompakt istatistik şeridi
  const gozlemciSayisi = new Set(atamalar.map((a) => a.observer.id)).size;
  const aynaEsiTamam = (aynaEsiSatirlar ?? []).filter((r) => r.a_tamam && r.b_tamam).length;

  const t = tr.admin.eslestirme;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gold">🔗 Eşleştirmeler</h1>
          <Ipucu {...tr.admin.yardim.eslestirme} />
        </div>
        <OtoYenile />
      </div>

      {/* Kompakt istatistik şeridi */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-midnight-card/60 px-3 py-1.5 text-slate-300 ring-1 ring-royal/20">
          👁 Gözlemci: {gozlemciSayisi}/{kisiler.length}
        </span>
        <span className={`rounded-full px-3 py-1.5 ring-1 ${aynaEsiTamam > 0 ? "bg-emerald-400/10 text-emerald-400 ring-emerald-400/20" : "bg-midnight-card/60 text-slate-400 ring-royal/20"}`}>
          🤝 Ayna Eşi: {aynaEsiTamam}/{(aynaEsiSatirlar ?? []).length} tamamlandı
        </span>
        {gozlemciSayisi === kisiler.length && (
          <span className="rounded-full bg-gold/10 px-3 py-1.5 text-gold-light ring-1 ring-gold/20">
            ✓ Tüm eşleştirmeler hazır
          </span>
        )}
      </div>

      {/* Gözlemci atamaları */}
      <Katlanir baslik={t.baslik} ikon="👁" varsayilanAcik>
        <EslestirmeFormu />
        <EslestirmeMetrik
          atamalar={metrikAtamalar}
          katilimciSayisi={kisiler.length}
        />
        <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
          <h2 className="mb-4 text-lg font-semibold text-gold-light">
            {t.dislamaBaslik}
          </h2>
          <DislaymaListesi kisiler={kisiler.map((k) => ({ id: k.id, ad: k.ad }))} />
        </section>
        <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
          <h2 className="text-lg font-semibold text-gold-light">
            {t.mevcutBaslik}
          </h2>
          <AtamaDuzenle kisiler={kisiler} atamalar={duzAtamalar} />
        </section>
      </Katlanir>

      {/* Ayna Eşi */}
      <Katlanir baslik={tr.aynaEsi.adminBaslik} ikon="👁">
        <p className="text-sm leading-relaxed text-slate-400">
          {tr.aynaEsi.adminAciklama}
        </p>
        <AynaEsiPanel
          acik={aynaEsiAcik}
          satirlar={(aynaEsiSatirlar ?? []) as unknown as AynaEsiSatir[]}
          kisiler={kisiler.map((k) => ({ id: k.id, ad: k.ad }))}
        />
      </Katlanir>
    </main>
  );
}

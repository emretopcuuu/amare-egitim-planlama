import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { raporlarGorunurMu } from "@/lib/rapor";
import { tr } from "@/lib/i18n/tr";
import Ipucu from "../Ipucu";
import OtoYenile from "../OtoYenile";
import BoslukKontrol from "../BoslukKontrol";
import AynaAniKontrol from "../AynaAniKontrol";
import MuhurKontrol from "../MuhurKontrol";
import SozV2Kontrol from "../SozV2Kontrol";
import OdevPaketi from "../OdevPaketi";
import DavetKontrol from "../DavetKontrol";
import IkiliKontrol from "../IkiliKontrol";

export const metadata = { title: "Final & Sonrası — Liderlik Aynası" };

// Kampın kapanış aşaması: Boşluk Anı → Ayna Raporları → Mühür → Kapanış Sözü,
// ardından kamp sonrası araçlar (90 gün daveti, ödev paketi, ikili eşleşmeler).
// Kamp Canlı (dalga) kontrolünden ayrı bir sayfa — funnel aşamaları (Kamp Canlı /
// Final) artık her biri kendi sayfasında.
export default async function FinalPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [
    raporlarAcik,
    { count: mektupSayisi },
    { count: katilimciSayisi },
    { count: epostaliSayisi },
    { data: davetAyari },
    { count: ikiliSayisi },
    { data: muhurAyar },
  ] = await Promise.all([
    raporlarGorunurMu(db),
    db.from("mirror_letters").select("participant_id", { count: "exact", head: true }),
    db.from("participants").select("id", { count: "exact", head: true }).eq("role", "participant"),
    db
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("role", "participant")
      .not("email", "is", null),
    db.from("settings").select("value").eq("key", "wave4_davet_gonderildi").maybeSingle(),
    db.from("pairs").select("id", { count: "exact", head: true }),
    db.from("settings").select("value").eq("key", "muhur_acik").maybeSingle(),
  ]);

  const muhurAcik = muhurAyar?.value === "true";

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 p-4 pb-28 sm:p-6 sm:pb-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gold">🏁 Final & Sonrası</h1>
        <OtoYenile />
      </div>
      <p className="text-sm text-slate-400">
        Boşluk Anı → Ayna Raporları → Mühür → Kapanış Sözü + kamp sonrası araçlar
      </p>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className={`rounded-full px-3 py-1.5 ring-1 ${raporlarAcik ? "bg-gold/10 text-gold-light ring-gold/20" : "bg-midnight-card/60 text-slate-400 ring-royal/20"}`}>
          👁 Rapor: {raporlarAcik ? "açık" : "kapalı"}
        </span>
        <span className={`rounded-full px-3 py-1.5 ring-1 ${muhurAcik ? "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20" : "bg-midnight-card/60 text-slate-400 ring-royal/20"}`}>
          🔒 Mühür: {muhurAcik ? "açık" : "kapalı"}
        </span>
      </div>

      <section id="bosluk" className="scroll-mt-24 space-y-5">
        <div className="rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
            {tr.admin.fazBir.baslik}
            <Ipucu {...tr.admin.yardim.fazBir} />
          </h2>
          <BoslukKontrol />
        </div>

        <div id="rapor" className="scroll-mt-24 rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-100">
            {tr.admin.aynaAni.baslik}
            <Ipucu {...tr.admin.yardim.rapor} />
          </h2>
          <p className="mt-1 text-sm text-slate-400">{tr.admin.aynaAni.aciklama}</p>
          <AynaAniKontrol
            acik={raporlarAcik}
            mektupHazir={mektupSayisi ?? 0}
            mektupToplam={katilimciSayisi ?? 0}
          />
        </div>

        <div id="muhur" className="scroll-mt-24 rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
            {tr.admin.muhur.baslik}
            <Ipucu {...tr.admin.yardim.muhur} />
          </h2>
          <MuhurKontrol />
        </div>

        <div id="soz" className="scroll-mt-24 rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
            📜 {tr.admin.sozV2.baslik}
          </h2>
          <SozV2Kontrol />
        </div>
      </section>

      <section id="sonrasi" className="scroll-mt-24 space-y-5 border-t border-white/10 pt-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gold-light">
          📦 Kamp Sonrası
        </h2>

        <div className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gold-light">
            {tr.admin.odev.baslik}
            <Ipucu {...tr.admin.yardim.odev} />
          </h3>
          <div className="mt-3">
            <OdevPaketi />
          </div>
        </div>

        <div id="davet" className="scroll-mt-24 kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gold-light">
            {tr.admin.doksanGun.baslik}
            <Ipucu {...tr.admin.yardim.davet} />
          </h3>
          <p className="mt-1 mb-3 text-sm text-slate-400">{tr.admin.doksanGun.aciklama}</p>
          <DavetKontrol
            epostali={epostaliSayisi ?? 0}
            toplam={katilimciSayisi ?? 0}
            sonGonderim={davetAyari?.value ?? null}
          />
        </div>

        <div className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gold-light">
            {tr.admin.ikili.baslik}
            <Ipucu {...tr.admin.yardim.ikili} />
          </h3>
          <p className="mt-1 mb-3 text-sm text-slate-400">{tr.admin.ikili.aciklama}</p>
          <IkiliKontrol mevcut={ikiliSayisi ?? 0} />
        </div>
      </section>
    </main>
  );
}

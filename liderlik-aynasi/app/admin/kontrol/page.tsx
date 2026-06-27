import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { aktifOzellikler } from "@/lib/degerlendirme";
import { raporlarGorunurMu } from "@/lib/rapor";
import { tr } from "@/lib/i18n/tr";
import Katlanir from "../Katlanir";
import Ipucu from "../Ipucu";
import OtoYenile from "../OtoYenile";
import FazSifirKontrol from "../FazSifirKontrol";
import OnFarkindalikKontrol from "../OnFarkindalikKontrol";
import DalgaKontrol from "../DalgaKontrol";
import HedefKontrol from "../HedefKontrol";
import BoslukKontrol from "../BoslukKontrol";
import AynaAniKontrol from "../AynaAniKontrol";
import MuhurKontrol from "../MuhurKontrol";
import SozV2Kontrol from "../SozV2Kontrol";
import OdevPaketi from "../OdevPaketi";
import DavetKontrol from "../DavetKontrol";
import IkiliKontrol from "../IkiliKontrol";

export const metadata = { title: "Kontroller — Liderlik Aynası" };

// S3: Hazırlık + Canlı + Final kontrolleri tek sayfada birleşti.
// Sub-rotalar (/kontrol/hazirlik, /kontrol/canli, /kontrol/final) buraya yönlendirir.
export default async function KontrolPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [
    { data: dalgalar, error },
    ozellikler,
    raporlarAcik,
    { count: mektupSayisi },
    { count: katilimciSayisi },
    { count: epostaliSayisi },
    { data: davetAyari },
    { count: ikiliSayisi },
    { count: pusulaTamam },
  ] = await Promise.all([
    db.from("waves").select("id, name, is_open").order("id"),
    aktifOzellikler(db),
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
    db.from("pusula").select("participant_id", { count: "exact", head: true }).not("tamamlandi_at", "is", null),
  ]);
  if (error) throw error;

  const acik = (dalgalar ?? []).find((d) => d.is_open) ?? null;

  // Açık dalgada hiç puanlamamış kişi sayısı (dalga kapatma uyarısı için)
  let puanlamayan = 0;
  if (acik) {
    const [{ data: kisiler }, { data: puanlar }] = await Promise.all([
      db.from("participants").select("id").eq("role", "participant"),
      db.from("ratings").select("rater_id, target_id").eq("wave", acik.id),
    ]);
    const cift = new Map<string, number>();
    for (const p of puanlar ?? []) {
      const a = `${p.rater_id}|${p.target_id}`;
      cift.set(a, (cift.get(a) ?? 0) + 1);
    }
    const puanladigi = new Map<string, number>();
    for (const [a, adet] of cift) {
      if (adet < ozellikler.length) continue;
      const [rater, target] = a.split("|");
      if (rater !== target) puanladigi.set(rater, (puanladigi.get(rater) ?? 0) + 1);
    }
    puanlamayan = (kisiler ?? []).filter((k) => (puanladigi.get(k.id) ?? 0) === 0).length;
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 p-4 pb-28 sm:p-6 sm:pb-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gold">🎛 Kontroller</h1>
        <OtoYenile />
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-midnight-card/60 px-3 py-1.5 text-slate-300 ring-1 ring-royal/20">
          🧭 Pusula: {pusulaTamam ?? 0}/{katilimciSayisi ?? 0}
        </span>
        <span className={`rounded-full px-3 py-1.5 ring-1 ${acik ? "bg-emerald-400/10 text-emerald-400 ring-emerald-400/20" : "bg-midnight-card/60 text-slate-400 ring-royal/20"}`}>
          🌊 Dalga: {acik?.name ?? "kapalı"}
        </span>
        <span className={`rounded-full px-3 py-1.5 ring-1 ${raporlarAcik ? "bg-gold/10 text-gold-light ring-gold/20" : "bg-midnight-card/60 text-slate-400 ring-royal/20"}`}>
          👁 Rapor: {raporlarAcik ? "açık" : "kapalı"}
        </span>
      </div>
      <p className="text-sm text-slate-400">
        Kamp öncesi hazırlık → kamp günü → kapanış sırası. Her işlem onay ister.
      </p>

      {/* 1 · Hazırlık */}
      <section id="hazirlik" className="scroll-mt-24">
        <Katlanir baslik="Hazırlık" aciklama="Pusula + Ön Farkındalık pencereleri" ikon="🧰" yardim={tr.admin.yardim.fazSifir} varsayilanAcik>
          <div id="pusula" className="scroll-mt-24 rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
              {tr.admin.fazSifir.baslik}
              <Ipucu {...tr.admin.yardim.fazSifir} />
            </h2>
            <FazSifirKontrol />
          </div>
          <div id="onfark" className="scroll-mt-24 rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
              {tr.admin.onFark.baslik}
            </h2>
            <OnFarkindalikKontrol />
          </div>
        </Katlanir>
      </section>

      {/* 2 · Kamp Canlı */}
      <section id="dalga" className="scroll-mt-24">
        <Katlanir baslik="Kamp Canlı" aciklama="Dalga aç/kapat + hedef akışı" ikon="🎬" yardim={tr.admin.yardim.dalga}>
          <div className="rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-100">
              {tr.admin.dalga.baslik}
              <Ipucu {...tr.admin.yardim.dalga} />
            </h2>
            <p className="mt-1 text-sm text-slate-400">{tr.admin.dalga.aciklama}</p>
            <DalgaKontrol
              dalgalar={(dalgalar ?? []).map((d) => ({
                id: d.id,
                ad: d.name,
                acik: d.is_open,
              }))}
              puanlamayan={puanlamayan}
            />
          </div>
          <div id="hedef" className="scroll-mt-24 rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
              🎯 {tr.admin.hedef.baslik}
            </h2>
            <HedefKontrol />
          </div>
        </Katlanir>
      </section>

      {/* 3 · Final & Sonrası */}
      <section id="bosluk" className="scroll-mt-24">
        <Katlanir baslik="Final & Sonrası" aciklama="Boşluk Anı → Ayna Raporları → Mühür → Kapanış Sözü + kamp sonrası araçlar" ikon="🏁" yardim={tr.admin.yardim.fazBir}>
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
        </Katlanir>
      </section>
    </main>
  );
}

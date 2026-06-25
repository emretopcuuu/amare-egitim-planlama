import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { raporlarGorunurMu } from "@/lib/rapor";
import { tr } from "@/lib/i18n/tr";
import BoslukKontrol from "../../BoslukKontrol";
import AynaAniKontrol from "../../AynaAniKontrol";
import MuhurKontrol from "../../MuhurKontrol";
import SozV2Kontrol from "../../SozV2Kontrol";
import OdevPaketi from "../../OdevPaketi";
import DavetKontrol from "../../DavetKontrol";
import IkiliKontrol from "../../IkiliKontrol";
import Ipucu from "../../Ipucu";
import OtoYenile from "../../OtoYenile";

export const metadata = { title: "Final Kontrolleri — Liderlik Aynası" };

// FİNAL & SONRASI anahtarları: Boşluk Anı → Ayna Raporları → Mühür → Kapanış
// Sözü + kamp sonrası araçlar (ödev, 90-gün davet, ikili). Panelden taşındı.
export default async function FinalKontrolPage() {
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
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-4 pb-28 sm:p-6 sm:pb-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gold">🪞 Final & Sonrası Kontrolleri</h1>
        <OtoYenile />
      </div>
      <p className="text-sm text-slate-400">
        Kapanış sırası: Boşluk Anı → Ayna Raporları → Mühür → Kapanış Sözü. Altta kamp
        sonrası araçlar. Her işlem onay ister ve geri alınabilir.
      </p>

      <div id="bosluk" className="scroll-mt-24 rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
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

      {/* Kamp sonrası uzun soluklu araçlar */}
      <section id="sonrasi" className="scroll-mt-24 space-y-6 border-t border-white/10 pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gold-light">
          📦 Kamp Sonrası
        </h2>

        <div className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gold-light">
            {tr.admin.odev.baslik}
            <Ipucu {...tr.admin.yardim.odev} />
          </h3>
          <div className="mt-3">
            <OdevPaketi />
          </div>
        </div>

        <div id="davet" className="kart-3d scroll-mt-24 rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gold-light">
            {tr.admin.doksanGun.baslik}
            <Ipucu {...tr.admin.yardim.davet} />
          </h3>
          <p className="mt-1 text-sm text-slate-400">{tr.admin.doksanGun.aciklama}</p>
          <DavetKontrol
            epostali={epostaliSayisi ?? 0}
            toplam={katilimciSayisi ?? 0}
            sonGonderim={davetAyari?.value ?? null}
          />
        </div>

        <div className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gold-light">
            {tr.admin.ikili.baslik}
            <Ipucu {...tr.admin.yardim.ikili} />
          </h3>
          <p className="mt-1 mb-4 text-sm text-slate-400">{tr.admin.ikili.aciklama}</p>
          <IkiliKontrol mevcut={ikiliSayisi ?? 0} />
        </div>
      </section>

      <Link href="/admin" className="block text-center text-sm text-royal-light hover:underline">
        ← Yönetim paneline dön
      </Link>
    </main>
  );
}

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import KatilimciYonetim from "./KatilimciYonetim";
import OyunSecimiPanel from "./OyunSecimiPanel";
import OnboardingRadari from "./OnboardingRadari";
import Ipucu from "../Ipucu";
import Katlanir from "../Katlanir";
import FazSifirKontrol from "../FazSifirKontrol";
import OnFarkindalikKontrol from "../OnFarkindalikKontrol";
import HedefKontrol from "../HedefKontrol";

export const metadata = { title: "Katılımcılar — Liderlik Aynası" };

export default async function KatilimcilarPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [{ data: kisiler, error }, { data: churnlar }] = await Promise.all([
    db
      .from("participants")
      .select("id, full_name, team, city, phone, login_code, kariyer_seviyesi, en_yuksek_kariyer, gecen_ay_kariyer, kidem_ay, kariyer_durumu")
      .eq("role", "participant")
      .order("full_name"),
    // UX #2: sessizleşen (dürtülmüş) adayları listede kırmızı işaretlemek için.
    db.from("churn_radar").select("participant_id").not("nudged_at", "is", null),
  ]);
  if (error) throw error;
  const kayanIdler = (churnlar ?? []).map((c) => c.participant_id);

  const t = tr.admin.katilimcilar;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-gold">{t.baslik}</h1>
        <Ipucu {...tr.admin.yardim.katilimcilar} />
      </div>

      {/* Hazırlık ilerleme — Pusula + Ön Farkındalık + Hedef tamamlanma durumu */}
      <section id="hazirlik" className="scroll-mt-24">
        <Katlanir baslik="Hazırlık Durumu" aciklama="Değerler + Oyun + Push + Pusula + Ön Farkındalık + Hedef" ikon="🧰" yardim={tr.admin.yardim.fazSifir}>
          {/* [M2/M3/M9] En kritik üç sinyal en üstte — kim hazır değil, tek bakışta. */}
          <OnboardingRadari />
          <div className="rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
              {tr.admin.fazSifir.baslik}
              <Ipucu {...tr.admin.yardim.fazSifir} />
            </h2>
            <FazSifirKontrol />
          </div>
          <div className="rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
              {tr.admin.onFark.baslik}
            </h2>
            <OnFarkindalikKontrol />
          </div>
          <div id="hedef" className="scroll-mt-24 rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
              🎯 {tr.admin.hedef.baslik}
            </h2>
            <HedefKontrol />
          </div>
        </Katlanir>
      </section>

      {/* Liste en üstte ve açık; diğer her şey (ekle, dağıt, adlandır, import,
          tehlikeli) katlanır ve varsayılan kapalı — KatilimciYonetim içinde. */}
      {/* Oyun seçimi ile grup dağıtımı — giriş kapısı + doluluk */}
      <OyunSecimiPanel />

      <KatilimciYonetim kisiler={kisiler} kayanIdler={kayanIdler} />
    </main>
  );
}

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

export const metadata = { title: "Katılımcılar — Liderlik Aynası" };

export default async function KatilimcilarPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [{ data: kisiler, error }, { data: churnlar }, { data: degerlerTamam }, { data: aboneler }] = await Promise.all([
    db
      .from("participants")
      .select("id, full_name, team, city, phone, login_code, kariyer_seviyesi, en_yuksek_kariyer, gecen_ay_kariyer, kidem_ay, kariyer_durumu, profil_foto_path")
      .eq("role", "participant")
      .order("full_name"),
    // UX #2: sessizleşen (dürtülmüş) adayları listede kırmızı işaretlemek için.
    db.from("churn_radar").select("participant_id").not("nudged_at", "is", null),
    // [ADMIN-UX5] Satır rozetleri: değerler tamam + push izni id kümeleri.
    db.from("degerler_calismasi").select("participant_id").not("tamamlandi_at", "is", null),
    db.from("push_subscriptions").select("participant_id"),
  ]);
  if (error) throw error;
  const kayanIdler = (churnlar ?? []).map((c) => c.participant_id);
  const degerlerTamamIdler = (degerlerTamam ?? []).map((r) => r.participant_id);
  const pushluIdler = [...new Set((aboneler ?? []).map((a) => a.participant_id))];

  // Saha isteği: 142 kişilik listede isimden tanımak zor — fotoğrafını yükleyen
  // herkesin gerçek fotoğrafı (imzalı URL) satırda görünsün. Foto yoksa Avatar
  // zaten baş harf bloğuna zarifçe düşer. Tek batch imzalama (verimli).
  const fotoUrller: Record<string, string> = {};
  const fotolular = (kisiler ?? []).filter((k) => k.profil_foto_path);
  if (fotolular.length > 0) {
    const yollar = fotolular.map((k) => k.profil_foto_path as string);
    const { data: imzali } = await db.storage.from("sesler").createSignedUrls(yollar, 3600);
    const yolUrl = new Map((imzali ?? []).map((s) => [s.path, s.signedUrl]));
    for (const k of fotolular) {
      const url = yolUrl.get(k.profil_foto_path as string);
      if (url) fotoUrller[k.id] = url;
    }
  }

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
        </Katlanir>
      </section>

      {/* Liste en üstte ve açık; diğer her şey (ekle, dağıt, adlandır, import,
          tehlikeli) katlanır ve varsayılan kapalı — KatilimciYonetim içinde. */}
      {/* Oyun seçimi ile grup dağıtımı — giriş kapısı + doluluk */}
      <OyunSecimiPanel />

      <KatilimciYonetim
        kisiler={kisiler}
        fotoUrller={fotoUrller}
        kayanIdler={kayanIdler}
        degerlerTamamIdler={degerlerTamamIdler}
        pushluIdler={pushluIdler}
      />
    </main>
  );
}

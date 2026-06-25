import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { tr } from "@/lib/i18n/tr";
import FazSifirKontrol from "../../FazSifirKontrol";
import OnFarkindalikKontrol from "../../OnFarkindalikKontrol";
import Ipucu from "../../Ipucu";
import OtoYenile from "../../OtoYenile";

export const metadata = { title: "Hazırlık Kontrolleri — Liderlik Aynası" };

// KAMP ÖNCESİ pencere anahtarları. Panelden buraya taşındı: panel artık yalnız
// "durum + sıradaki adım"; her aşamanın anahtarları kendi menüsünün altında.
export default async function HazirlikKontrolPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-4 pb-28 sm:p-6 sm:pb-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gold">🧰 Hazırlık Kontrolleri</h1>
        <OtoYenile />
      </div>
      <p className="text-sm text-slate-400">
        Kamp başlamadan açılan pencereler. Sırayla: önce Pusula, sonra Ön Farkındalık.
        Her işlem onay ister ve geri alınabilir.
      </p>

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

      <Link href="/admin" className="block text-center text-sm text-royal-light hover:underline">
        ← Yönetim paneline dön
      </Link>
    </main>
  );
}

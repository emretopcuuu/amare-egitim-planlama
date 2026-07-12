import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { brifGetir } from "@/lib/kapanis";
import KapanisBrif from "./KapanisBrif";

export const metadata = { title: "Kapanış — Sahne Hazırlık · Liderlik Aynası" };
export const dynamic = "force-dynamic";

// KAPANIŞ — "SALONUN RÖNTGENİ": Emre'nin sahne öncesi hazırlık merkezi.
// 3 günlük yaşanmış deneyim → Emre'nin kapanış eğitimine köprü. Brif, kampın
// son günü Emre sahneye çıkmadan ÖNCE hazır olur: 07:30 ana brif + 11:20 güncel.
export default async function KapanisPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const { guncel } = await brifGetir(db);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">👁 Kapanış — Sahne Hazırlık</h1>
        <p className="mt-1 text-sm text-slate-400">
          Üç günün yaşanmış verisi, senin kapanış eğitimine köprü olacak biçimde
          damıtılır. Bu brifi <strong>yalnız sen</strong> görürsün; salona okunmaz.
        </p>
      </div>

      {/* Teslim zamanı — kullanıcının "saat kaçta verecek?" sorusunun cevabı */}
      <div className="rounded-2xl border border-gold/30 bg-gold/5 p-5 text-sm">
        <p className="font-semibold text-gold-light">⏰ Kamp günü sana ne zaman gelir?</p>
        <ul className="mt-2 space-y-1.5 text-slate-300">
          <li>
            <strong className="text-slate-100">07:30 · Ana brif</strong> — Gün 3 sabahı, sen daha
            sahneye çıkmadan. Değerlendirme dışındaki her şey (3 günün röntgeni, konuşma malzemesi,
            dokunulacaklar). Kahvaltı + checkout boyunca elinde; bol hazırlık süresi.
          </li>
          <li>
            <strong className="text-slate-100">11:20 · Güncel brif</strong> — Gün 3 liderlik
            değerlendirmesi (07:15 açılır, ~11:15 kapanır) işlendikten sonra tazelenir. Zirve
            oturumundan (~11:40) ~20 dk önce. Sahneye bununla çık.
          </li>
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          Her teslimde telefonuna push düşer. Kamp açık değilken (şimdi / prova) aşağıdaki{" "}
          <strong>"Brifi Üret"</strong> ile eldeki veriyle istediğin an test edebilirsin.
        </p>
      </div>

      <KapanisBrif guncel={guncel} />
    </main>
  );
}

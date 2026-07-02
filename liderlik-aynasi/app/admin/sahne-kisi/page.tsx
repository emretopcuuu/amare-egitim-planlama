import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import SahneKisiSecici, { type Kisi } from "./SahneKisiSecici";

export const metadata = { title: "Sahne Kişisi — Liderlik Aynası" };

// [1.4] Canlı Yolculuk sahne kişisi seçimi. Onaysız kişi seçilemez;
// büyük ekran /ekran/yolculuk seçili kişinin 3 günlük arkını gösterir.
export default async function SahneKisiPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [{ data: kisiler }, { data: secAyar }] = await Promise.all([
    db.from("participants").select("id, full_name, sahne_onay").eq("role", "participant").order("full_name"),
    db.from("settings").select("value").eq("key", "sahne_yolculuk_kisi").maybeSingle(),
  ]);
  const seciliId = secAyar?.value || null;
  const liste: Kisi[] = (kisiler ?? []).map((k) => ({
    id: k.id,
    ad: k.full_name,
    onay: k.sahne_onay,
    secili: k.id === seciliId,
  }));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">🎥 Canlı Yolculuk — Sahne Kişisi</h1>
        <p className="mt-1 text-sm text-slate-400">
          Önce kişiyi <b>onayla</b> (rızası olmadan sahnede gösterilmez), sonra <b>sahneye al</b>. Büyük ekran{" "}
          <code className="text-gold-light">/ekran/yolculuk</code> seçili kişinin 3 günlük yolculuğunu gösterir.
        </p>
      </div>
      <SahneKisiSecici kisiler={liste} />
    </main>
  );
}

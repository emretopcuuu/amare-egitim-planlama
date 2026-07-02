import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isVerisiDurumu } from "@/lib/isVerisi";
import IsVerisiForm from "./IsVerisiForm";

export const metadata = { title: "İş Verisi — Liderlik Aynası" };
export const revalidate = 0;

// [5.4] İŞ VERİSİ KÖPRÜSÜ — kişi haftalık gerçek iş sayılarını girer; toplam +
// geçmiş haftalar görünür. Rakamlar yalnız kişinin kendisine görünür.
export default async function IsVerisiPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const durum = await isVerisiDurumu(db, session.sub);
  const buHaftaKayit = durum.satirlar.find((s) => s.hafta === durum.buHafta);

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="sahne-giris mx-auto w-full max-w-md space-y-4 p-5">
        <header>
          <h1 className="font-display altin-metin text-2xl font-bold leading-tight">📊 İş Verisi Köprüsü</h1>
          <p className="mt-1 text-sm text-slate-400">
            Liderlik lafla değil rakamla ölçülür. Bu haftanın gerçek sayılarını gir — AYNA görevlerini verine bağlar.
          </p>
        </header>

        {durum.buHafta == null ? (
          <p className="rounded-2xl border border-white/10 bg-midnight-card/50 p-5 text-center text-sm text-slate-400">
            İş verisi köprüsü kamp başladıktan sonra açılır.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {[
                { ad: "Görüşme", v: durum.toplam.gorusme },
                { ad: "Kayıt", v: durum.toplam.kayit },
                { ad: "Takip", v: durum.toplam.takip },
              ].map((k) => (
                <div key={k.ad} className="rounded-2xl border border-white/10 bg-midnight-card/50 p-3 text-center">
                  <div className="font-display text-2xl font-bold text-gold-light">{k.v}</div>
                  <div className="text-xs text-slate-400">{k.ad} · toplam</div>
                </div>
              ))}
            </div>

            <IsVerisiForm
              hafta={durum.buHafta}
              mevcut={
                buHaftaKayit
                  ? { gorusme: buHaftaKayit.gorusme, kayit: buHaftaKayit.kayit, takip: buHaftaKayit.takip }
                  : null
              }
            />

            {durum.satirlar.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-midnight-card/40 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Geçmiş haftalar</p>
                <ul className="space-y-1 text-sm text-slate-300">
                  {[...durum.satirlar].reverse().map((s) => (
                    <li key={s.hafta} className="flex justify-between">
                      <span>Hafta {s.hafta}</span>
                      <span className="font-mono text-slate-400">
                        {s.gorusme} görüşme · {s.kayit} kayıt · {s.takip} takip
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { eylulOzet, eylulKayitGetir, eylulAynasiAcikMi } from "@/lib/eylulAynasi";
import EylulAynasiForm from "./EylulAynasiForm";

export const metadata = { title: "Eylül Aynası — Liderlik Aynası" };
export const revalidate = 0;

// [5.2] EYLÜL AYNASI (mini-360) — 2 aylık yolculuğun özeti + tek cümle yansıma +
// 0-10 puan. eylul_kanit_modu bayrağı açık değilse "yakında" gösterir.
export default async function EylulAynasiPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const [acik, ozet, kayit] = await Promise.all([
    eylulAynasiAcikMi(db),
    eylulOzet(db, session.sub),
    eylulKayitGetir(db, session.sub),
  ]);

  const kartlar = [
    { ad: "Halka dilimi", v: `${ozet.halkaDolan}/40` },
    { ad: "Ara mühür", v: `${ozet.muhurTeyit}/3` },
    { ad: "Kıvılcım", v: ozet.kivilcim },
    { ad: "Cesur ret", v: ozet.redSayisi },
    { ad: "Görüşme", v: ozet.isToplam.gorusme },
    { ad: "Kayıt", v: ozet.isToplam.kayit },
  ];

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="sahne-giris mx-auto w-full max-w-md space-y-4 p-5">
        <header>
          <h1 className="font-display altin-metin text-2xl font-bold leading-tight">🪞 Eylül Aynası</h1>
          <p className="mt-1 text-sm text-slate-400">
            İki ay geçti. Kamptan çıkan sen ile bugünkü sen arasındaki mesafeye bak.
          </p>
        </header>

        <div className="grid grid-cols-3 gap-2">
          {kartlar.map((k) => (
            <div key={k.ad} className="rounded-2xl border border-white/10 bg-midnight-card/50 p-3 text-center">
              <div className="font-display text-xl font-bold text-gold-light">{k.v}</div>
              <div className="text-[11px] leading-tight text-slate-400">{k.ad}</div>
            </div>
          ))}
        </div>

        {acik ? (
          <EylulAynasiForm mevcut={kayit} />
        ) : (
          <p className="rounded-2xl border border-white/10 bg-midnight-card/50 p-5 text-center text-sm text-slate-400">
            Eylül Aynası kamp sonrası ~45. günde açılır. Yolculuğun sürüyor.
          </p>
        )}
      </div>
    </main>
  );
}

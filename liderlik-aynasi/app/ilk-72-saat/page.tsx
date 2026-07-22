import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ilk72Adimlar, taahhutlerGetir } from "@/lib/ilk72";
import IlkYetmisIki from "./IlkYetmisIki";

export const metadata = { title: "İlk 72 Saat — Liderlik Aynası" };
export const revalidate = 0;

// [E2] İLK 72 SAAT KARTI — söz sonrası salon içi. Oyun planından türetilmiş 3
// mikro adım; kişi her adıma kendi gün+saatini seçer; seçilen anda kişisel push.
export default async function Ilk72SaatPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const [adimlar, mevcut] = await Promise.all([
    ilk72Adimlar(db, session.sub),
    taahhutlerGetir(db, session.sub),
  ]);

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="sahne-giris mx-auto w-full max-w-md space-y-4 p-5">
        <header>
          <h1 className="font-display altin-metin text-2xl font-bold leading-tight">⏳ İlk 72 Saat</h1>
          <p className="mt-1 text-sm text-slate-400">
            Söz güzeldi. Şimdi onu sahaya indir: bu üç adımı NE ZAMAN yapacağını sen seç. Seçtiğin anda AYNA sana
            hatırlatacak.
          </p>
        </header>
        <IlkYetmisIki
          adimlar={adimlar}
          mevcut={mevcut.map((t) => ({ adim: t.adim, planlanan_zaman: t.planlanan_zaman, durum: t.durum }))}
        />
      </div>
    </main>
  );
}

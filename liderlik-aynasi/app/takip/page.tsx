import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { takipDurum, sozTakipAktif, haftalikSayilar } from "@/lib/sozTakip";
import { sozGetir } from "@/lib/soz";
import { hedefCekirdek } from "@/lib/hedef";
import { haftalikGorusmeKotasi } from "@/lib/oyunPlani";
import TakipAkis from "./TakipAkis";
import { tr } from "@/lib/i18n/tr";
import Link from "next/link";

export const metadata = { title: "90 Gün Yolun — Liderlik Aynası" };

// FAZ B — 90 gün takip. Söz mühürlendikten (durum 'sesli') sonra günlük check-in.
export default async function TakipSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const aktif = await sozTakipAktif(db, session.sub);
  if (!aktif) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
        <p className="text-5xl">🧭</p>
        <p className="mt-4 max-w-sm text-slate-300">{tr.takip.aciklama}</p>
        <Link href="/" className="mt-6 text-sm text-royal-light underline-offset-4 hover:underline">
          {tr.takip.anaSayfa}
        </Link>
      </main>
    );
  }

  const [durum, soz, hafta, hedef] = await Promise.all([
    takipDurum(db, session.sub),
    sozGetir(db, session.sub),
    haftalikSayilar(db, session.sub),
    hedefCekirdek(db, session.sub),
  ]);
  const kota = haftalikGorusmeKotasi(hedef?.plan?.haftalikSaat ?? null);

  // [Faz 6] "Bunu sen söyledin" — milestone anlarında kendi sesini (mühürlü
  // sözü) dinletmek için imzalı URL. Söz hiç kaydedilmemişse null.
  let sozSesUrl: string | null = null;
  if (soz?.voice_path) {
    const { data } = await db.storage.from("sesler").createSignedUrl(soz.voice_path, 3600);
    sozSesUrl = data?.signedUrl ?? null;
  }

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <TakipAkis
        durum={durum}
        aksiyonlar={soz?.aksiyonlar ?? []}
        hafta={hafta}
        kota={kota}
        sozSesUrl={sozSesUrl}
      />
    </main>
  );
}

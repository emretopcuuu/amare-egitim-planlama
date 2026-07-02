import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import OnboardingRayi from "@/components/OnboardingRayi";
import DegerlerAkis from "./DegerlerAkis";

export const metadata = { title: "Değerlerini Keşfet — Liderlik Aynası" };
export const dynamic = "force-dynamic";

// DEĞERLER ÇALIŞMASI — onboarding'de Pusula'dan (nedenler) hemen önce.
// Tamamlandıysa artık ANA SAYFAYA ATILMAZ — üst rail'den geri dönen kişi
// kendi 3 değerini + neden cümlesini gösteren bir özet ekranı görür.
export default async function DegerlerSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const { data } = await supabaseAdmin()
    .from("degerler_calismasi")
    .select("tamamlandi_at, secilen_uc, neden_cumlesi")
    .eq("participant_id", session.sub)
    .maybeSingle();

  if (data?.tamamlandi_at) {
    return (
      <main className="flex min-h-dvh flex-col overflow-y-auto">
        <div className="mx-auto w-full max-w-md pt-[calc(env(safe-area-inset-top,0px)+3.5rem+0.5rem)]">
          <OnboardingRayi />
        </div>
        <div className="mx-auto my-auto w-full max-w-md space-y-5 p-5 text-center">
          <p className="text-5xl" aria-hidden>💎</p>
          <h1 className="prizma-serif ay-metin text-2xl font-bold">Temel değerlerin</h1>
          {(data.secilen_uc as string[] | null)?.length ? (
            <div className="flex flex-wrap justify-center gap-2">
              {(data.secilen_uc as string[]).map((d) => (
                <span
                  key={d}
                  className="rounded-full bg-gold/15 px-4 py-1.5 text-sm font-semibold text-gold-light"
                >
                  {d}
                </span>
              ))}
            </div>
          ) : null}
          {data.neden_cumlesi && (
            <p className="prizma-serif ay-metin mx-auto max-w-sm text-base italic leading-relaxed text-gold-light/90">
              “{data.neden_cumlesi}”
            </p>
          )}
          <Link
            href="/"
            className="btn-kor mx-auto mt-4 flex h-12 w-full max-w-xs items-center justify-center rounded-2xl text-base font-bold"
          >
            ← Ana sayfaya dön
          </Link>
        </div>
      </main>
    );
  }

  return <DegerlerAkis ustRay={<OnboardingRayi />} />;
}

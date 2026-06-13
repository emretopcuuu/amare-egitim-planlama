import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import SozVer from "./SozVer";
import SozDurum from "./SozDurum";

export const metadata = { title: "Kapanış Sözün — Liderlik Aynası" };

const t = tr.kapanisSoz;

export default async function SozPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const [{ data: soz }, { data: ayar }] = await Promise.all([
    db
      .from("pledges")
      .select(
        "temmuz_kayit, agustos_gorusme, kayit_yapilan, gorusme_yapilan, voice_path"
      )
      .eq("participant_id", session.sub)
      .maybeSingle(),
    db.from("settings").select("value").eq("key", "kapanis_soz_acik").maybeSingle(),
  ]);

  const acik = ayar?.value === "true";

  let sesUrl: string | null = null;
  if (soz?.voice_path) {
    const { data } = await db.storage.from("sesler").createSignedUrl(soz.voice_path, 3600);
    sesUrl = data?.signedUrl ?? null;
  }

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="sahne-giris mx-auto my-auto w-full max-w-md space-y-5 p-5">
        <header className="text-center">
          <h1 className="prizma-serif ay-metin text-3xl font-semibold leading-tight">
            {t.baslik}
          </h1>
          <p className="mt-2 text-base leading-relaxed text-slate-300">{t.altBaslik}</p>
        </header>

        {soz ? (
          <SozDurum
            temmuz={soz.temmuz_kayit}
            agustos={soz.agustos_gorusme}
            kayitYapilan={soz.kayit_yapilan}
            gorusmeYapilan={soz.gorusme_yapilan}
            sesUrl={sesUrl}
          />
        ) : acik ? (
          <SozVer />
        ) : (
          <div className="kart-cam rounded-3xl p-8 text-center">
            <p className="text-5xl">🤝</p>
            <h2 className="prizma-serif ay-metin mt-4 text-2xl font-semibold">
              {t.kapaliBaslik}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-300">{t.kapaliMetin}</p>
          </div>
        )}

        <p className="pt-1 text-center">
          <Link
            href="/"
            className="text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
          >
            {t.geriDon}
          </Link>
        </p>
      </div>
    </main>
  );
}

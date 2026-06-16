import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { MINI360_IFADELER } from "@/lib/onFarkindalik";
import { tr } from "@/lib/i18n/tr";
import Mini360Oz from "./Mini360Oz";

export const metadata = { title: "Ekip Aynası — Liderlik Aynası" };

const t = tr.mini360;

export default async function Mini360Sayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const [{ data: ayar }, { data: oz }, { data: dis }] = await Promise.all([
    db.from("settings").select("value").eq("key", "mini360_acik").maybeSingle(),
    db.from("mini360_oz").select("m1, m2, m3, m4, m5, m6").eq("participant_id", session.sub).maybeSingle(),
    db.from("mini360_dis").select("m1, m2, m3, m4, m5, m6").eq("target_id", session.sub),
  ]);

  if (ayar?.value !== "true") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <div className="kart-cam max-w-md rounded-3xl p-10">
          <p className="text-5xl" aria-hidden>🪞</p>
          <h1 className="prizma-serif ay-metin mt-4 text-2xl font-semibold">{t.kapaliBaslik}</h1>
          <p className="mt-3 text-base leading-relaxed text-slate-300">{t.kapaliMetin}</p>
        </div>
      </main>
    );
  }

  // Ekip ortalaması (anonim dış puanlar) + fark.
  const disSayi = (dis ?? []).length;
  const ekipOrt: Record<string, number | null> = {};
  for (const i of MINI360_IFADELER) {
    const vals = (dis ?? []).map((d) => d[i.kod]).filter((v): v is number => v !== null);
    ekipOrt[i.kod] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  }

  const ozBaslangic: Record<string, number> = {};
  if (oz) for (const i of MINI360_IFADELER) if (oz[i.kod] !== null) ozBaslangic[i.kod] = oz[i.kod] as number;

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-5 p-5">
      <Mini360Oz
        hedefId={session.sub}
        ozBaslangic={ozBaslangic}
        ekipOrt={ekipOrt}
        disSayi={disSayi}
      />
    </main>
  );
}

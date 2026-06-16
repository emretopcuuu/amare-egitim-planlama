import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sonucOnerileri } from "@/lib/onFarkindalik";
import { tr } from "@/lib/i18n/tr";
import OnFarkindalikAkis from "./OnFarkindalikAkis";

export const metadata = { title: "Ön Farkındalık — Liderlik Aynası" };

const t = tr.onFarkindalik;

// ÖN FARKINDALIK — Faz A (Katman 1). Bayrak (on_farkindalik_acik) kapalıyken
// kibarca "yakında" der; canlı kampı/akışı etkilemez.
export default async function OnFarkindalikSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/");

  const db = supabaseAdmin();
  const [{ data: ayar }, { data: yanitVeri }] = await Promise.all([
    db.from("settings").select("value").eq("key", "on_farkindalik_acik").maybeSingle(),
    db
      .from("on_farkindalik_yanit")
      .select("madde_kod, deger_sayi, deger_metin")
      .eq("participant_id", session.sub),
  ]);

  if (ayar?.value !== "true") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <div className="kart-cam max-w-md rounded-3xl p-10">
          <p className="text-5xl" aria-hidden>
            🪞
          </p>
          <h1 className="prizma-serif ay-metin mt-4 text-2xl font-semibold">{t.kapaliBaslik}</h1>
          <p className="mt-3 text-base leading-relaxed text-slate-300">{t.kapaliMetin}</p>
        </div>
      </main>
    );
  }

  const sayilar: Record<string, number> = {};
  const metinler: Record<string, string> = {};
  for (const r of yanitVeri ?? []) {
    if (r.deger_sayi !== null) sayilar[r.madde_kod] = r.deger_sayi;
    if (r.deger_metin !== null) metinler[r.madde_kod] = r.deger_metin;
  }

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="mx-auto my-auto w-full max-w-md p-5">
        <OnFarkindalikAkis
          baslangicSayi={sayilar}
          baslangicMetin={metinler}
          oneri={sonucOnerileri(sayilar)}
        />
      </div>
    </main>
  );
}

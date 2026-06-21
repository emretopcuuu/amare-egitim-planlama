import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sozGetir, taniklar, bekleyenImzalar, sozV2KapisiAcik } from "@/lib/soz";
import { tr } from "@/lib/i18n/tr";
import SozV2Akis from "./SozV2Akis";

export const metadata = { title: "Sözün — Liderlik Aynası" };

// FAZ A — Söz v2 (kapanış). AI şekillendirir → kişi düzenler → kendi sesiyle
// okur/kaydeder → 5 lider şahit imzalar. soz_v2_acik açıkken erişilir.
export default async function SozumSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const acik = await sozV2KapisiAcik(db);

  if (!acik) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
        <p className="text-5xl">📜</p>
        <p className="mt-4 max-w-sm text-slate-300">{tr.sozV2.kapali}</p>
        <Link href="/" className="mt-6 text-sm text-royal-light underline-offset-4 hover:underline">
          {tr.degerlendir.anaSayfayaDon}
        </Link>
      </main>
    );
  }

  const [soz, tanikList, bekleyen, { data: liderler }] = await Promise.all([
    sozGetir(db, session.sub),
    taniklar(db, session.sub),
    bekleyenImzalar(db, session.sub),
    db
      .from("participants")
      .select("id, full_name, team")
      .eq("role", "participant")
      .neq("id", session.sub)
      .order("full_name"),
  ]);

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <SozV2Akis
        soz={soz}
        taniklar={tanikList}
        bekleyenImzalar={bekleyen}
        liderler={(liderler ?? []).map((l) => ({ id: l.id, ad: l.full_name, takim: l.team }))}
      />
    </main>
  );
}

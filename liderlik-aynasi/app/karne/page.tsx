import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { buHaftaAnahtari } from "@/lib/pazarKarnesi";
import GeriButonu from "@/components/GeriButonu";
import KarneForm from "./KarneForm";

export const metadata = { title: "Pazar Karnesi — Liderlik Aynası" };

// P10 Pazar Karnesi sayfası: bu haftanın 3 sayısı. Kaydedilince kamp arkadaşına
// tanıklık raporu gider.
export default async function KarnePage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const hafta = buHaftaAnahtari(new Date());
  const { data: mevcut } = await db
    .from("pazar_karnesi")
    .select("davet, gorusme, takip")
    .eq("participant_id", session.sub)
    .eq("hafta", hafta)
    .maybeSingle();

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="sahne-giris mx-auto my-auto w-full max-w-md space-y-5 p-5">
        <GeriButonu />
        <header className="text-center">
          <h1 className="prizma-serif ay-metin text-3xl font-semibold leading-tight">
            📊 Pazar Karnesi
          </h1>
          <p className="mt-2 text-base leading-relaxed text-slate-300">
            Bu haftanın üç sayısı. Hedef ilham verir ama davranışı sayı yönetir —
            ve sözün bir tanığı olduğunda tutulma ihtimali katlanır.
          </p>
        </header>

        <KarneForm mevcut={mevcut ?? null} />

        <Link href="/protokol" className="block text-center text-sm text-slate-400 hover:text-gold-light">
          ← Protokole dön
        </Link>
      </div>
    </main>
  );
}

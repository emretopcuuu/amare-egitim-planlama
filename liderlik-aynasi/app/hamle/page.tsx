import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { hamleAcikMi, hamleDurumu } from "@/lib/hamle";
import HamleAkis from "./HamleAkis";

export const metadata = { title: "Hamle Sırası — Liderlik Aynası" };
export const dynamic = "force-dynamic";

// G6 — Hamle Sırası: karşılıklılık + kilitli reveal.
export default async function HamlePage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  if (!(await hamleAcikMi(db))) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
        <p className="text-5xl">♟</p>
        <h1 className="prizma-serif ay-metin mt-4 text-2xl font-semibold">Hamle Sırası yakında</h1>
        <p className="mt-2 max-w-sm text-slate-400">Kampta bir arkadaşınla karşılıklı görevlerde sıra sende olacak.</p>
        <Link href="/" className="mt-6 text-sm text-royal-light underline-offset-4 hover:underline">Ana sayfaya dön</Link>
      </main>
    );
  }

  const hamleler = await hamleDurumu(db, session.sub);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-5">
      <header className="flex items-center justify-between">
        <h1 className="font-display altin-metin text-2xl font-bold">♟ Hamle Sırası</h1>
        <Link href="/" className="text-sm text-slate-400 hover:text-gold-light">✕</Link>
      </header>
      <HamleAkis hamleler={hamleler} />
    </main>
  );
}

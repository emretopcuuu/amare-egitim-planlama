import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { rekorlarAcikMi, kampKursusu, kisiselRekorlar } from "@/lib/rekorlar";
import RekorGorunum from "./RekorGorunum";

export const metadata = { title: "Rekorlar — Liderlik Aynası" };
export const dynamic = "force-dynamic";

// G3 — Rekorlar: kişisel bestler + kamp kürsüsü (12 kategori).
export default async function RekorlarPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  if (!(await rekorlarAcikMi(db))) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
        <p className="text-5xl">🏆</p>
        <h1 className="prizma-serif ay-metin mt-4 text-2xl font-semibold">Rekorlar yakında</h1>
        <p className="mt-2 max-w-sm text-slate-400">Kamp başlayınca 12 kategoride yarışırsın — herkes bir şeyde birinci olabilir.</p>
        <Link href="/" className="mt-6 text-sm text-royal-light underline-offset-4 hover:underline">Ana sayfaya dön</Link>
      </main>
    );
  }

  const [kursu, kisisel] = await Promise.all([kampKursusu(db), kisiselRekorlar(db, session.sub)]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-5">
      <header className="flex items-center justify-between">
        <h1 className="font-display altin-metin text-2xl font-bold">🏆 Rekorlar</h1>
        <Link href="/" className="text-sm text-slate-400 hover:text-gold-light">✕</Link>
      </header>
      <RekorGorunum kursu={kursu} kisisel={kisisel} />
    </main>
  );
}

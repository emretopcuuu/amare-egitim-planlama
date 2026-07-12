import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { fisiltiAcikMi, gunlukHak, gelenFisiltilar } from "@/lib/fisilti";
import FisiltiGonder from "./FisiltiGonder";
import FisiltiKutu from "./FisiltiKutu";

export const metadata = { title: "Fısıltı — Liderlik Aynası" };
export const dynamic = "force-dynamic";

// G5 — Fısıltı Postası: kilitli sesli takdir + tahmin oyunu.
export default async function FisiltiPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  if (!(await fisiltiAcikMi(db))) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
        <p className="text-5xl">🔒</p>
        <h1 className="prizma-serif ay-metin mt-4 text-2xl font-semibold">Fısıltı yakında</h1>
        <p className="mt-2 max-w-sm text-slate-400">Kamp başlayınca birine sesli, gizli bir söz bırakabileceksin.</p>
        <Link href="/" className="mt-6 text-sm text-royal-light underline-offset-4 hover:underline">Ana sayfaya dön</Link>
      </main>
    );
  }

  const [hak, { data: kisiler }, gelenler] = await Promise.all([
    gunlukHak(db, session.sub),
    db.from("participants").select("id, full_name").eq("role", "participant").neq("id", session.sub).order("full_name"),
    gelenFisiltilar(db, session.sub),
  ]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 p-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display altin-metin text-2xl font-bold">🔒 Fısıltı</h1>
          <p className="text-xs text-slate-500">Bugün {hak.kalan}/{hak.hak} fısıltı hakkın var.</p>
        </div>
        <Link href="/" className="text-sm text-slate-400 hover:text-gold-light">✕</Link>
      </header>

      <FisiltiGonder kalan={hak.kalan} kisiler={(kisiler ?? []).map((k) => ({ id: k.id, ad: k.full_name }))} />
      <FisiltiKutu gelenler={gelenler} />
    </main>
  );
}

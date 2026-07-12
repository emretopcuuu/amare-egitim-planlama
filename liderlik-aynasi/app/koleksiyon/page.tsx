import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { koleksiyon } from "@/lib/sandik";

export const metadata = { title: "Koleksiyon — Liderlik Aynası" };
export const dynamic = "force-dynamic";

// G2 — sandıklardan çıkan koleksiyon (Ayna Kartları, nadir rozetler, altın anlar).
export default async function KoleksiyonPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const kartlar = await koleksiyon(db, session.sub);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-5">
      <header className="flex items-center justify-between">
        <h1 className="font-display altin-metin text-2xl font-bold">🃏 Koleksiyonun</h1>
        <Link href="/" className="text-sm text-slate-400 hover:text-gold-light">
          ✕
        </Link>
      </header>

      {kartlar.length === 0 ? (
        <div className="rounded-2xl border border-royal/25 bg-midnight-card/40 p-8 text-center">
          <p className="text-4xl">🎁</p>
          <p className="mt-3 text-slate-300">Henüz koleksiyon kartın yok.</p>
          <p className="mt-1 text-sm text-slate-500">Gizemli sandıklardan Ayna Kartı ve nadir rozet çıkar.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {kartlar.map((k, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-4 ${
                k.tur === "altin" ? "border-gold bg-gold/[0.08]" : "border-royal/30 bg-midnight-card/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden>
                  {k.ikon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gold-light">{k.baslik}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-300">{k.metin}</p>
                  <p className="mt-1 text-[0.65rem] text-slate-500">
                    {new Date(k.at).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

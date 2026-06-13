import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import FotoYukle from "./FotoYukle";

export const metadata = { title: "Anı Duvarı — Liderlik Aynası" };

const t = tr.duvar;

export default async function DuvarPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const kova = db.storage.from("sesler");

  const [{ data: onayli }, { data: benimkiler }] = await Promise.all([
    db
      .from("photos")
      .select("id, path, caption")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(60),
    db
      .from("photos")
      .select("id, path, caption, status")
      .eq("participant_id", session.sub)
      .order("created_at", { ascending: false }),
  ]);

  async function imzala(yol: string): Promise<string | null> {
    const { data } = await kova.createSignedUrl(yol, 3600);
    return data?.signedUrl ?? null;
  }

  const duvar = await Promise.all(
    (onayli ?? []).map(async (f) => ({
      id: f.id,
      url: await imzala(f.path),
      caption: f.caption,
    }))
  );
  const benim = await Promise.all(
    (benimkiler ?? []).map(async (f) => ({
      id: f.id,
      url: await imzala(f.path),
      status: f.status,
    }))
  );

  const durumYazi: Record<string, string> = {
    pending: t.beklemede,
    approved: t.onaylandi,
    hidden: t.gizlendi,
  };

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="mx-auto my-auto w-full max-w-md space-y-5 p-5">
        <header className="text-center">
          <h1 className="prizma-serif ay-metin text-3xl font-semibold leading-tight">
            {t.baslik}
          </h1>
          <p className="mt-2 text-base leading-relaxed text-slate-300">{t.altBaslik}</p>
        </header>

        <FotoYukle />

        {benim.length > 0 && (
          <section className="kart-cam rounded-3xl p-5">
            <h2 className="font-semibold text-gold-light">{t.seninkilerBaslik}</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {benim.map((f) => (
                <div key={f.id} className="relative">
                  {f.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.url}
                      alt=""
                      className="aspect-square w-full rounded-xl object-cover"
                    />
                  )}
                  <span className="absolute inset-x-0 bottom-0 rounded-b-xl bg-black/60 px-1 py-0.5 text-center text-[0.6rem] text-slate-200">
                    {durumYazi[f.status] ?? f.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="kart-cam rounded-3xl p-5">
          <h2 className="font-semibold text-gold-light">{t.duvarBaslik}</h2>
          {duvar.length === 0 ? (
            <p className="mt-3 text-base leading-relaxed text-slate-300">{t.bosDuvar}</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {duvar.map(
                (f) =>
                  f.url && (
                    <figure key={f.id} className="overflow-hidden rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.url} alt="" className="aspect-square w-full object-cover" />
                      {f.caption && (
                        <figcaption className="bg-black/40 px-2 py-1 text-xs text-slate-200">
                          {f.caption}
                        </figcaption>
                      )}
                    </figure>
                  )
              )}
            </div>
          )}
        </section>

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

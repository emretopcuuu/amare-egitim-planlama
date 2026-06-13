import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import TakdirGonder from "./TakdirGonder";

export const metadata = { title: "Takdir Duvarı — Liderlik Aynası" };

const t = tr.takdir;

export default async function TakdirPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const [{ data: kisiler }, { data: gelenler }] = await Promise.all([
    db
      .from("participants")
      .select("id, full_name, team")
      .eq("role", "participant")
      .neq("id", session.sub)
      .order("full_name"),
    db
      .from("kudos")
      .select("id, message, created_at, gonderen:participants!kudos_from_id_fkey(full_name)")
      .eq("to_id", session.sub)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="mx-auto my-auto w-full max-w-md space-y-5 p-5">
        <header className="text-center">
          <h1 className="prizma-serif ay-metin text-3xl font-semibold leading-tight">
            {t.baslik}
          </h1>
          <p className="mt-2 text-base leading-relaxed text-slate-300">{t.altBaslik}</p>
        </header>

        <TakdirGonder
          kisiler={(kisiler ?? []).map((k) => ({
            id: k.id,
            ad: k.full_name,
            takim: k.team,
          }))}
        />

        <section className="kart-cam rounded-3xl p-5">
          <h2 className="font-semibold text-gold-light">{t.gelenlerBaslik}</h2>
          {(gelenler ?? []).length === 0 ? (
            <p className="mt-3 text-base leading-relaxed text-slate-300">{t.gelenYok}</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {(gelenler ?? []).map((g) => (
                <li key={g.id} className="rounded-2xl bg-white/[0.04] p-4">
                  <p className="text-base leading-relaxed text-slate-100">
                    “{g.message}”
                  </p>
                  <p className="mt-2 text-sm font-semibold text-gold-light">
                    {t.kimden(g.gonderen?.full_name ?? "Bir arkadaşın")}
                  </p>
                </li>
              ))}
            </ul>
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

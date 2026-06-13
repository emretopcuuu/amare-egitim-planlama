import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import BosDurum from "@/components/BosDurum";
import OrtakSohbet from "./OrtakSohbet";

export const metadata = { title: "Ortağın — Liderlik Aynası" };

const t = tr.ortak;

export default async function OrtakPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const { data: ikili } = await db
    .from("pairs")
    .select("id, a_id, b_id")
    .or(`a_id.eq.${session.sub},b_id.eq.${session.sub}`)
    .maybeSingle();

  let ortakAd: string | null = null;
  let mesajlar: { id: string; benim: boolean; mesaj: string }[] = [];
  if (ikili) {
    const ortakId = ikili.a_id === session.sub ? ikili.b_id : ikili.a_id;
    const [{ data: ortak }, { data: ham }] = await Promise.all([
      db.from("participants").select("full_name").eq("id", ortakId).maybeSingle(),
      db
        .from("pair_messages")
        .select("id, from_id, message")
        .eq("pair_id", ikili.id)
        .order("created_at", { ascending: true }),
    ]);
    ortakAd = ortak?.full_name ?? null;
    mesajlar = (ham ?? []).map((m) => ({
      id: m.id,
      benim: m.from_id === session.sub,
      mesaj: m.message,
    }));
  }

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="sahne-giris mx-auto my-auto w-full max-w-md space-y-5 p-5">
        <header className="text-center">
          <h1 className="prizma-serif ay-metin text-3xl font-semibold leading-tight">
            {t.baslik}
          </h1>
          <p className="mt-2 text-base leading-relaxed text-slate-300">{t.altBaslik}</p>
        </header>

        {!ikili || !ortakAd ? (
          <BosDurum simge="🧭" baslik={t.eslesmeYokBaslik} metin={t.eslesmeYokMetin} />
        ) : (
          <>
            <div className="kart-cam rounded-3xl p-5 text-center">
              <p className="text-sm uppercase tracking-wide text-slate-400">
                {t.ortaginEtiket}
              </p>
              <p className="prizma-serif ay-metin mt-1 text-2xl font-semibold">{ortakAd}</p>
            </div>

            <div className="kart-cam rounded-3xl p-5">
              {mesajlar.length === 0 ? (
                <p className="text-base leading-relaxed text-slate-300">{t.bosSohbet}</p>
              ) : (
                <ul className="space-y-2">
                  {mesajlar.map((m) => (
                    <li
                      key={m.id}
                      className={`max-w-[85%] rounded-2xl px-4 py-2 text-base ${
                        m.benim
                          ? "ml-auto bg-gold/20 text-slate-100"
                          : "mr-auto bg-white/[0.06] text-slate-100"
                      }`}
                    >
                      {m.mesaj}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4">
                <OrtakSohbet />
              </div>
            </div>
          </>
        )}

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

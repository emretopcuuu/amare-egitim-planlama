import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";

export const metadata = { title: "Program — Liderlik Aynası" };

const t = tr.program;

function saatYaz(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// Gizemli program: geçmiş ve açıklanmış maddeler görünür; gelecektekiler
// kilitli karttır — yalnızca AYNA'nın ipucusu ve açıklanma saati görünür.
export default async function ProgramPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const { data: maddeler, error } = await supabaseAdmin()
    .from("schedule_items")
    .select("id, starts_at, title, location, teaser, reveal_minutes")
    .order("starts_at");
  if (error) throw error;

  // Sunucu bileşeni her istekte çalışır; "şimdi" istek anıdır — bilinçli istisna.
  // eslint-disable-next-line react-hooks/purity
  const simdi = Date.now();

  return (
    <main className="mx-auto w-full max-w-lg flex-1 space-y-6 p-6">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-royal-light">
            🤖 AYNA
          </p>
          <h1 className="font-display altin-metin mt-1 text-2xl font-bold text-gold">{t.baslik}</h1>
          <p className="mt-1 text-sm text-slate-400">{t.altBaslik}</p>
        </div>
        <Link
          href="/"
          className="shrink-0 text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
        >
          {tr.degerlendir.anaSayfayaDon}
        </Link>
      </header>

      {(maddeler ?? []).length === 0 ? (
        <p className="text-center text-sm text-slate-400">{t.bos}</p>
      ) : (
        <ol className="relative space-y-4 border-l border-royal/40 pl-5">
          {(maddeler ?? []).map((m) => {
            const baslama = new Date(m.starts_at).getTime();
            const acilma = baslama - m.reveal_minutes * 60_000;
            const acik = simdi >= acilma;
            const gecmis = simdi > baslama;
            return (
              <li key={m.id} className="relative">
                <span
                  className={`absolute -left-[26px] top-1.5 h-3 w-3 rounded-full ${
                    gecmis ? "bg-slate-600" : acik ? "bg-gold" : "bg-royal/60"
                  }`}
                />
                {acik ? (
                  <div className={gecmis ? "opacity-60" : ""}>
                    <p className="text-xs font-medium text-royal-light">
                      {saatYaz(m.starts_at)}
                      {gecmis && ` · ${t.gecmis}`}
                    </p>
                    <p className="mt-0.5 font-semibold text-slate-100">{m.title}</p>
                    {m.location && (
                      <p className="text-sm text-slate-400">📍 {m.location}</p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-royal-light/30 bg-midnight-card/40 p-3">
                    <p className="text-xs font-medium text-royal-light">
                      {saatYaz(m.starts_at)}
                    </p>
                    <p className="mt-0.5 font-bold tracking-widest text-slate-500">
                      🔒 {t.kilitli}
                    </p>
                    {m.teaser && (
                      <p className="mt-1 text-sm italic text-slate-400">“{m.teaser}”</p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      {t.acilma(
                        new Intl.DateTimeFormat("tr-TR", {
                          timeZone: "Europe/Istanbul",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(acilma))
                      )}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}

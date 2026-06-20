import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import BosDurum from "@/components/BosDurum";
import SicakAdim from "@/components/SicakAdim";
import GeriButonu from "@/components/GeriButonu";

export const metadata = { title: "Takım Turnuvası — Liderlik Aynası" };

const t = tr.turnuva;
const MADALYA = ["🥇", "🥈", "🥉"];

// Takım turnuvası — katılımcının kendi telefonunda canlı sıralama. Kıvılcım
// (puanlanmış görevlerin spark_points'i) kişi → takım toplanır.
export default async function TurnuvaPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const [{ data: kisiler }, { data: gorevler }] = await Promise.all([
    db.from("participants").select("id, team").eq("role", "participant"),
    db.from("missions").select("participant_id, spark_points").eq("status", "scored"),
  ]);

  const kisiKivilcim = new Map<string, number>();
  for (const g of gorevler ?? []) {
    kisiKivilcim.set(
      g.participant_id,
      (kisiKivilcim.get(g.participant_id) ?? 0) + g.spark_points
    );
  }

  const benimTakim = (kisiler ?? []).find((k) => k.id === session.sub)?.team ?? null;
  const benimKatki = kisiKivilcim.get(session.sub) ?? 0;

  const takimToplam = new Map<string, number>();
  for (const k of kisiler ?? []) {
    if (!k.team) continue;
    takimToplam.set(k.team, (takimToplam.get(k.team) ?? 0) + (kisiKivilcim.get(k.id) ?? 0));
  }
  const siralama = [...takimToplam.entries()]
    .map(([takim, kivilcim]) => ({ takim, kivilcim }))
    .sort((a, b) => b.kivilcim - a.kivilcim);
  const enYuksek = siralama[0]?.kivilcim ?? 1;
  const toplamVar = siralama.some((s) => s.kivilcim > 0);

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="sahne-giris mx-auto my-auto w-full max-w-md space-y-5 p-5">
        <GeriButonu />
        <header className="text-center">
          <h1 className="prizma-serif ay-metin text-3xl font-semibold leading-tight">
            {t.baslik}
          </h1>
          <p className="mt-2 text-base leading-relaxed text-slate-300">{t.altBaslik}</p>
        </header>

        {/* Senin takımın özeti */}
        <div className="kart-cam rounded-3xl p-5 text-center">
          {benimTakim ? (
            <>
              <p className="text-sm uppercase tracking-wide text-slate-400">
                {t.seninTakimin}
              </p>
              <p className="prizma-serif ay-metin mt-1 text-2xl font-semibold">
                {benimTakim}
              </p>
              <p className="mt-2 text-base font-semibold text-gold-light">
                {t.katkin(benimKatki)}
              </p>
            </>
          ) : (
            <p className="text-base text-slate-300">{t.takimsiz}</p>
          )}
        </div>

        {!toplamVar ? (
          <BosDurum
            simge="🏁"
            baslik={t.bosBaslik}
            metin={t.bosMetin}
            eylem={<SicakAdim href="/" etiket={tr.anaSayfa.sicakAnaSayfa} />}
          />
        ) : (
          <ul className="space-y-3">
            {siralama.map((s, i) => {
              const benim = s.takim === benimTakim;
              return (
                <li
                  key={s.takim}
                  className={`rounded-2xl p-4 ${
                    benim
                      ? "parilti kart-cam ring-2 ring-gold/70"
                      : "kart-cam"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-lg font-bold text-slate-100">
                      <span className="w-7 text-center">
                        {MADALYA[i] ?? `${i + 1}.`}
                      </span>
                      {s.takim}
                    </span>
                    <span className="shrink-0 font-mono text-lg font-bold text-gold">
                      {t.kivilcim(s.kivilcim)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-midnight-soft">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold"
                      style={{ width: `${Math.max(4, (s.kivilcim / enYuksek) * 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

      </div>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  KAMP_GUNLERI,
  KAMP_BASLIK,
  ETKINLIK_SIMGESI,
  gunProgrami,
  dakikaCevir,
} from "@/lib/kampProgrami";
import { tr } from "@/lib/i18n/tr";
import GeriButonu from "@/components/GeriButonu";

export const metadata = { title: "Program — Liderlik Aynası" };

const t = tr.program;

function gunEtiketi(tarih: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${tarih}T12:00:00+03:00`));
}

function saatYaz(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// Tam kamp programı (lib/kampProgrami.ts) + admin'in eklediği sürpriz
// duyurular (schedule_items) tek akışta. Sürprizler açıklanana dek kilitli
// kart olarak görünür — programın kendisi ise baştan sona açıktır.
export default async function ProgramPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const { data: surprizler, error } = await supabaseAdmin()
    .from("schedule_items")
    .select("id, starts_at, title, location, teaser, reveal_minutes")
    .order("starts_at");
  if (error) throw error;

  // Sunucu bileşeni her istekte çalışır; "şimdi" istek anıdır.
  const simdi = new Date();
  const bugun = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
  }).format(simdi);
  const parcalar = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(simdi);
  const al = (tip: string) =>
    Number(parcalar.find((p) => p.type === tip)?.value ?? 0);
  const suankiDk = al("hour") * 60 + al("minute");

  // Sürprizleri Istanbul gününe göre kova(la): kamp günlerine karışır,
  // kamp dışı tarihler en altta kendi başlığıyla listelenir.
  const surprizKovalari = new Map<string, NonNullable<typeof surprizler>>();
  for (const s of surprizler ?? []) {
    const tarih = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Istanbul",
    }).format(new Date(s.starts_at));
    const kova = surprizKovalari.get(tarih) ?? [];
    kova.push(s);
    surprizKovalari.set(tarih, kova);
  }
  const digerTarihler = [...surprizKovalari.keys()]
    .filter((tarih) => !(KAMP_GUNLERI as readonly string[]).includes(tarih))
    .sort();

  function SurprizKart({
    s,
  }: {
    s: NonNullable<typeof surprizler>[number];
  }) {
    const baslama = new Date(s.starts_at).getTime();
    const acilma = baslama - s.reveal_minutes * 60_000;
    const acik = simdi.getTime() >= acilma;
    const gecmis = simdi.getTime() > baslama;
    if (acik) {
      return (
        <li
          className={`kart-cam flex items-start gap-3 rounded-2xl p-4 ${gecmis ? "opacity-50" : ""}`}
        >
          <span className="text-2xl">✨</span>
          <div className="min-w-0">
            <p className="text-base font-bold text-gold-light">
              {saatYaz(s.starts_at)}
              {gecmis && ` · ${t.gecmis}`}
            </p>
            <p className="mt-0.5 text-lg font-semibold leading-snug text-slate-100">
              {s.title}
            </p>
            {s.location && (
              <p className="mt-0.5 text-base text-slate-400">📍 {s.location}</p>
            )}
          </div>
        </li>
      );
    }
    return (
      <li className="rounded-2xl border border-dashed border-royal-light/30 bg-midnight-card/40 p-4">
        <p className="text-base font-bold text-royal-light">{saatYaz(s.starts_at)}</p>
        <p className="mt-0.5 text-lg font-bold tracking-widest text-slate-500">
          🔒 {t.kilitli}
        </p>
        {s.teaser && (
          <p className="mt-1 text-base italic text-slate-400">“{s.teaser}”</p>
        )}
        <p className="mt-1 text-sm text-slate-500">
          {t.acilma(
            new Intl.DateTimeFormat("tr-TR", {
              timeZone: "Europe/Istanbul",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(acilma))
          )}
        </p>
      </li>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="sahne-giris mx-auto my-auto w-full max-w-md space-y-8 p-5">
      <GeriButonu />
      <header>
        <p className="text-sm font-medium uppercase tracking-widest text-royal-light">
          {KAMP_BASLIK}
        </p>
        <h1 className="font-display altin-metin mt-1 text-3xl font-bold text-gold">
          {t.baslik}
        </h1>
        <p className="mt-1 text-base text-slate-400">{t.altBaslik}</p>
      </header>

      {KAMP_GUNLERI.map((tarih, i) => {
        const gun = (i + 1) as 1 | 2 | 3;
        const maddeler = gunProgrami(gun);
        const gunBugun = tarih === bugun;
        const gunGecti = tarih < bugun;
        return (
          <section key={tarih}>
            <h2
              className={`text-lg font-bold uppercase tracking-widest ${
                gunBugun ? "text-gold" : "text-royal-light"
              }`}
            >
              {t.gunBaslik(gun, gunEtiketi(tarih))}
            </h2>
            <ul className="mt-3 space-y-2.5">
              {maddeler.map((m) => {
                const basDk = dakikaCevir(m.baslangic);
                const bitDk = dakikaCevir(m.bitis);
                const suAn = gunBugun && suankiDk >= basDk && suankiDk < bitDk;
                const gecmis =
                  gunGecti || (gunBugun && suankiDk >= bitDk);
                return (
                  <li
                    key={`${m.gun}-${m.baslangic}`}
                    className={`flex items-start gap-3 rounded-2xl p-4 ${
                      suAn
                        ? "parilti kart-cam ring-2 ring-gold/70"
                        : "kart-cam"
                    } ${gecmis ? "opacity-50" : ""}`}
                  >
                    <span className="text-2xl">{ETKINLIK_SIMGESI[m.tur]}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-base font-bold ${
                            suAn ? "text-gold" : "text-royal-light"
                          }`}
                        >
                          {m.baslangic} – {m.bitis}
                        </p>
                        {suAn && (
                          <span className="altin-nabiz rounded-full bg-gold px-3 py-0.5 text-xs font-black text-[#1a1206]">
                            {t.suAn}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-lg font-semibold leading-snug text-slate-100">
                        {m.baslik}
                      </p>
                      {m.konusmaci && (
                        <p className="mt-0.5 text-base text-slate-400">
                          🎙 {m.konusmaci}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
              {(surprizKovalari.get(tarih) ?? []).map((s) => (
                <SurprizKart key={s.id} s={s} />
              ))}
            </ul>
          </section>
        );
      })}

      {digerTarihler.map((tarih) => (
        <section key={tarih}>
          <h2 className="text-lg font-bold uppercase tracking-widest text-royal-light">
            {gunEtiketi(tarih)}
          </h2>
          <ul className="mt-3 space-y-2.5">
            {(surprizKovalari.get(tarih) ?? []).map((s) => (
              <SurprizKart key={s.id} s={s} />
            ))}
          </ul>
        </section>
      ))}
      </div>
    </main>
  );
}

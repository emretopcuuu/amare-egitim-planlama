import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import SesCal from "@/components/SesCal";
import BosDurum from "@/components/BosDurum";

export const metadata = { title: "Anların — Liderlik Aynası" };

const t = tr.anlar;

type An = {
  anahtar: string;
  simge: string;
  baslik: string;
  aciklama: string;
  tip: "ses" | "video";
  url: string;
  // sıralama: önce kalıcı kilometre taşları (büyük sira), sonra tarihli anlar
  sira: number;
  zaman: number; // ms; tarihsizler için 0
  zamanYazi: string | null;
};

function tarihYaz(iso: string, saatli: boolean): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    ...(saatli ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(iso));
}

// KAÇIRILAN ANLAR ZAMAN TÜNELİ — bildirim captive-portal'da ölse bile kişi
// yansımasından gelen her sesi/görüntüyü istediği zaman burada bulur ve dinler.
export default async function AnlarPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const kova = db.storage.from("sesler");
  const sub = session.sub;

  const [{ data: profil }, { data: mektup }, { data: kayma }, { data: fiero }] =
    await Promise.all([
      db
        .from("voice_profiles")
        .select("morning_date, night_date, video_status, video_path, soz_path")
        .eq("participant_id", sub)
        .maybeSingle(),
      db
        .from("mirror_letters")
        .select("voice_path")
        .eq("participant_id", sub)
        .maybeSingle(),
      db
        .from("churn_radar")
        .select("voice_path, nudged_at")
        .eq("participant_id", sub)
        .maybeSingle(),
      db
        .from("missions")
        .select("scored_at")
        .eq("participant_id", sub)
        .eq("ai_score", 10)
        .order("scored_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  async function imzala(yol: string): Promise<string | null> {
    const { data } = await kova.createSignedUrl(yol, 3600);
    return data?.signedUrl ?? null;
  }

  const anlar: An[] = [];

  // Kalıcı kilometre taşları (sira yüksek → en üstte)
  if (profil?.video_status === "hazir" && profil.video_path) {
    const url = await imzala(profil.video_path);
    if (url)
      anlar.push({
        anahtar: "video",
        simge: "👁",
        baslik: t.yansima,
        aciklama: t.yansimaAlt,
        tip: "video",
        url,
        sira: 100,
        zaman: 0,
        zamanYazi: null,
      });
  }
  if (mektup?.voice_path) {
    const url = await imzala(mektup.voice_path);
    if (url)
      anlar.push({
        anahtar: "mektup",
        simge: "💌",
        baslik: t.mektup,
        aciklama: t.mektupAlt,
        tip: "ses",
        url,
        sira: 90,
        zaman: 0,
        zamanYazi: null,
      });
  }
  if (profil?.soz_path) {
    const url = await imzala(profil.soz_path);
    if (url)
      anlar.push({
        anahtar: "soz",
        simge: "🤝",
        baslik: t.soz,
        aciklama: t.sozAlt,
        tip: "ses",
        url,
        sira: 80,
        zaman: 0,
        zamanYazi: null,
      });
  }

  // Tarihli anlar (sira 0 → tarihe göre sıralanır)
  if (fiero?.scored_at) {
    const url = await imzala(`${sub}/fiero.mp3`);
    if (url)
      anlar.push({
        anahtar: "fiero",
        simge: "🏆",
        baslik: t.fiero,
        aciklama: t.fieroAlt,
        tip: "ses",
        url,
        sira: 0,
        zaman: new Date(fiero.scored_at).getTime(),
        zamanYazi: tarihYaz(fiero.scored_at, true),
      });
  }
  if (kayma?.voice_path) {
    const url = await imzala(kayma.voice_path);
    if (url)
      anlar.push({
        anahtar: "kayma",
        simge: "🌊",
        baslik: t.kayma,
        aciklama: t.kaymaAlt,
        tip: "ses",
        url,
        sira: 0,
        zaman: kayma.nudged_at ? new Date(kayma.nudged_at).getTime() : 0,
        zamanYazi: kayma.nudged_at ? tarihYaz(kayma.nudged_at, true) : null,
      });
  }
  if (profil?.night_date) {
    const url = await imzala(`${sub}/gece.mp3`);
    if (url)
      anlar.push({
        anahtar: "gece",
        simge: "🌙",
        baslik: t.gece,
        aciklama: "",
        tip: "ses",
        url,
        sira: 0,
        zaman: new Date(`${profil.night_date}T22:00:00+03:00`).getTime(),
        zamanYazi: tarihYaz(`${profil.night_date}T22:00:00+03:00`, false),
      });
  }
  if (profil?.morning_date) {
    const url = await imzala(`${sub}/sabah.mp3`);
    if (url)
      anlar.push({
        anahtar: "sabah",
        simge: "🌅",
        baslik: t.sabah,
        aciklama: "",
        tip: "ses",
        url,
        sira: 0,
        zaman: new Date(`${profil.morning_date}T07:30:00+03:00`).getTime(),
        zamanYazi: tarihYaz(`${profil.morning_date}T07:30:00+03:00`, false),
      });
  }

  anlar.sort((a, b) => b.sira - a.sira || b.zaman - a.zaman);

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="sahne-giris mx-auto my-auto w-full max-w-md space-y-5 p-5">
        <header className="text-center">
          <h1 className="prizma-serif ay-metin text-3xl font-semibold leading-tight">
            {t.baslik}
          </h1>
          <p className="mt-2 text-base leading-relaxed text-slate-300">{t.altBaslik}</p>
        </header>

        {anlar.length === 0 ? (
          <BosDurum simge="🪞" baslik={t.bosBaslik} metin={t.bosMetin} />
        ) : (
          <ul className="space-y-4">
            {anlar.map((an) => (
              <li
                key={an.anahtar}
                className="kart-cam relative overflow-hidden rounded-3xl p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{an.simge}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold text-gold-light">{an.baslik}</p>
                    {an.aciklama && (
                      <p className="mt-0.5 text-sm text-slate-300">{an.aciklama}</p>
                    )}
                    {an.zamanYazi && (
                      <p className="mt-0.5 text-xs text-slate-500">{an.zamanYazi}</p>
                    )}
                  </div>
                </div>
                {an.tip === "video" ? (
                  <video
                    src={an.url}
                    controls
                    playsInline
                    className="mt-3 w-full rounded-2xl"
                  />
                ) : (
                  <SesCal url={an.url} etiket={t.dinle} />
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="pt-2 text-center">
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

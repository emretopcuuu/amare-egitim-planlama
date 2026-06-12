import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { acikDalga } from "@/lib/degerlendirme";
import { raporlarGorunurMu } from "@/lib/rapor";
import { fazBul, yolculukGunuHesapla } from "@/lib/davranis";
import { tr } from "@/lib/i18n/tr";
import CikisButonu from "@/components/CikisButonu";
import AynaKurulum from "@/components/AynaKurulum";
import AynaRituel from "@/components/AynaRituel";
import EgilenKart from "@/components/EgilenKart";
import SesCal from "@/components/SesCal";

export default async function AnaSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");

  const db = supabaseAdmin();
  const [
    dalga,
    raporlarAcik,
    { count: aktifGorev },
    { data: sesProfili },
    { data: kayma },
    { data: modAyarlari },
  ] = await Promise.all([
    acikDalga(db),
    raporlarGorunurMu(db),
    db
      .from("missions")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", session.sub)
      .eq("status", "pending"),
    db
      .from("voice_profiles")
      .select("status, video_status, morning_date")
      .eq("participant_id", session.sub)
      .maybeSingle(),
    db
      .from("churn_radar")
      .select("nudged_at, voice_path")
      .eq("participant_id", session.sub)
      .maybeSingle(),
    db
      .from("settings")
      .select("key, value")
      .in("key", ["sistem_modu", "yolculuk_baslangic"]),
  ]);

  const ayar = new Map((modAyarlari ?? []).map((a) => [a.key, a.value]));
  const yolculukBaslangic = ayar.get("yolculuk_baslangic");
  const yolculukGunu =
    ayar.get("sistem_modu") === "yolculuk" && yolculukBaslangic
      ? Math.min(90, yolculukGunuHesapla(yolculukBaslangic, new Date()))
      : null;

  // Kişisel sesli mesaj kartları: sabah yoklaması (bugünse) + kayma mektubu (24s)
  const db2 = db.storage.from("sesler");
  const bugunIst = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
  }).format(new Date());
  let sabahSesUrl: string | null = null;
  if (sesProfili?.morning_date === bugunIst) {
    const { data } = await db2.createSignedUrl(`${session.sub}/sabah.mp3`, 3600);
    sabahSesUrl = data?.signedUrl ?? null;
  }
  let kaymaSesUrl: string | null = null;
  // istek anı: sunucu bileşeni her istekte çalışır, tazelik kontrolü bilinçli
  // eslint-disable-next-line react-hooks/purity
  const istekAni = Date.now();
  if (
    kayma?.voice_path &&
    kayma.nudged_at &&
    istekAni - new Date(kayma.nudged_at).getTime() < 24 * 3_600_000
  ) {
    const { data } = await db2.createSignedUrl(kayma.voice_path, 3600);
    kaymaSesUrl = data?.signedUrl ?? null;
  }

  return (
    <main className="flex min-h-screen flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-5 p-6">
        <EgilenKart className="rounded-3xl">
          <div className="kart-cam relative overflow-hidden rounded-3xl p-8">
            <p className="prizma-serif text-xs uppercase tracking-[0.45em] text-slate-400">
              {tr.app.name}
            </p>
            <h1 className="prizma-serif ay-metin mt-2 text-4xl font-semibold leading-tight">
              {tr.anaSayfa.hosGeldin(session.ad)}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-300">
              {tr.anaSayfa.aciklama}
            </p>

            {yolculukGunu !== null && (
              <p className="mt-4 text-sm">
                <span className="rounded-full border border-sky-300/30 bg-sky-300/10 px-3 py-1 font-semibold text-sky-200">
                  {tr.anaSayfa.yolculukRozeti(
                    yolculukGunu,
                    fazBul(yolculukGunu).ad
                  )}
                </span>
              </p>
            )}

            <p className="mt-6 text-sm">
              {dalga ? (
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 font-medium text-emerald-300">
                  ● {tr.anaSayfa.dalgaAcik(dalga.name)}
                </span>
              ) : (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-medium text-slate-400">
                  ○ {tr.anaSayfa.dalgaKapali}
                </span>
              )}
            </p>

            {raporlarAcik && (
              <Link
                href="/ayna"
                className="parilti btn-kor mt-6 flex h-16 w-full items-center justify-center rounded-2xl text-xl font-bold transition-transform hover:scale-[1.01]"
              >
                {tr.anaSayfa.aynaniGor}
              </Link>
            )}

            <Link
              href="/gorevler"
              className={`${raporlarAcik ? "mt-3" : "mt-6"} flex h-12 w-full items-center justify-between rounded-xl px-4 font-semibold transition-colors ${
                (aktifGorev ?? 0) > 0
                  ? "btn-kor"
                  : "border border-white/15 text-slate-200 hover:bg-white/[0.06]"
              }`}
            >
              <span>{tr.anaSayfa.gorevler}</span>
              {(aktifGorev ?? 0) > 0 && (
                <span className="rounded-full bg-grafit px-2.5 py-0.5 text-xs font-bold text-sky-200">
                  {tr.anaSayfa.aktifGorev(aktifGorev ?? 0)}
                </span>
              )}
            </Link>

            {sesProfili?.video_status === "hazir" && (
              <Link
                href="/yansiman"
                className="parilti mt-3 flex h-14 w-full items-center justify-center rounded-2xl border-2 border-sky-200/40 text-lg font-bold text-sky-100 transition-colors hover:bg-white/[0.06]"
              >
                {tr.yansiman.anaSayfa}
              </Link>
            )}

            <div className="mt-3 grid grid-cols-2 gap-3">
              <Link
                href="/degerlendir"
                className="flex h-12 items-center justify-center rounded-xl border border-white/15 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/[0.06]"
              >
                {tr.anaSayfa.degerlendirmeyeBasla}
              </Link>
              <Link
                href="/program"
                className="flex h-12 items-center justify-center rounded-xl border border-white/15 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/[0.06]"
              >
                {tr.anaSayfa.program}
              </Link>
            </div>
          </div>
        </EgilenKart>

        {/* Kişisel sesli mesajlar: önce kayma mektubu, sonra sabah yoklaması */}
        {kaymaSesUrl && (
          <div className="kart-cam relative overflow-hidden rounded-2xl p-5">
            <p className="text-lg font-bold text-sky-200">
              {tr.anaSayfa.kaymaBaslik}
            </p>
            <SesCal url={kaymaSesUrl} etiket={tr.anaSayfa.mesajDinle} />
          </div>
        )}
        {sabahSesUrl && !kaymaSesUrl && (
          <div className="kart-cam relative overflow-hidden rounded-2xl p-5">
            <p className="text-lg font-bold text-amber-300">
              {tr.anaSayfa.sabahBaslik}
            </p>
            <SesCal url={sabahSesUrl} etiket={tr.anaSayfa.mesajDinle} />
          </div>
        )}

        {/* YANSIMAN doğmadıysa önce Ses Ritüeli — ilk dakikanın wow anı */}
        {!sesProfili && <AynaRituel />}

        <AynaKurulum />

        <CikisButonu />
      </div>
    </main>
  );
}

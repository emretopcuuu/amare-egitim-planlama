import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { raporHesapla, raporlarGorunurMu } from "@/lib/rapor";
import { unvanBul } from "@/lib/kivilcim";
import { tr } from "@/lib/i18n/tr";
import AynaBekleme from "./AynaBekleme";
import KelimeKarti from "./KelimeKarti";
import MektupBolumu from "./MektupBolumu";
import SesCal from "@/components/SesCal";

export const metadata = { title: "Ayna Raporun — Liderlik Aynası" };

function puanYaz(n: number | null): string {
  return n === null ? "—" : n.toFixed(1);
}

export default async function AynaPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();

  if (!(await raporlarGorunurMu(db))) {
    return <AynaBekleme />;
  }

  const rapor = await raporHesapla(db, session.sub);
  const t = tr.ayna;
  const ozellikAd = new Map(rapor.satirlar.map((s) => [s.ozellikId, s.ad]));

  const { count: verdigiPuan } = await db
    .from("ratings")
    .select("id", { count: "exact", head: true })
    .eq("rater_id", session.sub);

  const [{ data: mevcutMektup }, { data: sesProfili }] = await Promise.all([
    db
      .from("mirror_letters")
      .select("content, voice_path")
      .eq("participant_id", session.sub)
      .maybeSingle(),
    db
      .from("voice_profiles")
      .select("soz_path, video_status, video_path")
      .eq("participant_id", session.sub)
      .maybeSingle(),
  ]);

  // YANSIMAN sesleri: kısa ömürlü imzalı URL'ler (özel bucket)
  let mektupSesUrl: string | null = null;
  if (mevcutMektup?.voice_path) {
    const { data: imzali } = await db.storage
      .from("sesler")
      .createSignedUrl(mevcutMektup.voice_path, 3600);
    mektupSesUrl = imzali?.signedUrl ?? null;
  }
  let sozSesUrl: string | null = null;
  if (sesProfili?.soz_path) {
    const { data: imzali } = await db.storage
      .from("sesler")
      .createSignedUrl(sesProfili.soz_path, 3600);
    sozSesUrl = imzali?.signedUrl ?? null;
  }
  // Mektup Filmi: mektup kendi sesinden okunurken suda beliren yansıma oynar
  let yansimaVideoUrl: string | null = null;
  if (sesProfili?.video_status === "hazir" && sesProfili.video_path) {
    const { data: imzali } = await db.storage
      .from("sesler")
      .createSignedUrl(sesProfili.video_path, 3600);
    yansimaVideoUrl = imzali?.signedUrl ?? null;
  }

  const tahminTuttu =
    rapor.tahmin &&
    rapor.gercekTopId !== null &&
    rapor.tahmin.topId === rapor.gercekTopId;

  return (
    <main className="min-h-screen flex-1 overflow-hidden">
      <div className="mx-auto w-full max-w-lg space-y-6 p-6">
      <header className="ayna-acilis text-center">
        <p className="prizma-serif text-xs uppercase tracking-[0.45em] text-slate-400">
          {t.baslik}
        </p>
        <h1 className="prizma-serif ay-metin mt-2 text-3xl font-semibold">
          {t.acilis(session.ad)}
        </h1>
        <p className="mt-2 text-sm text-slate-300">{t.acilisAlt}</p>
        <p className="mt-2 text-sm font-semibold text-gold-light">
          {t.epikKatki(verdigiPuan ?? 0)}
        </p>
      </header>

      {/* Güçlü yanlar / gelişim alanları */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="kart-cam rounded-2xl p-5 shadow-xl ring-1 ring-gold/30 backdrop-blur">
          <h2 className="font-semibold text-gold-light">{t.gucluBaslik}</h2>
          {rapor.guclu.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">{t.veriYok}</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {rapor.guclu.map((s, i) => (
                <li key={s.ozellikId} className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-slate-100">
                    {i + 1}. {s.ad}
                  </span>
                  <span className="font-mono text-sm font-bold text-emerald-400">
                    {puanYaz(s.dis)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="kart-cam rounded-2xl p-5 shadow-xl ring-1 ring-royal/30 backdrop-blur">
          <h2 className="font-semibold text-gold-light">{t.gelisimBaslik}</h2>
          {rapor.gelisim.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">{t.veriYok}</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {rapor.gelisim.map((s) => (
                <li key={s.ozellikId} className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-slate-100">{s.ad}</span>
                  <span className="font-mono text-sm font-bold text-amber-400">
                    {puanYaz(s.dis)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {/* Johari: gizli güç / kör nokta */}
      {rapor.gizliGuc && (
        <section className="kart-cam rounded-2xl bg-gradient-to-br from-emerald-500/15 to-midnight-card/60 p-5 shadow-xl ring-1 ring-emerald-400/30 backdrop-blur">
          <h2 className="font-semibold text-emerald-400">{t.gizliGucBaslik}</h2>
          <p className="mt-2 text-sm text-slate-200">
            {t.gizliGucAciklama(rapor.gizliGuc.ad)}
          </p>
        </section>
      )}
      {rapor.korNokta && (
        <section className="kart-cam rounded-2xl bg-gradient-to-br from-amber-500/15 to-midnight-card/60 p-5 shadow-xl ring-1 ring-amber-400/30 backdrop-blur">
          <h2 className="font-semibold text-amber-400">{t.korNoktaBaslik}</h2>
          <p className="mt-2 text-sm text-slate-200">
            {t.korNoktaAciklama(rapor.korNokta.ad)}
          </p>
        </section>
      )}

      {/* Tahmin vs gerçek */}
      <section className="kart-cam rounded-2xl p-5 shadow-xl ring-1 ring-gold/30 backdrop-blur">
        <h2 className="font-semibold text-gold-light">{t.tahminBaslik}</h2>
        {!rapor.tahmin ? (
          <p className="mt-2 text-sm text-slate-400">{t.tahminYok}</p>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-midnight-soft p-3">
                <p className="text-xs text-slate-400">
                  ▲ {t.tahminEnYuksek} — {t.tahminSenin}
                </p>
                <p className="mt-1 font-medium text-slate-100">
                  {ozellikAd.get(rapor.tahmin.topId)}
                </p>
                <p className="mt-2 text-xs text-slate-400">{t.tahminGercek}</p>
                <p className="font-medium text-emerald-400">
                  {rapor.gercekTopId !== null ? ozellikAd.get(rapor.gercekTopId) : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-midnight-soft p-3">
                <p className="text-xs text-slate-400">
                  ▼ {t.tahminEnDusuk} — {t.tahminSenin}
                </p>
                <p className="mt-1 font-medium text-slate-100">
                  {ozellikAd.get(rapor.tahmin.bottomId)}
                </p>
                <p className="mt-2 text-xs text-slate-400">{t.tahminGercek}</p>
                <p className="font-medium text-amber-400">
                  {rapor.gercekBottomId !== null
                    ? ozellikAd.get(rapor.gercekBottomId)
                    : "—"}
                </p>
              </div>
            </div>
            {/* Dış puan yokken "gerçek" oluşmaz; hüküm verme */}
            {rapor.gercekTopId !== null && (
              <p className="mt-3 text-center text-sm font-medium text-gold-light">
                {tahminTuttu ? t.tahminTuttu : t.tahminTutmadi}
              </p>
            )}
          </>
        )}
      </section>

      {/* Dalga yolculuğu — hikâye modu */}
      <section className="kart-cam rounded-2xl p-5 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 className="font-semibold text-gold-light">{t.hikayeBaslik}</h2>
        <p className="mt-1 text-xs text-slate-400">{t.hikayeAciklama}</p>
        {rapor.dalgalar.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">{t.veriYok}</p>
        ) : (
          <>
            <ol className="relative mt-4 space-y-4 border-l border-royal/40 pl-5">
              {rapor.dalgalar.map((d) => (
                <li key={d.dalgaId} className="relative">
                  <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full bg-gold" />
                  <p className="text-sm font-medium text-slate-100">{d.ad}</p>
                  <p className="text-xs text-slate-400">
                    {t.hikayeDalgaOzet(puanYaz(d.genelOrtalama))}
                  </p>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-midnight-soft">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-royal to-gold"
                      style={{ width: `${((d.genelOrtalama ?? 0) / 10) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ol>
            {rapor.enGelisen && (
              <p className="mt-4 rounded-xl bg-gold/10 p-3 text-sm text-gold-light">
                🚀 {t.hikayeGelisen(rapor.enGelisen.ad, rapor.enGelisen.fark.toFixed(1))}
              </p>
            )}
          </>
        )}
      </section>

      {/* Özellik özellik öz vs dış */}
      <section className="kart-cam rounded-2xl p-5 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 className="font-semibold text-gold-light">{t.tabloBaslik}</h2>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
          <span>
            <span className="mr-1 inline-block h-2 w-4 rounded-sm bg-royal-light" />
            {t.ozEtiket}
          </span>
          <span>
            <span className="mr-1 inline-block h-2 w-4 rounded-sm bg-gold" />
            {t.disEtiket}
          </span>
          {rapor.satirlar.some((s) => s.ayna !== null) && (
            <span>
              <span className="mr-1 inline-block h-2 w-4 rounded-sm bg-emerald-400" />
              {t.aynaEtiket}
            </span>
          )}
        </div>
        <ul className="mt-4 space-y-4">
          {rapor.satirlar.map((s) => (
            <li key={s.ozellikId}>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-slate-100">{s.ad}</span>
                <span className="text-xs text-slate-500">
                  {s.disSayi > 0 ? t.kisiSayisi(s.disSayi) : t.veriYok}
                </span>
              </div>
              <div className="mt-1.5 space-y-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-midnight-soft">
                  <div
                    className="h-full rounded-full bg-royal-light"
                    style={{ width: `${((s.oz ?? 0) / 10) * 100}%` }}
                  />
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-midnight-soft">
                  <div
                    className="h-full rounded-full bg-gold"
                    style={{ width: `${((s.dis ?? 0) / 10) * 100}%` }}
                  />
                </div>
                {s.ayna !== null && (
                  <div className="h-2 w-full overflow-hidden rounded-full bg-midnight-soft">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: `${(s.ayna / 10) * 100}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="mt-1 flex justify-between font-mono text-xs text-slate-400">
                <span>{puanYaz(s.oz)}</span>
                <span>
                  {puanYaz(s.dis)}
                  {s.ayna !== null && (
                    <span className="ml-2 text-emerald-400">{puanYaz(s.ayna)}</span>
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Yorumlar */}
      <section className="kart-cam rounded-2xl p-5 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 className="font-semibold text-gold-light">{t.yorumlarBaslik}</h2>
        <p className="mt-1 text-xs text-slate-400">{t.yorumlarAciklama}</p>
        {rapor.yorumlar.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">{t.yorumYok}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {rapor.yorumlar.map((y, i) => (
              <li key={i} className="rounded-xl bg-midnight-soft p-3">
                <p className="text-xs text-slate-400">
                  Dalga {y.dalga} · {y.ozellikAd} · {y.puan}/10
                </p>
                <p className="mt-1 text-sm text-slate-100">“{y.yorum}”</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* AYNA'nın görev özeti */}
      {rapor.gorev.tamamlanan > 0 && (
        <section className="kart-cam rounded-2xl bg-gradient-to-br from-emerald-500/10 to-midnight-card/60 p-5 shadow-xl ring-1 ring-emerald-400/30 backdrop-blur">
          <h2 className="font-semibold text-emerald-400">{t.aynaBaslik}</h2>
          <p className="mt-2 text-sm text-slate-200">
            {t.aynaOzeti(
              rapor.gorev.tamamlanan,
              rapor.gorev.kivilcim,
              unvanBul(rapor.gorev.kivilcim).mevcut.ad
            )}
          </p>
        </section>
      )}

      {/* Kelime kartı */}
      {rapor.guclu[0] && (
        <KelimeKarti ad={session.ad} ozellik={rapor.guclu[0].ad} />
      )}

      {/* AI Ayna Mektubu — varsa Mektup Filmi olarak (video + kendi sesi) */}
      <MektupBolumu
        mevcutMektup={mevcutMektup?.content ?? null}
        sesUrl={mektupSesUrl}
        videoUrl={yansimaVideoUrl}
      />

      {sozSesUrl && (
        <section className="kart-cam relative overflow-hidden rounded-2xl p-5">
          <h2 className="font-semibold text-gold-light">{tr.soz.baslik}</h2>
          <p className="mt-1 text-xs text-slate-400">{tr.soz.aciklama}</p>
          <SesCal url={sozSesUrl} etiket={tr.soz.dinle} />
        </section>
      )}

      <p className="pb-4 text-center">
        <Link
          href="/"
          className="text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
        >
          ← {tr.degerlendir.anaSayfayaDon}
        </Link>
      </p>
      </div>
    </main>
  );
}

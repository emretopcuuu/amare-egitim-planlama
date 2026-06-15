import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { unvanBul } from "@/lib/kivilcim";
import { raporlarGorunurMu } from "@/lib/rapor";
import { tr } from "@/lib/i18n/tr";
import Avatar from "@/components/Avatar";
import BenKarti from "./BenKarti";

export const metadata = { title: "Ben — Liderlik Aynası" };

const t = tr.ben;

// #3 Ben / Kimlik Merkezi: kişinin kıvılcımı, unvanı, rozetleri, aldığı
// takdirler ve istatistikleri tek yerde — aidiyet + ilerleme görünür.
export default async function BenPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const [
    { data: kisi },
    { data: gorevler },
    { count: takdirSayi },
    { data: sonTakdirler },
    { count: checkinSayi },
    { count: redSayi },
    raporAcik,
  ] = await Promise.all([
    db
      .from("participants")
      .select("full_name, team, profil_foto_path")
      .eq("id", session.sub)
      .maybeSingle(),
    db
      .from("missions")
      .select("spark_points, status")
      .eq("participant_id", session.sub)
      .eq("status", "scored"),
    db
      .from("kudos")
      .select("id", { count: "exact", head: true })
      .eq("to_id", session.sub)
      .eq("is_hidden", false),
    db
      .from("kudos")
      .select("id, message, gonderen:participants!kudos_from_id_fkey(full_name)")
      .eq("to_id", session.sub)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(3),
    db
      .from("gunluk_checkin")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", session.sub),
    db
      .from("redler")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", session.sub),
    raporlarGorunurMu(db),
  ]);

  const gorevSayi = (gorevler ?? []).length;
  const toplamKivilcim = (gorevler ?? []).reduce((tpl, g) => tpl + (g.spark_points ?? 0), 0);
  const unvan = unvanBul(toplamKivilcim);
  const takdir = takdirSayi ?? 0;
  const checkin = checkinSayi ?? 0;
  const red = redSayi ?? 0;

  let avatarUrl: string | null = null;
  if (kisi?.profil_foto_path) {
    const { data } = await db.storage.from("sesler").createSignedUrl(kisi.profil_foto_path, 3600);
    avatarUrl = data?.signedUrl ?? null;
  }

  // Türetilmiş rozetler (ayrı tablo yok — başarıdan çıkar)
  const rozetler = [
    gorevSayi >= 5 && { ikon: "🎯", ad: t.rozetGorevci },
    takdir >= 3 && { ikon: "💛", ad: t.rozetSevilen },
    checkin >= 3 && { ikon: "📅", ad: t.rozetIstikrar },
    red >= 1 && { ikon: "🔥", ad: t.rozetCesur },
  ].filter(Boolean) as { ikon: string; ad: string }[];

  const istatistik = [
    { ikon: "🎯", deger: gorevSayi, etiket: t.statGorev },
    { ikon: "💛", deger: takdir, etiket: t.statTakdir },
    { ikon: "📅", deger: checkin, etiket: t.statCheckin },
    { ikon: "🔥", deger: red, etiket: t.statRed },
  ];

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="sahne-giris mx-auto my-auto w-full max-w-md space-y-5 p-5">
        {/* Kimlik başlığı */}
        <header className="flex flex-col items-center text-center">
          <Avatar ad={kisi?.full_name ?? session.ad} url={avatarUrl} boyut="lg" />
          <h1 className="prizma-serif ay-metin mt-3 text-2xl font-semibold leading-tight break-words">
            {kisi?.full_name ?? session.ad}
          </h1>
          {kisi?.team && <p className="text-sm text-slate-400">{kisi.team}</p>}
          <span className="parilti mt-2 rounded-full bg-gold/15 px-3 py-1 text-sm font-bold text-gold-light">
            {unvan.mevcut.ad}
          </span>
        </header>

        {/* Kıvılcım ilerlemesi */}
        <section className="kart-cam rounded-2xl p-5 ring-1 ring-gold/30">
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-bold text-gold">{tr.kivilcim.toplam(toplamKivilcim)}</p>
            <p className="text-xs text-slate-400">
              {unvan.sonraki
                ? tr.kivilcim.sonrakiUnvan(unvan.sonraki.ad, unvan.kalan)
                : tr.kivilcim.zirve}
            </p>
          </div>
          {unvan.sonraki && (
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-midnight-soft">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold"
                style={{ width: `${Math.min(100, (toplamKivilcim / unvan.sonraki.esik) * 100)}%` }}
              />
            </div>
          )}
        </section>

        {/* İstatistikler */}
        <section className="grid grid-cols-4 gap-2">
          {istatistik.map((s) => (
            <div
              key={s.etiket}
              className="rounded-2xl bg-midnight-card/60 p-3 text-center ring-1 ring-royal/30"
            >
              <p className="text-xl" aria-hidden>
                {s.ikon}
              </p>
              <p className="mt-0.5 text-xl font-bold text-gold">{s.deger}</p>
              <p className="text-[0.6rem] leading-tight text-slate-400">{s.etiket}</p>
            </div>
          ))}
        </section>

        {/* Rozetler */}
        {rozetler.length > 0 && (
          <section className="kart-cam rounded-2xl p-5 ring-1 ring-royal/30">
            <h2 className="text-sm font-semibold text-gold-light">{t.rozetlerBaslik}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {rozetler.map((r) => (
                <span
                  key={r.ad}
                  className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-sm text-slate-200"
                >
                  <span aria-hidden>{r.ikon}</span>
                  {r.ad}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Sana gelen takdirler */}
        <section className="kart-cam rounded-2xl bg-gradient-to-br from-gold/10 to-midnight-card/60 p-5 ring-1 ring-gold/30">
          <h2 className="text-sm font-semibold text-gold-light">{t.takdirlerBaslik}</h2>
          {(sonTakdirler ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">{t.takdirYok}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {(sonTakdirler ?? []).map((g) => (
                <li key={g.id} className="rounded-xl bg-white/[0.04] p-3">
                  <p className="text-sm text-slate-100">“{g.message}”</p>
                  <p className="mt-1 text-xs font-semibold text-gold-light">
                    {tr.takdir.kimden(g.gonderen?.full_name ?? "Bir arkadaşın")}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {takdir > 3 && (
            <Link
              href="/takdir"
              className="mt-3 inline-block text-sm text-royal-light underline-offset-4 hover:underline"
            >
              {t.tumTakdirler(takdir)} →
            </Link>
          )}
        </section>

        {/* #5 Paylaşılabilir profil kartı */}
        <section className="kart-cam rounded-2xl p-5 ring-1 ring-royal/30">
          <h2 className="text-sm font-semibold text-gold-light">{t.kartBaslik}</h2>
          <p className="mt-1 text-xs text-slate-400">{t.kartAciklama}</p>
          <BenKarti
            ad={kisi?.full_name ?? session.ad}
            takim={kisi?.team ?? ""}
            unvan={unvan.mevcut.ad}
            kivilcim={toplamKivilcim}
          />
        </section>

        {/* Hızlı erişim */}
        <section className="grid grid-cols-2 gap-2">
          {raporAcik && (
            <Link
              href="/ayna"
              className="btn-kor flex h-12 items-center justify-center rounded-xl text-sm font-bold"
            >
              🪞 {t.linkRapor}
            </Link>
          )}
          <Link
            href="/gorevler"
            className="flex h-12 items-center justify-center rounded-xl border border-royal-light/30 text-sm font-medium text-slate-200 hover:bg-white/5"
          >
            🎯 {t.linkGorevler}
          </Link>
          <Link
            href="/takdir"
            className="flex h-12 items-center justify-center rounded-xl border border-royal-light/30 text-sm font-medium text-slate-200 hover:bg-white/5"
          >
            💛 {t.linkTakdir}
          </Link>
        </section>

        <p className="pt-1 text-center">
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

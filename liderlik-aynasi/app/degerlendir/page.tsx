import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { kampKilitliMi } from "@/lib/pusula";
import {
  acikDalga,
  aktifOzellikler,
  hedefBasinaPuanSayisi,
} from "@/lib/degerlendirme";
import { tr } from "@/lib/i18n/tr";
import KisiSatiri from "./KisiSatiri";
import SerbestListe from "./SerbestListe";
import BosDurum from "@/components/BosDurum";
import GeriButonu from "@/components/GeriButonu";

export const metadata = { title: "Değerlendirme — Liderlik Aynası" };

export default async function DegerlendirPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  // FAZ 0: kamp açılmadan değerlendirme kilitli — bekleme ekranına dön.
  if (await kampKilitliMi(db, session.sub)) redirect("/pusula");
  const dalga = await acikDalga(db);

  if (!dalga) {
    return (
      <main className="flex min-h-dvh flex-col overflow-y-auto">
        <div className="mx-auto my-auto w-full max-w-md p-5">
          <BosDurum
            simge="🌊"
            baslik={tr.degerlendir.dalgaKapaliBaslik}
            metin={tr.degerlendir.dalgaKapaliAciklama}
            eylem={
              <Link
                href="/"
                className="text-sm text-royal-light underline-offset-4 hover:underline"
              >
                {tr.degerlendir.anaSayfayaDon}
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  const [ozellikler, puanSayilari, atamalar, katilimcilar, tahmin, kendiFoto] =
    await Promise.all([
      aktifOzellikler(db),
      hedefBasinaPuanSayisi(db, session.sub, dalga.id),
      db
        .from("assignments")
        .select(
          "type, target:participants!assignments_target_id_fkey(id, full_name, team, profil_foto_path)"
        )
        .eq("observer_id", session.sub)
        .then(({ data, error }) => {
          if (error) throw error;
          return data;
        }),
      db
        .from("participants")
        .select("id, full_name, team, profil_foto_path")
        .eq("role", "participant")
        .neq("id", session.sub)
        .order("full_name")
        .then(({ data, error }) => {
          if (error) throw error;
          return data;
        }),
      db
        .from("predictions")
        .select("participant_id")
        .eq("participant_id", session.sub)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) throw error;
          return data;
        }),
      db
        .from("participants")
        .select("profil_foto_path")
        .eq("id", session.sub)
        .maybeSingle()
        .then(({ data }) => data),
    ]);

  const toplam = ozellikler.length;
  const ozSayi = puanSayilari.get(session.sub) ?? 0;
  const ozTamam = ozSayi >= toplam;

  const atananIdler = new Set(atamalar.map((a) => a.target.id));
  const serbestler = katilimcilar.filter((k) => !atananIdler.has(k.id));

  // #8 Birincil eylem hiyerarşisi: o an yapılacak TEK kart vurgulanır.
  // Sıra: öz-puan eksik → öz; tamamsa ve atananlar eksik → atananlar.
  const atananEksik = atamalar.some(
    (a) => (puanSayilari.get(a.target.id) ?? 0) < toplam
  );
  const ozBirincil = !ozTamam;
  const atananBirincil = ozTamam && atananEksik;

  // Avatar fotoğrafları: tüm hedeflerin profil_foto_path'lerini tek seferde imzala.
  const fotoKayit: { id: string; path: string }[] = [];
  if (kendiFoto?.profil_foto_path)
    fotoKayit.push({ id: session.sub, path: kendiFoto.profil_foto_path });
  for (const a of atamalar)
    if (a.target.profil_foto_path)
      fotoKayit.push({ id: a.target.id, path: a.target.profil_foto_path });
  for (const k of katilimcilar)
    if (k.profil_foto_path) fotoKayit.push({ id: k.id, path: k.profil_foto_path });

  const fotoHarita = new Map<string, string>();
  if (fotoKayit.length > 0) {
    const yollar = [...new Set(fotoKayit.map((f) => f.path))];
    const { data: imzalilar } = await db.storage.from("sesler").createSignedUrls(yollar, 3600);
    const yolUrl = new Map<string, string>();
    for (const im of imzalilar ?? []) if (im.path && im.signedUrl) yolUrl.set(im.path, im.signedUrl);
    for (const f of fotoKayit) {
      const u = yolUrl.get(f.path);
      if (u && !fotoHarita.has(f.id)) fotoHarita.set(f.id, u);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="sahne-giris mx-auto my-auto w-full max-w-md space-y-6 p-5">
      <GeriButonu />
      <header>
        <p className="text-sm font-medium uppercase tracking-widest text-royal-light">
          {tr.degerlendir.baslik}
        </p>
        <h1 className="font-display altin-metin mt-1 text-3xl font-bold leading-tight">{dalga.name}</h1>
      </header>

      {/* Öz-puan kapısı */}
      <section
        className={`kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl backdrop-blur ${
          ozBirincil ? "parilti ring-2 ring-gold/60" : "ring-1 ring-royal/30"
        }`}
      >
        {ozBirincil && (
          <p className="mb-2 inline-block rounded-full bg-gold/20 px-3 py-1 text-xs font-bold tracking-wide text-gold-light">
            {tr.degerlendir.simdiSira}
          </p>
        )}
        <h2 className="text-lg font-semibold text-gold-light">
          {ozTamam ? tr.degerlendir.ozTamamlandi : tr.degerlendir.ozBaslik}
        </h2>
        {!ozTamam && (
          <p className="mt-2 text-sm text-slate-300">{tr.degerlendir.ozAciklama}</p>
        )}
        <KisiSatiri
          hedefId={session.sub}
          ad={session.ad}
          altYazi={null}
          yapilan={ozSayi}
          toplam={toplam}
          kilitli={false}
          fotoUrl={fotoHarita.get(session.sub) ?? null}
        />
      </section>

      {/* Atanan kişiler */}
      <section
        className={`kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl backdrop-blur ${
          atananBirincil ? "parilti ring-2 ring-gold/60" : "ring-1 ring-royal/30"
        }`}
      >
        {atananBirincil && (
          <p className="mb-2 inline-block rounded-full bg-gold/20 px-3 py-1 text-xs font-bold tracking-wide text-gold-light">
            {tr.degerlendir.simdiSira}
          </p>
        )}
        <h2 className="text-lg font-semibold text-gold-light">
          {tr.degerlendir.atananBaslik}
        </h2>
        <p className="mt-2 text-sm text-slate-300">{tr.degerlendir.atananAciklama}</p>
        {!ozTamam && (
          <p className="mt-2 text-xs font-medium text-amber-400">
            🔒 {tr.degerlendir.kilitliIpucu}
          </p>
        )}
        {atamalar.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">{tr.degerlendir.atananYok}</p>
        ) : (
          <ul className="mt-2 divide-y divide-royal/20">
            {atamalar.map((a) => (
              <li key={`${a.target.id}-${a.type}`}>
                <KisiSatiri
                  hedefId={a.target.id}
                  ad={a.target.full_name}
                  altYazi={[
                    a.target.team,
                    a.type === "shadow"
                      ? tr.degerlendir.gizliGozlem
                      : tr.degerlendir.acikGozlem,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  yapilan={puanSayilari.get(a.target.id) ?? 0}
                  toplam={toplam}
                  kilitli={!ozTamam}
                  fotoUrl={fotoHarita.get(a.target.id) ?? null}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Tahmin oyunu */}
      <section className="kart-cerceve rounded-2xl bg-gradient-to-br from-royal/30 to-midnight-card/60 p-6 shadow-xl ring-1 ring-gold/30 backdrop-blur">
        <h2 className="text-lg font-semibold text-gold-light">
          {tr.tahmin.kartBaslik}
        </h2>
        {tahmin ? (
          <p className="mt-2 text-sm text-slate-300">{tr.tahmin.kartTamam}</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-300">{tr.tahmin.kartAciklama}</p>
            <Link
              href="/tahmin"
              className="mt-4 inline-block btn-3d rounded-xl bg-gold px-5 py-2.5 font-semibold text-[#1a1206] transition-colors hover:bg-gold-light"
            >
              {tr.tahmin.tahminYap}
            </Link>
          </>
        )}
      </section>

      {/* Serbest puanlama */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 className="text-lg font-semibold text-gold-light">
          {tr.degerlendir.serbestBaslik}
        </h2>
        <p className="mt-2 text-sm text-slate-300">{tr.degerlendir.serbestAciklama}</p>
        <SerbestListe
          kisiler={serbestler.map((k) => ({
            id: k.id,
            ad: k.full_name,
            takim: k.team,
            yapilan: puanSayilari.get(k.id) ?? 0,
            foto: fotoHarita.get(k.id) ?? null,
          }))}
          toplam={toplam}
          kilitli={!ozTamam}
        />
      </section>
      </div>
    </main>
  );
}

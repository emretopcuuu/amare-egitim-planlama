import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { aktifOzellikler } from "@/lib/degerlendirme";
import { raporlarGorunurMu } from "@/lib/rapor";
import { adminOnerisi } from "@/lib/adminAsistan";
import { tr } from "@/lib/i18n/tr";
import DalgaKontrol from "./DalgaKontrol";
import AynaAniKontrol from "./AynaAniKontrol";
import DavetKontrol from "./DavetKontrol";
import YedekButonu from "./YedekButonu";
import SilmeTalepleri from "./SilmeTalepleri";
import IkiliKontrol from "./IkiliKontrol";
import EksikDurt from "./EksikDurt";
import OtoYenile from "./OtoYenile";
import GununAkisi from "./GununAkisi";
import HazirlikPaneli from "./HazirlikPaneli";
import CanliOzet from "./CanliOzet";
import KodBul from "./KodBul";

export const metadata = { title: "Yönetim Paneli — Liderlik Aynası" };

export default async function AdminPanel() {
  const session = await getSession();
  if (!session || (session.rol !== "admin" && session.rol !== "yardimci")) {
    redirect("/admin/giris");
  }
  // Yardımcı görevli: yalnız izleme + hatırlatma. Kritik anahtarlar gizli +
  // ilgili API'ler reddeder (derinlemesine savunma).
  const tamYetki = session.rol === "admin";

  const db = supabaseAdmin();
  const [
    { data: dalgalar, error: dalgaHatasi },
    ozellikler,
    raporlarAcik,
    { count: katilimciSayisi },
    { count: mektupSayisi },
    { count: epostaliSayisi },
    { data: davetAyari },
    { data: silmeTalepleri },
    { count: ikiliSayisi },
    { data: sozAyar },
  ] = await Promise.all([
    db.from("waves").select("id, name, is_open, opened_at").order("id"),
    aktifOzellikler(db),
    raporlarGorunurMu(db),
    db
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("role", "participant"),
    db.from("mirror_letters").select("participant_id", { count: "exact", head: true }),
    db
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("role", "participant")
      .not("email", "is", null),
    db
      .from("settings")
      .select("value")
      .eq("key", "wave4_davet_gonderildi")
      .maybeSingle(),
    db
      .from("participants")
      .select("id, full_name, team, deletion_requested_at")
      .not("deletion_requested_at", "is", null)
      .order("deletion_requested_at"),
    db.from("pairs").select("id", { count: "exact", head: true }),
    db.from("settings").select("value").eq("key", "kapanis_soz_acik").maybeSingle(),
  ]);
  if (dalgaHatasi) throw dalgaHatasi;

  const sozAcik = sozAyar?.value === "true";

  const acikDalga = dalgalar.find((d) => d.is_open) ?? null;

  // İlerleme yalnızca açık dalga için hesaplanır (kamp anlık tek dalga yaşar).
  let ilerleme: {
    katilimcilar: { id: string; ad: string; takim: string | null }[];
    ozTamamlar: Set<string>;
    puanladigi: Map<string, number>;
    onuPuanlayan: Map<string, number>;
    toplamPuan: number;
  } | null = null;

  if (acikDalga) {
    const [{ data: kisiler, error: kisiHatasi }, { data: puanlar, error: puanHatasi }] =
      await Promise.all([
        db
          .from("participants")
          .select("id, full_name, team")
          .eq("role", "participant")
          .order("full_name"),
        db
          .from("ratings")
          .select("rater_id, target_id")
          .eq("wave", acikDalga.id),
      ]);
    if (kisiHatasi) throw kisiHatasi;
    if (puanHatasi) throw puanHatasi;

    // (rater, target) çifti tüm özellikleri kapsıyorsa "tamamlanmış" sayılır.
    const ciftSayilari = new Map<string, number>();
    for (const p of puanlar) {
      const anahtar = `${p.rater_id}|${p.target_id}`;
      ciftSayilari.set(anahtar, (ciftSayilari.get(anahtar) ?? 0) + 1);
    }

    const ozTamamlar = new Set<string>();
    const puanladigi = new Map<string, number>();
    const onuPuanlayan = new Map<string, number>();
    for (const [anahtar, adet] of ciftSayilari) {
      if (adet < ozellikler.length) continue;
      const [rater, target] = anahtar.split("|");
      if (rater === target) {
        ozTamamlar.add(rater);
      } else {
        puanladigi.set(rater, (puanladigi.get(rater) ?? 0) + 1);
        onuPuanlayan.set(target, (onuPuanlayan.get(target) ?? 0) + 1);
      }
    }

    ilerleme = {
      katilimcilar: kisiler.map((k) => ({ id: k.id, ad: k.full_name, takim: k.team })),
      ozTamamlar,
      puanladigi,
      onuPuanlayan,
      toplamPuan: puanlar.length,
    };
  }

  // #7 Asistan: kampın takvimi + sistemin durumundan tek önerilen adımı çıkar.
  const bugun = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
  }).format(new Date());
  const oneri = adminOnerisi({
    bugun,
    katilimciSayisi: katilimciSayisi ?? 0,
    acikDalgaId: acikDalga?.id ?? null,
    ozTamam: ilerleme?.ozTamamlar.size ?? 0,
    ozToplam: ilerleme?.katilimcilar.length ?? katilimciSayisi ?? 0,
    raporlarAcik,
    sozAcik,
  });

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gold">{tr.admin.baslik}</h1>
        <OtoYenile />
      </div>

      {!tamYetki && (
        <p className="rounded-xl border border-royal-light/40 bg-royal/15 px-4 py-3 text-sm font-medium text-slate-100">
          {tr.admin.yardimci.banner}
        </p>
      )}

      {/* #7 Tek bakış canlı özet — büyük rakamlar (her iki rol) */}
      <CanliOzet
        katilimci={katilimciSayisi ?? 0}
        ozTamam={ilerleme?.ozTamamlar.size ?? 0}
        ozToplam={ilerleme?.katilimcilar.length ?? katilimciSayisi ?? 0}
        gorus={ilerleme?.toplamPuan ?? 0}
        dalgaAd={acikDalga?.name ?? null}
      />

      {/* #7 "Şimdi ne yapmalıyım?" — adminin o an basması gereken tek adım */}
      <section
        className={`kart-3d rounded-2xl p-6 shadow-xl ring-1 backdrop-blur ${
          oneri.vurgu ? "bg-gold/10 ring-gold/50" : "bg-midnight-card/60 ring-royal/30"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {tr.admin.asistan.baslik}
        </p>
        <div className="mt-2 flex items-start gap-4">
          <span className="text-4xl" aria-hidden>
            {oneri.ikon}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-gold-light">{oneri.baslik}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">
              {oneri.aciklama}
            </p>
          </div>
        </div>
        <Link
          href={oneri.href}
          className="btn-kor parilti mt-4 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold transition-transform hover:scale-[1.01]"
        >
          {oneri.butonEtiket}
        </Link>
      </section>

      {/* #2 Bugünün Akışı — kamp günündeyse o günün adımları */}
      <GununAkisi bugun={bugun} />

      {/* #5 "Kampa hazır mısın?" — yalnız tam yetkili admin */}
      {tamYetki && <HazirlikPaneli />}

      {/* #6 Hızlı kod bulma — yalnız tam yetkili admin (kodlar gizli) */}
      {tamYetki && <KodBul />}

      {/* #4 Kritik (kamp akışını değiştiren) anahtarlar yalnız tam yetkili admin'e */}
      {tamYetki && (
        <>
      <section
        id="dalga"
        className="kart-3d scroll-mt-20 rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur"
      >
        <h2 className="text-lg font-semibold text-gold-light">
          {tr.admin.dalga.baslik}
        </h2>
        <p className="mt-1 text-sm text-slate-400">{tr.admin.dalga.aciklama}</p>
        <DalgaKontrol
          dalgalar={dalgalar.map((d) => ({
            id: d.id,
            ad: d.name,
            acik: d.is_open,
          }))}
        />
      </section>

      <section
        id="ayna-ani"
        className={`kart-3d scroll-mt-20 rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 backdrop-blur ${
          raporlarAcik ? "ring-emerald-400/40" : "ring-gold/40"
        }`}
      >
        <h2 className="text-lg font-semibold text-gold-light">
          {tr.admin.aynaAni.baslik}
        </h2>
        <p className="mt-1 text-sm text-slate-400">{tr.admin.aynaAni.aciklama}</p>
        <AynaAniKontrol
          acik={raporlarAcik}
          mektupHazir={mektupSayisi ?? 0}
          mektupToplam={katilimciSayisi ?? 0}
        />
      </section>

      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 id="davet" className="scroll-mt-20 text-lg font-semibold text-gold-light">
          {tr.admin.doksanGun.baslik}
        </h2>
        <p className="mt-1 text-sm text-slate-400">{tr.admin.doksanGun.aciklama}</p>
        <DavetKontrol
          epostali={epostaliSayisi ?? 0}
          toplam={katilimciSayisi ?? 0}
          sonGonderim={davetAyari?.value ?? null}
        />
      </section>
        </>
      )}

      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 id="ilerleme" className="scroll-mt-20 text-lg font-semibold text-gold-light">
          {tr.admin.ilerleme.baslik}
          {acikDalga && (
            <span className="ml-2 text-sm font-normal text-slate-400">
              · {acikDalga.name}
            </span>
          )}
        </h2>

        {!ilerleme ? (
          <p className="mt-3 text-sm text-slate-400">
            {tr.admin.ilerleme.acikDalgaYok}
          </p>
        ) : (
          <>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-midnight-soft p-3">
                <dd className="text-2xl font-bold text-gold">
                  {ilerleme.katilimcilar.length}
                </dd>
                <dt className="mt-1 text-xs text-slate-400">
                  {tr.admin.ilerleme.katilimci}
                </dt>
              </div>
              <div className="rounded-xl bg-midnight-soft p-3">
                <dd className="text-2xl font-bold text-gold">
                  {ilerleme.ozTamamlar.size}/{ilerleme.katilimcilar.length}
                </dd>
                <dt className="mt-1 text-xs text-slate-400">
                  {tr.admin.ilerleme.ozTamam}
                </dt>
              </div>
              <div className="rounded-xl bg-midnight-soft p-3">
                <dd className="text-2xl font-bold text-gold">{ilerleme.toplamPuan}</dd>
                <dt className="mt-1 text-xs text-slate-400">
                  {tr.admin.ilerleme.toplamPuan}
                </dt>
              </div>
            </dl>

            <div className="mt-4 overflow-x-auto">
              <table className="cizgili w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-royal/30 text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-3">{tr.admin.ilerleme.kisi}</th>
                    <th className="py-2 pr-3">{tr.admin.ilerleme.takim}</th>
                    <th className="py-2 pr-3 text-center">{tr.admin.ilerleme.oz}</th>
                    <th className="py-2 pr-3 text-center">
                      {tr.admin.ilerleme.puanladigi}
                    </th>
                    <th className="py-2 text-center">
                      {tr.admin.ilerleme.onuPuanlayan}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-royal/20">
                  {ilerleme.katilimcilar.map((k) => (
                    <tr key={k.id}>
                      <td className="py-2 pr-3 font-medium text-slate-100">{k.ad}</td>
                      <td className="py-2 pr-3 text-slate-400">{k.takim ?? "—"}</td>
                      <td className="py-2 pr-3 text-center">
                        {ilerleme.ozTamamlar.has(k.id) ? (
                          <span className="text-emerald-400">✓</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-center text-slate-300">
                        {ilerleme.puanladigi.get(k.id) ?? 0}
                      </td>
                      <td className="py-2 text-center text-slate-300">
                        {ilerleme.onuPuanlayan.get(k.id) ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {ilerleme.katilimcilar.length - ilerleme.ozTamamlar.size > 0 && (
              <EksikDurt
                eksikSayisi={ilerleme.katilimcilar.length - ilerleme.ozTamamlar.size}
              />
            )}
          </>
        )}
      </section>

      {tamYetki && (
        <>
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 className="text-lg font-semibold text-gold-light">{tr.admin.yedek.baslik}</h2>
        <p className="mt-1 mb-4 text-sm text-slate-400">{tr.admin.yedek.aciklama}</p>
        <YedekButonu />
      </section>

      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-royal/30 backdrop-blur">
        <h2 className="text-lg font-semibold text-gold-light">{tr.admin.ikili.baslik}</h2>
        <p className="mt-1 mb-4 text-sm text-slate-400">{tr.admin.ikili.aciklama}</p>
        <IkiliKontrol mevcut={ikiliSayisi ?? 0} />
      </section>

      <section
        className={`kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 backdrop-blur ${
          (silmeTalepleri ?? []).length > 0 ? "ring-red-400/40" : "ring-royal/30"
        }`}
      >
        <h2 className="text-lg font-semibold text-gold-light">{tr.kvkk.adminBaslik}</h2>
        <p className="mt-1 text-sm text-slate-400">{tr.kvkk.adminAciklama}</p>
        <SilmeTalepleri
          talepler={(silmeTalepleri ?? []).map((k) => ({
            id: k.id,
            ad: k.full_name,
            takim: k.team,
            tarih: new Intl.DateTimeFormat("tr-TR", {
              timeZone: "Europe/Istanbul",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(k.deletion_requested_at!)),
          }))}
        />
      </section>
        </>
      )}
    </main>
  );
}

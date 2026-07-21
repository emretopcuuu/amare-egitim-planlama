import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { takipDurum, sozTakipAktif, haftalikSayilar } from "@/lib/sozTakip";
import { sozGetir } from "@/lib/soz";
import { hedefCekirdek } from "@/lib/hedef";
import { haftalikGorusmeKotasi } from "@/lib/oyunPlani";
import { degerDavranisiGetir } from "@/lib/degerDavranisi";
import { ortakMomentumGetir } from "@/lib/ortakMomentum";
import TakipAkis from "./TakipAkis";
import { tr } from "@/lib/i18n/tr";
import Link from "next/link";
// [YOLCULUK #6/#9/#18/#20] 90-gün ekranını odaklayan sunucu blokları.
import { fazBul, YOLCULUK_FAZLARI, yolculukGunuHesapla } from "@/lib/davranis";
import { raporHesapla } from "@/lib/rapor";
import YolculukFazSeridi from "@/components/YolculukFazSeridi";

export const metadata = { title: "90 Gün Yolun — Liderlik Aynası" };

// FAZ B — 90 gün takip. Söz mühürlendikten (durum 'sesli') sonra günlük check-in.
export default async function TakipSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const aktif = await sozTakipAktif(db, session.sub);
  if (!aktif) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
        <p className="text-5xl">🧭</p>
        <p className="mt-4 max-w-sm text-slate-300">{tr.takip.aciklama}</p>
        <Link href="/" className="mt-6 text-sm text-royal-light underline-offset-4 hover:underline">
          {tr.takip.anaSayfa}
        </Link>
      </main>
    );
  }

  const [durum, soz, hafta, hedef, degerDavranisi, ortakMomentum, { data: aksTamam }] =
    await Promise.all([
      takipDurum(db, session.sub),
      sozGetir(db, session.sub),
      haftalikSayilar(db, session.sub),
      hedefCekirdek(db, session.sub),
      degerDavranisiGetir(db, session.sub),
      ortakMomentumGetir(db, session.sub),
      // [FAZ 6] Tamamlanmış aksiyon adımlarının index'leri (Yaşayan Plan).
      db.from("soz_aksiyon_tamam").select("aksiyon_index").eq("participant_id", session.sub),
    ]);
  const kota = haftalikGorusmeKotasi(hedef?.plan?.haftalikSaat ?? null);
  const tamamlananAksiyonlar = (aksTamam ?? []).map((a) => a.aksiyon_index);

  // [YOLCULUK] Faz çubuğu + haftan özeti + kas çipi için sunucu verileri.
  const yediGunOnce = new Date(new Date().getTime() - 7 * 86_400_000).toISOString();
  const [{ data: yolBasAyar }, { data: haftaGorevler }] = await Promise.all([
    db.from("settings").select("value").eq("key", "yolculuk_baslangic").maybeSingle(),
    db
      .from("missions")
      .select("spark_points")
      .eq("participant_id", session.sub)
      .eq("status", "scored")
      .gte("scored_at", yediGunOnce),
  ]);
  // Yolculuk günü + o günün evresi (başlangıç set edilmemişse gizli).
  let yolGun = 0;
  let yolcuFaz: { ad: string; index: number } | null = null;
  if (yolBasAyar?.value) {
    yolGun = Math.max(1, Math.min(90, yolculukGunuHesapla(yolBasAyar.value, new Date())));
    const faz = fazBul(yolGun);
    yolcuFaz = { ad: faz.ad, index: YOLCULUK_FAZLARI.findIndex((f) => f.ad === faz.ad) };
  }
  // Haftan: son 7 günün tamamlanan görev + kıvılcım + işaretlenen gün sayısı.
  const haftanGorev = haftaGorevler?.length ?? 0;
  const haftanKivilcim = (haftaGorevler ?? []).reduce((tp, g) => tp + (g.spark_points ?? 0), 0);
  const haftanCheckin = durum.son14.slice(-7).filter((g) => g.yapildi === true).length;
  // [#18] Bu hafta çalışılan kas: 360° kör noktası (yüzüne vurmadan, kas adıyla).
  let kasAd: string | null = null;
  try {
    const rapor = await raporHesapla(db, session.sub);
    kasAd = rapor.korNokta?.ad ?? rapor.gelisim?.[0]?.ad ?? null;
  } catch {
    // rapor hazır değilse kas çipi gösterilmez (akış bozulmaz)
  }
  const y = tr.yolculukUx;

  // [Faz 6] "Bunu sen söyledin" — milestone anlarında kendi sesini (mühürlü
  // sözü) dinletmek için imzalı URL. Söz hiç kaydedilmemişse null.
  let sozSesUrl: string | null = null;
  if (soz?.voice_path) {
    const { data } = await db.storage.from("sesler").createSignedUrl(soz.voice_path, 3600);
    sozSesUrl = data?.signedUrl ?? null;
  }

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      {/* [YOLCULUK] Yolun neresindesin + bu haftanın ritmi + çalışılan kas +
          haftan özeti — hepsi 90-gün odağını kurar (sunucu render, statik). */}
      <div className="mx-auto w-full max-w-md space-y-3 px-5 pt-5">
        {yolGun > 0 && (
          <p className="inline-block rounded-full bg-gold/12 px-3 py-1 text-sm font-semibold text-gold-light">
            {y.gunEtiket(yolGun)}
          </p>
        )}
        {yolcuFaz && (
          <YolculukFazSeridi
            fazlar={YOLCULUK_FAZLARI.map((f) => ({ ad: f.ad }))}
            aktifIndex={yolcuFaz.index}
            aktifAd={yolcuFaz.ad}
          />
        )}
        {/* [#20] Haftan özeti */}
        {(haftanGorev > 0 || haftanCheckin > 0) && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {y.haftanBaslik}
            </span>
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
              {y.haftanGorev(haftanGorev)}
            </span>
            <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-semibold text-gold-light">
              {y.haftanKivilcim(haftanKivilcim)}
            </span>
            <span className="rounded-full bg-royal/20 px-2.5 py-0.5 text-xs font-semibold text-royal-light">
              {y.haftanCheckin(haftanCheckin)}
            </span>
          </div>
        )}
        {/* [#18] Bu hafta çalışılan kas — kör noktayı yüzüne vurmadan, kas adıyla */}
        {kasAd && (
          <p className="rounded-2xl border border-royal-light/25 bg-royal/[0.06] px-4 py-2.5 text-xs leading-relaxed text-royal-light/90">
            💪 {y.kasCip(kasAd)}
          </p>
        )}
        {/* [#9] Haftanın ritmi — Pzt/Paz/akşam/dönüm noktaları tek bakışta */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {y.ritimBaslik}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-slate-300">
            <li>🌙 {y.ritimGunluk}</li>
            <li>🤝 {y.ritimPzt}</li>
            <li>📊 {y.ritimPazar}</li>
            <li>🏁 {y.ritimKm}</li>
          </ul>
        </div>
      </div>
      <TakipAkis
        durum={durum}
        aksiyonlar={soz?.aksiyonlar ?? []}
        tamamlananAksiyonlar={tamamlananAksiyonlar}
        hafta={hafta}
        kota={kota}
        sozSesUrl={sozSesUrl}
        degerDavranisi={degerDavranisi}
        ortakMomentum={ortakMomentum}
      />
    </main>
  );
}

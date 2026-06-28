import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { KAMP_GUNLERI } from "@/lib/kampProgrami";
import { tr } from "@/lib/i18n/tr";
import ProvaModuKontrol from "../ProvaModuKontrol";
import OtomatikZamanlama from "../OtomatikZamanlama";
import IslemGunlugu from "../IslemGunlugu";
import YedekButonu from "../YedekButonu";
import YeniKampButonu from "../YeniKampButonu";
import KodBul from "../KodBul";
import SilmeTalepleri from "../SilmeTalepleri";
import Ipucu from "../Ipucu";
import OtoYenile from "../OtoYenile";
import TerimlerSozluk from "../TerimlerSozluk";
import SunumOynatici from "../sunum/SunumOynatici";
import TestPaneli from "../test/TestPaneli";

export const metadata = { title: "Sistem & Bakım — Liderlik Aynası" };

// ⚙ SİSTEM (kesişen): her aşamada lazım olan genel anahtarlar + bakım araçları.
// Panelden buraya taşındı; panel artık yalnız "durum + sıradaki adım".
export default async function SistemPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [{ data: provaAyar }, { data: dalgalar }, { data: silmeTalepleri }, { data: demolar }] = await Promise.all([
    db.from("settings").select("value").eq("key", "prova_modu").maybeSingle(),
    db.from("waves").select("id, name").order("id"),
    db
      .from("participants")
      .select("id, full_name, team, deletion_requested_at")
      .not("deletion_requested_at", "is", null)
      .order("deletion_requested_at"),
    db
      .from("participants")
      .select("id, full_name, login_code")
      .eq("team", "DEMO")
      .eq("role", "participant")
      .order("full_name"),
  ]);
  const provaAcik = provaAyar?.value === "true";
  const silmeBekleyen = (silmeTalepleri ?? []).length;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-4 pb-28 sm:p-6 sm:pb-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gold">⚙ Sistem & Bakım</h1>
        <div className="flex items-center gap-2">
          <TerimlerSozluk />
          <OtoYenile />
        </div>
      </div>
      <p className="text-sm text-slate-400">
        Aşamadan bağımsız, her zaman lazım olan anahtarlar ve bakım araçları.
      </p>

      <div id="prova" className="scroll-mt-24 rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
          {tr.provaModu.baslikKapali}
          <Ipucu {...tr.admin.yardim.prova} />
        </h2>
        <ProvaModuKontrol acik={provaAcik} />
      </div>

      <div id="zamanlama" className="scroll-mt-24 rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-100">
          {tr.zamanlama.baslik}
          <Ipucu {...tr.admin.yardim.zamanlama} />
        </h2>
        <p className="mt-1 mb-4 text-sm text-slate-400">{tr.zamanlama.aciklama}</p>
        <OtomatikZamanlama dalgalar={(dalgalar ?? []).map((d) => ({ id: d.id, ad: d.name }))} />
      </div>

      <div id="kod" className="scroll-mt-24">
        <KodBul />
      </div>

      <div id="yedek" className="scroll-mt-24 rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-100">
          {tr.admin.yedek.baslik}
          <Ipucu {...tr.admin.yardim.yedek} />
        </h2>
        <p className="mt-1 mb-4 text-sm text-slate-400">{tr.admin.yedek.aciklama}</p>
        <YedekButonu />
        <div className="mt-5 border-t border-white/10 pt-5">
          <IslemGunlugu />
        </div>
      </div>

      <div id="yeni-kamp" className="scroll-mt-24">
        <YeniKampButonu />
      </div>

      {/* KVKK — bekleyen talep varsa kırmızı; boşken sade bilgilendirir. */}
      <div id="kvkk" className="scroll-mt-24">
        {silmeBekleyen > 0 ? (
          <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 shadow-xl ring-1 ring-red-400/40 backdrop-blur">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-red-200">
              {tr.kvkk.adminBaslik}
              <Ipucu {...tr.admin.yardim.kvkk} />
            </h2>
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
        ) : (
          <p className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm text-slate-400">
            {tr.kvkk.adminBaslik}: bekleyen silme talebi yok. ✓
          </p>
        )}
      </div>

      <div id="araclar" className="scroll-mt-24 space-y-5 border-t border-white/10 pt-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gold-light">
          🎭 Sunum & Prova Araçları
        </h2>

        <div className="rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
            {tr.admin.sunum.baslik}
            <Ipucu {...tr.admin.yardim.sunum} />
          </h3>
          <p className="mb-4 text-sm text-slate-400">{tr.admin.sunum.aciklama}</p>
          <SunumOynatici tohum={1} />
        </div>

        <div className="rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
            {tr.admin.test.baslik}
            <Ipucu {...tr.admin.yardim.test} />
          </h3>
          <p className="mb-4 text-sm leading-relaxed text-slate-400">{tr.admin.test.aciklama}</p>
          <TestPaneli
            demolar={(demolar ?? []).map((d) => ({
              id: d.id,
              ad: d.full_name,
              kod: d.login_code,
            }))}
            kampGunleri={[...KAMP_GUNLERI]}
          />
        </div>
      </div>

      <Link href="/admin" className="block text-center text-sm text-royal-light hover:underline">
        ← Yönetim paneline dön
      </Link>
    </main>
  );
}

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  KAMP_GUNLERI,
  KAMP_BASLIK,
  KAMP_ALT_BASLIK,
  ETKINLIK_SIMGESI,
  gunProgrami,
} from "@/lib/kampProgrami";
import { tr } from "@/lib/i18n/tr";
import Katlanir from "../Katlanir";
import Ipucu from "../Ipucu";
import ProgramYonetimi from "../program/ProgramYonetimi";
import CumartesiProgram from "../program/CumartesiProgram";
import SahneKumanda from "../sahne-kumanda/SahneKumanda";
import KomutaSekme from "../KomutaSekme";
import OtoYenile from "../OtoYenile";

export const metadata = { title: "Sahne — Liderlik Aynası" };

function gunEtiketi(tarih: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${tarih}T12:00:00+03:00`));
}

// S10: Program yönetimi + Sahne kumandası tek sayfada birleşti.
export default async function SahnePage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [
    { data: maddeler, error },
    { data: aynaAyar },
    { data: dalgalar },
    { data: vitrinAyar },
  ] = await Promise.all([
    db
      .from("schedule_items")
      .select("id, starts_at, title, location, teaser, reveal_minutes, revealed")
      .order("starts_at"),
    db.from("settings").select("value").eq("key", "ayna_aktif").maybeSingle(),
    db.from("waves").select("id, name, is_open").order("id"),
    db.from("settings").select("value").eq("key", "sahne_slayt").maybeSingle(),
  ]);
  if (error) throw error;

  let vitrin: number | null = null;
  const vh = vitrinAyar?.value;
  if (vh && vh !== "-") {
    const idx = Number(vh.slice(0, vh.indexOf("|")));
    if (Number.isInteger(idx)) vitrin = idx;
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <KomutaSekme />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gold">🎬 Sahne</h1>
          <Ipucu {...tr.admin.yardim.sahne} />
        </div>
        <OtoYenile saniye={15} />
      </div>

      {/* Sahne kumandası — canlı kamp için birincil kontrol */}
      <Katlanir baslik={tr.admin.sahne.baslik} aciklama={tr.admin.sahne.aciklama} ikon="🕹" varsayilanAcik>
        <SahneKumanda
          aynaAktif={aynaAyar?.value === "true"}
          vitrin={vitrin}
          dalgalar={(dalgalar ?? []).map((d) => ({
            id: d.id,
            ad: d.name,
            acik: d.is_open,
          }))}
        />
      </Katlanir>

      {/* Sürpriz duyurular */}
      <Katlanir baslik={tr.admin.program.surprizBaslik} aciklama={tr.admin.program.surprizAciklama} ikon="✨" yardim={tr.admin.yardim.program}>
        <ProgramYonetimi
          maddeler={(maddeler ?? []).map((m) => ({
            id: m.id,
            baslangic: m.starts_at,
            baslik: m.title,
            yer: m.location,
            ipucu: m.teaser,
            acilmaDk: m.reveal_minutes,
            aciklandi: m.revealed,
          }))}
        />
      </Katlanir>

      {/* Resmî kamp akışı — referans */}
      <Katlanir baslik={KAMP_BASLIK} aciklama={KAMP_ALT_BASLIK} ikon="📅" yardim={tr.admin.yardim.program}>
        {KAMP_GUNLERI.map((tarih, i) => {
          const gun = (i + 1) as 1 | 2 | 3;
          return (
            <div key={tarih} className="mt-2">
              <h2 className="border-b border-royal/30 pb-2 text-base font-bold uppercase tracking-widest text-gold-light">
                Gün {gun} — {gunEtiketi(tarih)}
              </h2>
              <ul className="mt-3 space-y-3">
                {gunProgrami(gun).map((m) => (
                  <li
                    key={`${m.gun}-${m.baslangic}`}
                    className="grid gap-2 rounded-xl bg-midnight-soft/60 p-3 sm:grid-cols-[7.5rem_1fr_1fr]"
                  >
                    <p className="font-mono text-sm font-bold text-royal-light">
                      {m.baslangic}–{m.bitis}
                    </p>
                    <div>
                      <p className="text-sm font-semibold text-slate-100">
                        {ETKINLIK_SIMGESI[m.tur]} {m.baslik}
                      </p>
                      {m.konusmaci && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          🎙 {m.konusmaci}
                        </p>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-sky-200/90">
                      <span className="font-bold">{tr.admin.program.aynaPlani}</span>{" "}
                      {m.aynaNotu}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </Katlanir>

      {/* Cumartesi grup programı */}
      <Katlanir
        baslik="Cumartesi Grup Programı (Gün 2)"
        aciklama="Gruplar × oyunlar + David seansları + AYNA görev pencereleri"
        ikon="🎲"
      >
        <CumartesiProgram />
      </Katlanir>
    </main>
  );
}

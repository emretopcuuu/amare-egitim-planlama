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
import ProgramYonetimi from "./ProgramYonetimi";
import CumartesiProgram from "./CumartesiProgram";
import Ipucu from "../Ipucu";
import Katlanir from "../Katlanir";

export const metadata = { title: "Kamp Programı — Liderlik Aynası" };

const t = tr.admin.program;

function gunEtiketi(tarih: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${tarih}T12:00:00+03:00`));
}

export default async function AdminProgramPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const { data: maddeler, error } = await supabaseAdmin()
    .from("schedule_items")
    .select("id, starts_at, title, location, teaser, reveal_minutes, revealed")
    .order("starts_at");
  if (error) throw error;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 p-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gold">{t.baslik}</h1>
          <Ipucu {...tr.admin.yardim.program} />
        </div>
        <p className="mt-1 text-sm text-slate-400">{t.aciklama}</p>
      </div>

      {/* Resmî kamp akışı — uzun referans, katlanır (varsayılan kapalı) */}
      <Katlanir baslik={KAMP_BASLIK} aciklama={KAMP_ALT_BASLIK} ikon="📅" yardim={tr.admin.yardim.program}>
        {KAMP_GUNLERI.map((tarih, i) => {
          const gun = (i + 1) as 1 | 2 | 3;
          return (
            <div key={tarih} className="mt-6">
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
                      {m.sessiz && (
                        <p className="mt-0.5 text-xs font-medium text-amber-400/80">
                          🤫 Sahne sessizliği — AYNA push göndermez
                        </p>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-sky-200/90">
                      <span className="font-bold">{t.aynaPlani}</span>{" "}
                      {m.aynaNotu}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </Katlanir>

      {/* Cumartesi (Gün 2) grup programı — 15 grup × oyun/David + AYNA pencereleri */}
      <Katlanir
        baslik="Cumartesi Grup Programı (Gün 2)"
        aciklama="150 kişi · 15 grup · oyunlar + David seansları + AYNA görev pencereleri"
        ikon="🎲"
        yardim={tr.admin.yardim.program}
      >
        <CumartesiProgram />
      </Katlanir>

      {/* Sürpriz duyurular: AYNA'nın push + sahne anonsuyla açıkladığı ekler */}
      <section>
        <h2 className="text-lg font-bold text-gold-light">{t.surprizBaslik}</h2>
        <p className="mt-1 text-sm text-slate-400">{t.surprizAciklama}</p>
        <div className="mt-4">
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
        </div>
      </section>
    </main>
  );
}

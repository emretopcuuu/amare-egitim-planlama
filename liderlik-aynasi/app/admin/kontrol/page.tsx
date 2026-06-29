import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { aktifOzellikler } from "@/lib/degerlendirme";
import { tr } from "@/lib/i18n/tr";
import Ipucu from "../Ipucu";
import OtoYenile from "../OtoYenile";
import DalgaKontrol from "../DalgaKontrol";

export const metadata = { title: "Kamp Canlı — Liderlik Aynası" };

// Kamp Canlı kontrolü: değerlendirme (dalga) aç/kapat. Final & Sonrası artık
// kendi sayfasında (/admin/final) — funnel aşamaları ayrıştırıldı.
export default async function KontrolPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [{ data: dalgalar, error }, ozellikler] = await Promise.all([
    db.from("waves").select("id, name, is_open").order("id"),
    aktifOzellikler(db),
  ]);
  if (error) throw error;

  const acik = (dalgalar ?? []).find((d) => d.is_open) ?? null;

  // Açık değerlendirmede hiç puanlamamış kişi sayısı (kapatma uyarısı için)
  let puanlamayan = 0;
  if (acik) {
    const [{ data: kisiler }, { data: puanlar }] = await Promise.all([
      db.from("participants").select("id").eq("role", "participant"),
      db.from("ratings").select("rater_id, target_id").eq("wave", acik.id),
    ]);
    const cift = new Map<string, number>();
    for (const p of puanlar ?? []) {
      const a = `${p.rater_id}|${p.target_id}`;
      cift.set(a, (cift.get(a) ?? 0) + 1);
    }
    const puanladigi = new Map<string, number>();
    for (const [a, adet] of cift) {
      if (adet < ozellikler.length) continue;
      const [rater, target] = a.split("|");
      if (rater !== target) puanladigi.set(rater, (puanladigi.get(rater) ?? 0) + 1);
    }
    puanlamayan = (kisiler ?? []).filter((k) => (puanladigi.get(k.id) ?? 0) === 0).length;
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 p-4 pb-28 sm:p-6 sm:pb-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gold">🎬 Kamp Canlı</h1>
        <OtoYenile />
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className={`rounded-full px-3 py-1.5 ring-1 ${acik ? "bg-emerald-400/10 text-emerald-400 ring-emerald-400/20" : "bg-midnight-card/60 text-slate-400 ring-royal/20"}`}>
          🌊 Değerlendirme: {acik?.name ?? "kapalı"}
        </span>
      </div>

      <section id="dalga" className="scroll-mt-24">
        <div className="rounded-xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-100">
            {tr.admin.dalga.baslik}
            <Ipucu {...tr.admin.yardim.dalga} />
          </h2>
          <p className="mt-1 text-sm text-slate-400">{tr.admin.dalga.aciklama}</p>
          <DalgaKontrol
            dalgalar={(dalgalar ?? []).map((d) => ({
              id: d.id,
              ad: d.name,
              acik: d.is_open,
            }))}
            puanlamayan={puanlamayan}
          />
        </div>
      </section>
    </main>
  );
}

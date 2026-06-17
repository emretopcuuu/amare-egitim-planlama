import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tumKayitlar } from "@/lib/tumKayitlar";
import { tr } from "@/lib/i18n/tr";
import OtoYenile from "../OtoYenile";

export const metadata = { title: "Farkındalık Sinyali — Liderlik Aynası" };

const t = tr.admin.farkindalik;

// GELİŞTİRME #10 — Farkındalık Sinyali. "Görev yapıldı" değil "farkındalık
// üretildi" mi? Yansıma kapanışı (#1), Ayna Anı (#3), tanık gözlemi (#5) ve 90
// güne taşınan taahhüt (#9) sinyallerini canlı bir endekste toplar; admin
// kampın gerçekten dönüştürüp dönüştürmediğini tek bakışta görür.
export default async function FarkindalikPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [
    { count: scoredCount },
    { count: reflectedCount },
    { count: carriedCount },
    { count: mirrorSeenCount },
    { count: tanikCount },
    puanlar,
  ] = await Promise.all([
    db.from("missions").select("id", { count: "exact", head: true }).eq("status", "scored"),
    db.from("missions").select("id", { count: "exact", head: true }).not("reflection_text", "is", null),
    db.from("missions").select("id", { count: "exact", head: true }).not("carried_at", "is", null),
    db.from("mirror_moments").select("id", { count: "exact", head: true }).not("seen_at", "is", null),
    db.from("gorev_tanik").select("id", { count: "exact", head: true }).not("confirmed_at", "is", null),
    tumKayitlar<{ ai_score: number | null }>((bas, son) =>
      db.from("missions").select("ai_score").eq("status", "scored").not("ai_score", "is", null).order("id").range(bas, son)
    ),
  ]);

  const scored = scoredCount ?? 0;
  const reflected = reflectedCount ?? 0;
  const carried = carriedCount ?? 0;
  const mirrorSeen = mirrorSeenCount ?? 0;
  const tanik = tanikCount ?? 0;

  const puanlanan = puanlar.filter((p) => p.ai_score !== null);
  const ortPuan = puanlanan.length
    ? puanlanan.reduce((toplam, p) => toplam + (p.ai_score ?? 0), 0) / puanlanan.length
    : 0;

  // Oranlar
  const yansimaOrani = scored > 0 ? reflected / scored : 0; // tamamlanan görevin kaçı içgörüye döndü
  const tasimaOrani = reflected > 0 ? carried / reflected : 0; // yansımanın kaçı taahhüde döndü

  // Farkındalık Endeksi (0-100): yansıma %40, taşıma %30, ortalama puan %30.
  const endeks = Math.round(yansimaOrani * 40 + tasimaOrani * 30 + (ortPuan / 10) * 30);
  const endeksRenk = endeks >= 66 ? "text-emerald-300" : endeks >= 40 ? "text-gold" : "text-amber-300";

  const metrikler: { etiket: string; deger: string; alt: string }[] = [
    { etiket: t.yansimaOrani, deger: `%${Math.round(yansimaOrani * 100)}`, alt: t.yansimaAlt(reflected, scored) },
    { etiket: t.tasimaOrani, deger: `%${Math.round(tasimaOrani * 100)}`, alt: t.tasimaAlt(carried) },
    { etiket: t.ortPuan, deger: ortPuan ? ortPuan.toFixed(1) : "—", alt: t.ortPuanAlt },
    { etiket: t.aynaAni, deger: String(mirrorSeen), alt: t.aynaAniAlt },
    { etiket: t.tanik, deger: String(tanik), alt: t.tanikAlt },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 p-6">
      <OtoYenile saniye={60} />
      <header>
        <h1 className="text-2xl font-bold text-gold">{t.baslik}</h1>
        <p className="mt-1 text-sm text-slate-400">{t.altBaslik}</p>
      </header>

      {/* Farkındalık Endeksi — tek bakışta "kamp dönüştürüyor mu?" */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-6 text-center shadow-xl ring-1 ring-gold/30 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t.endeksBaslik}</p>
        <p className={`mt-1 text-6xl font-bold ${endeksRenk}`}>{endeks}</p>
        <p className="mt-1 text-xs text-slate-500">{t.endeksAlt}</p>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-gold to-emerald-400 transition-all"
            style={{ width: `${Math.max(2, endeks)}%` }}
          />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {metrikler.map((m) => (
          <div key={m.etiket} className="rounded-2xl bg-midnight-card/60 p-4 ring-1 ring-royal/30">
            <p className="text-xs text-slate-400">{m.etiket}</p>
            <p className="mt-1 text-2xl font-bold text-slate-100">{m.deger}</p>
            <p className="mt-0.5 text-[0.65rem] leading-snug text-slate-500">{m.alt}</p>
          </div>
        ))}
      </section>

      <p className="text-xs leading-relaxed text-slate-500">{t.aciklama}</p>
    </main>
  );
}

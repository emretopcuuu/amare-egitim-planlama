import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import OtoYenile from "../OtoYenile";

export const metadata = { title: "Mentorluk Ağı — Liderlik Aynası" };

export default async function MentorlukPage() {
  const session = await getSession();
  if (!session || (session.rol !== "admin" && session.rol !== "yardimci")) {
    redirect("/admin/giris");
  }
  const db = supabaseAdmin();

  const [{ data: kayitlar }, { data: kisiler }] = await Promise.all([
    db
      .from("mentorluk_kayit")
      .select("mentee_id, secilen_id, konustu, gun, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    db.from("participants").select("id, full_name").eq("role", "participant"),
  ]);
  const ad = new Map((kisiler ?? []).map((k) => [k.id, k.full_name]));
  const tum = kayitlar ?? [];

  // İstatistik
  const toplam = tum.length;
  const secimli = tum.filter((k) => k.secilen_id).length;
  const konusan = tum.filter((k) => k.konustu).length;

  // En çok mentor seçilenler
  const mentorSayac = new Map<string, number>();
  for (const k of tum) if (k.secilen_id) mentorSayac.set(k.secilen_id, (mentorSayac.get(k.secilen_id) ?? 0) + 1);
  const enCokMentor = [...mentorSayac.entries()]
    .map(([id, n]) => ({ ad: ad.get(id) ?? "—", n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 12);
  const enCok = enCokMentor[0]?.n ?? 1;

  // Son seçimler (mentee → mentor)
  const sonSecimler = tum.filter((k) => k.secilen_id).slice(0, 30);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6 pb-28 sm:pb-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gold">🤝 Mentorluk Ağı</h1>
        <OtoYenile />
      </div>
      <p className="text-sm text-slate-400">
        Kim kimi mentor seçti, konuşma gerçekleşti mi — zamanla büyüyen ağ.
      </p>

      {/* İstatistik */}
      <section className="grid grid-cols-3 gap-3 text-center">
        <div className="kart-3d rounded-2xl bg-midnight-card/60 p-4 ring-1 ring-royal/30">
          <p className="text-2xl font-bold text-gold">{toplam}</p>
          <p className="text-xs text-slate-400">verilen mentorluk görevi</p>
        </div>
        <div className="kart-3d rounded-2xl bg-midnight-card/60 p-4 ring-1 ring-royal/30">
          <p className="text-2xl font-bold text-royal-light">{secimli}</p>
          <p className="text-xs text-slate-400">mentor seçildi</p>
        </div>
        <div className="kart-3d rounded-2xl bg-midnight-card/60 p-4 ring-1 ring-royal/30">
          <p className="text-2xl font-bold text-emerald-300">{konusan}</p>
          <p className="text-xs text-slate-400">konuşma tamamlandı</p>
        </div>
      </section>

      {/* En çok aranan mentorlar */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gold-light">
          En çok mentor seçilenler
        </h2>
        {enCokMentor.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">Henüz mentor seçimi yok.</p>
        ) : (
          <div className="mt-3 space-y-1.5">
            {enCokMentor.map((m) => (
              <div key={m.ad} className="flex items-center gap-2">
                <span className="w-36 shrink-0 truncate text-sm text-slate-200">{m.ad}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-royal-light to-gold"
                    style={{ width: `${Math.round((m.n / enCok) * 100)}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-sm font-bold text-gold-light">{m.n}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Son seçimler */}
      <section className="kart-3d rounded-2xl bg-midnight-card/60 p-5 ring-1 ring-royal/30">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gold-light">
          Son mentor seçimleri
        </h2>
        {sonSecimler.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">Henüz seçim yok.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/5 text-sm">
            {sonSecimler.map((k, i) => (
              <li key={i} className="flex items-center justify-between gap-2 py-2">
                <span className="min-w-0 truncate text-slate-200">
                  {ad.get(k.mentee_id) ?? "—"}{" "}
                  <span className="text-slate-500">→</span>{" "}
                  <span className="font-medium text-gold-light">{ad.get(k.secilen_id!) ?? "—"}</span>
                </span>
                <span className={`shrink-0 text-xs ${k.konustu ? "text-emerald-400" : "text-slate-500"}`}>
                  {k.konustu ? "✓ konuştu" : "seçti"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href="/admin" className="block text-center text-sm text-royal-light hover:underline">
        ← Yönetim paneline dön
      </Link>
    </main>
  );
}

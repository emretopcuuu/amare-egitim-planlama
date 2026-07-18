import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tumKayitlar } from "@/lib/tumKayitlar";
import { tr } from "@/lib/i18n/tr";
import { muhurBul } from "@/lib/takdirMuhur";
import GeriButonu from "@/components/GeriButonu";

export const metadata = { title: "Takdir Mektubun — Liderlik Aynası" };

const t = tr.takdir;

// A10 — KAPANIŞ TAKDİR MEKTUBU. Kamp boyunca alınan TÜM takdirler tek şık sayfada
// birleşir — eve götürülen hatıra. Gün 3'te AYNA bunu tek mektup olarak sunar,
// ama sayfa her zaman erişilebilir (kişi istediğinde geri dönüp okuyabilir).
export default async function TakdirMektupPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const gelenler = await tumKayitlar<{
    id: string;
    message: string;
    kategori: string | null;
    created_at: string;
    gonderen: { full_name: string } | null;
  }>((bas, son) =>
    db
      .from("kudos")
      .select("id, message, kategori, created_at, gonderen:participants!kudos_from_id_fkey(full_name)")
      .eq("to_id", session.sub)
      .eq("is_hidden", false)
      .order("created_at", { ascending: true })
      .range(bas, son)
  );

  const adSade = session.ad?.split(" ")[0] ?? "";

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="sahne-giris mx-auto my-auto w-full max-w-md space-y-5 p-5">
        <GeriButonu />
        <header className="text-center">
          <h1 className="prizma-serif ay-metin text-3xl font-semibold leading-tight">
            {t.mektupBaslik}
          </h1>
          <p className="mt-2 text-base leading-relaxed text-slate-300">
            {t.mektupAltBaslik(gelenler.length)}
          </p>
        </header>

        {gelenler.length === 0 ? (
          <section className="kart-cam rounded-3xl p-6 text-center">
            <p className="text-base leading-relaxed text-slate-300">{t.mektupBos}</p>
            <Link href="/takdir" className="mt-3 inline-block text-sm font-semibold text-gold-light">
              {t.mektupGeriTakdir}
            </Link>
          </section>
        ) : (
          <section className="kart-cam rounded-3xl p-6">
            <p className="prizma-serif text-lg text-gold-light">{t.mektupSelam(adSade)}</p>
            <div className="mt-4 space-y-4">
              {gelenler.map((g) => {
                const m = muhurBul(g.kategori);
                return (
                  <div key={g.id} className="border-l-2 border-gold/30 pl-3">
                    <p className="text-base leading-relaxed text-slate-100">“{g.message}”</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {m ? `${m.emoji} ` : ""}
                      {t.kimden(g.gonderen?.full_name ?? "Bir arkadaşın")}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="prizma-serif mt-5 text-right text-sm text-gold-light">{t.mektupImza}</p>
          </section>
        )}
      </div>
    </main>
  );
}

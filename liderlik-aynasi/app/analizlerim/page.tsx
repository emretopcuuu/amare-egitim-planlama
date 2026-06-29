import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { analizListeSesli } from "@/lib/aynaAnaliz";
import { tr } from "@/lib/i18n/tr";
import AynaAnalizDeneyim from "@/components/AynaAnalizDeneyim";

const t = tr.analiz;

export const dynamic = "force-dynamic";

// AYNA'NIN ANALİZLERİ — ana sayfa ☰ menüsünden açılır. Kişiye dair zaman içinde
// biriken analizler ardışık (üst üste yazılmadan) listelenir; her biri kendi
// dönen ayna + ses deneyiyle açılır.
export default async function AnalizlerimSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const liste = await analizListeSesli(supabaseAdmin(), session.sub);

  const gunBicim = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-md px-5 pt-[calc(1rem+env(safe-area-inset-top))]">
        <Link
          href="/"
          className="inline-flex h-10 items-center gap-1.5 text-sm text-slate-300 hover:text-slate-100"
        >
          ← Ana sayfa
        </Link>
        <h1 className="prizma-serif ay-metin mt-3 flex items-center gap-2 text-2xl font-bold">
          <span aria-hidden>🪞</span>
          {t.listeBaslik}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{t.listeAciklama}</p>
      </div>

      <div className="mx-auto w-full max-w-md flex-1 space-y-3 px-5 py-6">
        {liste.length === 0 ? (
          <p className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-center text-sm text-slate-400">
            {t.listeBos}
          </p>
        ) : (
          liste.map((a) => (
            <AynaAnalizDeneyim
              key={a.asama}
              asama={a.asama}
              etiket={t.asamaAd[a.asama] ?? a.asama}
              altEtiket={gunBicim.format(new Date(a.created_at))}
              hazir={{
                metin: a.metin,
                sesUrl: a.sesUrl,
                yenidenKullanildi: a.yeniden_kullanildi,
              }}
            />
          ))
        )}
      </div>
    </main>
  );
}

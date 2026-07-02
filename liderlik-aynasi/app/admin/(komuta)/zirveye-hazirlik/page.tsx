import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { hazirlikDurumu } from "@/lib/zirveHazirlik";
import ZirveHazirlik from "./ZirveHazirlik";

export const metadata = { title: "Zirveye Hazırlık — Liderlik Aynası" };
export const revalidate = 0;

// [E1-a] ZİRVEYE HAZIRLIK paneli: reveal öncesi tüm Ayna Mektupları + sesleri tek
// düğmeyle, idempotent, canlı ilerlemeyle ön-üret. Amaç: kapanışta 29 telefon aynı
// anda açtığında API yükü ~sıfır olsun.
export default async function ZirveHazirlikPage() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const durum = await hazirlikDurumu(supabaseAdmin());

  return (
    <main className="mx-auto w-full max-w-lg flex-1 space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gold">🛡️ Zirveye Hazırlık</h1>
        <p className="mt-1 text-sm text-slate-400">
          Kapanıştan önce tüm Ayna Mektupları ve seslerini önceden üret. Reveal anında 29 telefon aynı anda açsa
          bile yük olmaz. Tekrar basmak zararsız — üretilmişi atlar.
        </p>
      </div>
      <ZirveHazirlik ilk={durum} />
      <p className="text-xs text-slate-500">
        Rapor verisi anlık hesaplanır (ön-üretim gerekmez). Ses yalnız kendi ses klonu olan katılımcılar için
        üretilir; klonu olmayan kapanışta marka sesiyle dinler.
      </p>
    </main>
  );
}

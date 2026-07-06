import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { raporlarGorunurMu } from "@/lib/rapor";
import { oyunPlaniGetir } from "@/lib/oyunPlani";
import GeriButonu from "@/components/GeriButonu";
import PlanAtolyesi from "./PlanAtolyesi";

export const metadata = { title: "90 Günlük Oyun Planım — Liderlik Aynası" };

// PLAN ATÖLYESİ (/oyun-planim) — kişi, AYNA'nın ÖNERİSİNDEN kendi 90 günlük oyun
// planını kurar (kabul/düzenle/çıkar/ekle + danış). "Planım hazır" → onaylanır
// (kilit) → Sözünü Ver açılır. Rapor okunmadan (reports_visible) buraya gelinmez.
//
// ÖNEMLİ: Plan ÜRETİMİ (Opus, ~10-20 sn) burada değil, CLIENT'ta yapılır — SSR'de
// üretmek sunucu fonksiyonu zaman aşımına düşürüp ekranda sessiz takılmaya yol
// açıyordu. Sunucu yalnız MEVCUT planı hızlıca okur; yoksa client üretir + gösterir.
export default async function OyunPlanimSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  if (!(await raporlarGorunurMu(db))) {
    // Rapor henüz açılmadıysa plan da yok — ana sayfaya bırak.
    redirect("/");
  }

  const mevcut = await oyunPlaniGetir(db, session.sub);

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-5 p-5">
      <GeriButonu />
      <PlanAtolyesi ilkPlan={mevcut} />
    </main>
  );
}

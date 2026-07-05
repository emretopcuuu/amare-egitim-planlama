import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { raporlarGorunurMu } from "@/lib/rapor";
import { oyunPlaniGetirVeyaUret } from "@/lib/oyunPlani";
import GeriButonu from "@/components/GeriButonu";
import PlanAtolyesi from "./PlanAtolyesi";

export const metadata = { title: "90 Günlük Oyun Planım — Liderlik Aynası" };

// PLAN ATÖLYESİ (/oyun-planim) — kişi, AYNA'nın ÖNERİSİNDEN kendi 90 günlük oyun
// planını kurar (kabul/düzenle/çıkar/ekle + danış). "Planım hazır" → onaylanır
// (kilit) → Sözünü Ver açılır. Rapor okunmadan (reports_visible) plan üretilmez.
export default async function OyunPlanimSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  if (!(await raporlarGorunurMu(db))) {
    // Rapor henüz açılmadıysa plan da yok — ana sayfaya bırak.
    redirect("/");
  }

  const sonuc = await oyunPlaniGetirVeyaUret(db, session.sub);

  if (sonuc.durum !== "hazir") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center p-6 text-center">
        <p className="text-5xl" aria-hidden>🧭</p>
        <h1 className="prizma-serif ay-metin mt-4 text-2xl font-semibold">Plan bu an kurulamadı</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {sonuc.durum === "anahtar-yok"
            ? "Plan motoru şu an kapalı. Birazdan tekrar dene."
            : "Bir aksilik oldu. Sayfayı yenileyip tekrar dene — verilerin duruyor."}
        </p>
        <Link href="/" className="btn-kor mt-6 inline-flex h-11 items-center justify-center rounded-xl px-6 font-semibold">
          Ana sayfa
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-5 p-5">
      <GeriButonu />
      <PlanAtolyesi plan={sonuc.plan} />
    </main>
  );
}

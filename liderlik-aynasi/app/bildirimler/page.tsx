import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { bildirimleriGetir } from "@/lib/bildirim";
import BildirimListesi from "./BildirimListesi";

export const metadata = { title: "Bildirimlerim — Liderlik Aynası" };
export const dynamic = "force-dynamic";

// Bildirim gelen kutusu (DB tabanlı): AYNA'nın gönderdiği TÜM bildirimler tek
// yerde — push gelmese de burada. İsim çipindeki zile dokununca gelinir,
// "Geri" ana sayfaya döner; görevle ilgili bildirime dokununca göreve gider.
export default async function BildirimlerPage() {
  const session = await getSession();
  if (!session || session.rol !== "participant") redirect("/giris");

  const liste = await bildirimleriGetir(supabaseAdmin(), session.sub);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 space-y-5 p-5 pb-28 pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <header>
        <Link
          href="/"
          className="inline-flex h-10 items-center gap-1.5 text-sm text-slate-300 hover:text-slate-100"
        >
          ← Ana sayfa
        </Link>
        <h1 className="prizma-serif ay-metin mt-2 text-2xl font-semibold">🔔 Bildirimlerim</h1>
        <p className="mt-1 text-sm text-slate-400">
          AYNA&apos;nın sana gönderdiği bildirimler burada toplanır.
        </p>
      </header>
      <BildirimListesi bildirimler={liste} />
    </main>
  );
}

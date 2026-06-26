import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import BildirimListesi from "./BildirimListesi";

export const metadata = { title: "Bildirimlerim — Liderlik Aynası" };

export default async function BildirimlerPage() {
  const session = await getSession();
  if (!session || session.rol !== "participant") redirect("/giris");

  return (
    <main className="mx-auto w-full max-w-lg flex-1 space-y-5 p-5 pb-28">
      <header>
        <h1 className="prizma-serif ay-metin text-2xl font-semibold">🔔 Bildirimlerim</h1>
        <p className="mt-1 text-sm text-slate-400">
          Son aldığın uygulama bildirimleri burada görünür.
        </p>
      </header>
      <BildirimListesi />
    </main>
  );
}

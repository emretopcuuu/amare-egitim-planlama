import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import GeriButonu from "@/components/GeriButonu";
import IkinciAynaBolumu from "./IkinciAynaBolumu";

export const metadata = { title: "İkinci Aynan — Liderlik Aynası" };

// FAZ 13 — 90. GÜN FİNALİ. Kamptaki Ayna Mektubu'nun 90 gün sonraki karşılığı:
// kişinin sözünden bugüne yürüdüğü yolu tek kapanış mektubuna döker. Üretim
// client'ta (mektup.ts/oyunPlani.ts deseniyle, SSR timeout riski olmadan).
export default async function IkinciAynaSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-5 p-5">
      <GeriButonu />
      <IkinciAynaBolumu />
    </main>
  );
}

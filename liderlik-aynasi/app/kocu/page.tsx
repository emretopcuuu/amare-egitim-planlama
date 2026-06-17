import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import KocuSohbet from "./KocuSohbet";

export const metadata = { title: "Ayna Koçu — Liderlik Aynası" };

// GELİŞTİRME #1 — Ayna Koçu: adayın her an danışabildiği bağlamsal AYNA sohbeti.
export default async function KocuSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <KocuSohbet />
    </main>
  );
}

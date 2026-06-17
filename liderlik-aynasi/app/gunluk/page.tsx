import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import GunlukCumle from "./GunlukCumle";

export const metadata = { title: "Tek Cümle — Liderlik Aynası" };

// GELİŞTİRME #8 (2.tur): Günlük "Tek Cümle" — her gün AYNA bir mikro-yansıma
// sorar, aday tek cümle bırakır, seri (streak) ödüllenir.
export default async function GunlukPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  return (
    <main className="mx-auto w-full max-w-md flex-1 p-5">
      <GunlukCumle />
    </main>
  );
}

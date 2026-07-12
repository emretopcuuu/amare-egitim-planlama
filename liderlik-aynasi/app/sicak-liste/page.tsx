import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sicakListeGetir } from "@/lib/sicakListe";
import SicakListeClient from "./SicakListeClient";

export const metadata = { title: "Sıcak Liste — Liderlik Aynası" };

// #2 Sıcak liste sayfası — kişinin gerçek aday listesi (kamp görevleri bunu kullanır).
export default async function SicakListeSayfa() {
  const s = await getSession();
  if (!s) redirect("/giris");
  if (s.rol !== "participant") redirect("/admin");
  const liste = await sicakListeGetir(supabaseAdmin(), s.sub);
  return <SicakListeClient baslangic={liste} />;
}

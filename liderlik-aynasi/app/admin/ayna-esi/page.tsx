import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import AynaEsiPanel from "./AynaEsiPanel";

export const metadata = { title: "Ayna Eşi — Liderlik Aynası" };

type Kisi = { full_name: string; team: string | null };
type Satir = {
  id: string;
  tur: number;
  slot: string;
  a_verir: number;
  b_verir: number;
  a_tamam: boolean;
  b_tamam: boolean;
  a: Kisi | null;
  b: Kisi | null;
};

export default async function AynaEsiAdminSayfa() {
  const session = await getSession();
  if (!session || session.rol !== "admin") redirect("/admin/giris");

  const db = supabaseAdmin();
  const [{ data: ayar }, { data: satirlar }] = await Promise.all([
    db.from("settings").select("value").eq("key", "ayna_esi_acik").maybeSingle(),
    db
      .from("ayna_esi")
      .select(
        "id, tur, slot, a_verir, b_verir, a_tamam, b_tamam, a:participants!ayna_esi_a_id_fkey(full_name, team), b:participants!ayna_esi_b_id_fkey(full_name, team)"
      )
      .order("tur")
      .order("slot"),
  ]);

  const acik = ayar?.value === "true";

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-5 p-5">
      <header>
        <h1 className="prizma-serif ay-metin text-2xl font-semibold">{tr.aynaEsi.adminBaslik}</h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">{tr.aynaEsi.adminAciklama}</p>
      </header>
      <AynaEsiPanel acik={acik} satirlar={(satirlar ?? []) as unknown as Satir[]} />
    </main>
  );
}

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { takipEttiklerim } from "@/lib/sozTakip";
import SahitlikPanel from "./SahitlikPanel";

export const metadata = { title: "Şahitliğin — Liderlik Aynası" };

// FAZ B — Şahit paneli. Lider, sözüne şahit olduğu kişileri takip eder; takılana
// dürtme/teşvik gönderir, gerekirse arar.
export default async function SahitlikSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const kisiler = await takipEttiklerim(db, session.sub);

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <SahitlikPanel kisiler={kisiler} />
    </main>
  );
}

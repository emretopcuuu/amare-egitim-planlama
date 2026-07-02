import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { zincirDurumu } from "@/lib/muhurZinciri";
import MuhurZinciri from "./MuhurZinciri";

export const metadata = { title: "Mühür Zinciri — Liderlik Aynası" };
export const revalidate = 0;

// [4.2] ARA MÜHÜR ZİNCİRİ — kamptaki söz zincirin ilk halkası; +30/+60/+90'da
// kişi sözünü yeniden okuyup teyit ekler. Zincir görünür şekilde uzar.
export default async function MuhurZinciriPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const durum = await zincirDurumu(db, session.sub);

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="sahne-giris mx-auto w-full max-w-md space-y-4 p-5">
        <header>
          <h1 className="font-display altin-metin text-2xl font-bold leading-tight">🔗 Mühür Zinciri</h1>
          <p className="mt-1 text-sm text-slate-400">
            Kampta bir söz mühürledin. Her ay onu yeniden oku, tek cümleyle teyit et — zincirin uzasın.
          </p>
        </header>
        <MuhurZinciri soz={durum.soz} halkalar={durum.halkalar} />
      </div>
    </main>
  );
}

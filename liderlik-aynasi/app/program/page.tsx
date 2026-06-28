import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { KAMP_BASLIK } from "@/lib/kampProgrami";
import { tr } from "@/lib/i18n/tr";
import GeriButonu from "@/components/GeriButonu";
import GunProgramKarti from "@/components/GunProgramKarti";

export const metadata = { title: "Program — Liderlik Aynası" };

const t = tr.program;

// PROGRAM SEKMESİ — katılımcının KİŞİSEL 3 günlük programı (Cuma · Cumartesi
// kendi grubuna özel · Pazar). Günler katlanır; istenen güne basınca o günün
// detaylı çizelgesi açılır, bugünse "Şu an / Sırada" canlı görünür.
// (Eskiden burada genel program tümü açık duruyordu; kişisel program ana
// ekrandaydı. Kullanıcı isteğiyle kişisel program tek yere — buraya — taşındı;
// ana ekran sadeleşti, karmaşa kalktı.)
export default async function ProgramPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const { data: kisi } = await supabaseAdmin()
    .from("participants")
    .select("team")
    .eq("id", session.sub)
    .maybeSingle();

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="sahne-giris mx-auto my-auto w-full max-w-md space-y-6 p-5">
        <GeriButonu />
        <header>
          <p className="text-sm font-medium uppercase tracking-widest text-royal-light">
            {KAMP_BASLIK}
          </p>
          <h1 className="font-display altin-metin mt-1 text-3xl font-bold text-gold">
            {t.baslik}
          </h1>
          <p className="mt-1 text-base text-slate-400">{t.altBaslik}</p>
        </header>

        <GunProgramKarti takim={kisi?.team ?? null} />
      </div>
    </main>
  );
}

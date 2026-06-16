import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import Mini360Dis from "./Mini360Dis";

export const metadata = { title: "Ekip Aynası — Liderlik Aynası" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Anonim akran değerlendirmesi: girişsiz erişilir (proxy PUBLIC_ROUTES). Yalnız
// hedefin adını gösterir; değerlendiren kimliği hiç istenmez/saklanmaz.
export default async function Mini360DisSayfa({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const { data: hedef } = await supabaseAdmin()
    .from("participants")
    .select("full_name")
    .eq("id", id)
    .eq("role", "participant")
    .maybeSingle();
  if (!hedef) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <div className="kart-cam max-w-md rounded-3xl p-10">
          <p className="text-5xl" aria-hidden>🔒</p>
          <p className="mt-4 text-base text-slate-300">{tr.mini360.disGecersiz}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 p-5">
      <Mini360Dis hedefId={id} ad={hedef.full_name.split(" ")[0]} />
    </main>
  );
}

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { pusulaDurum, pusulaGecmis } from "@/lib/pusula";
import { tr } from "@/lib/i18n/tr";
import PusulaSohbet from "./PusulaSohbet";

const t = tr.pusula;

// FAZ 0 — Nedenler çalışması. Kamp öncesi kişiselleştirme omurgası.
// Tamamlandıysa: "kampta görüşürüz" bekleme ekranı (kilit oda QR ile açılır).
export default async function PusulaSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/");

  const db = supabaseAdmin();
  const [durum, gecmis, { data: kisi }] = await Promise.all([
    pusulaDurum(db, session.sub),
    pusulaGecmis(db, session.sub),
    db.from("participants").select("consent_at").eq("id", session.sub).maybeSingle(),
  ]);

  if (durum.tamam) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <div className="kart-cam max-w-md rounded-3xl p-10">
          <p className="text-5xl" aria-hidden>
            🧭
          </p>
          <h1 className="prizma-serif ay-metin mt-4 text-2xl font-semibold">
            {t.kampBekleBaslik}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-300">
            {t.kampBekleMetin}
          </p>
        </div>
      </main>
    );
  }

  return (
    <PusulaSohbet
      baslangic={gecmis}
      rizaVar={!!kisi?.consent_at}
      onceliklerVar={durum.onceliklerVar}
    />
  );
}

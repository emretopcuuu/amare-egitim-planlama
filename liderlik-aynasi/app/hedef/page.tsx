import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { hedefDurum, hedefGecmis } from "@/lib/hedef";
import { pusulaCekirdek } from "@/lib/pusula";
import HedefAkis from "./HedefAkis";

export const metadata = { title: "Hedefin — Liderlik Aynası" };

// FAZ A — Hedef (Gün 2). Nedenler (Pusula) tamamlandıktan SONRA, admin "hedef_acik"
// açınca devreye girer. Akış: başlangıç noktası → kısa AI sohbeti → kariyer/gelir
// tablosu → 3 soru → kişisel kariyer planı (mühürlenir).
export default async function HedefSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const [durum, gecmis, cekirdek] = await Promise.all([
    hedefDurum(db, session.sub),
    hedefGecmis(db, session.sub),
    pusulaCekirdek(db, session.sub),
  ]);

  const neden = cekirdek?.cekirdek_neden?.[0] ?? null;

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <HedefAkis
        durum={durum}
        gecmis={gecmis}
        ad={session.ad.split(" ")[0]}
        neden={neden}
      />
    </main>
  );
}

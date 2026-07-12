import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { pusulaOzeti } from "@/lib/pusula";
import { aynaKarakterAcikMi, aynaIliskiDurumu, type AynaIliski } from "@/lib/aynaKarakter";
import KocuSohbet from "./KocuSohbet";

export const metadata = { title: "Ayna Koçu — Liderlik Aynası" };

// İlk cümleyi al (hafıza şeridi için kısa tutulur).
function ilkCumle(metin: string): string {
  const eslesme = metin.match(/[^.!?]*[.!?]/);
  const c = (eslesme?.[0] ?? metin).trim();
  return c.length > 140 ? `${c.slice(0, 137)}…` : c;
}

// GELİŞTİRME #1 — Ayna Koçu: adayın her an danışabildiği bağlamsal AYNA sohbeti.
export default async function KocuSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  // #4 Hafıza şeridi: AYNA'nın kişi hakkında bildiği çekirdek (Pusula özeti).
  // "Seni hatırlıyorum" hissi — sohbete güvenle başlatır.
  const db = supabaseAdmin();
  const ozet = await pusulaOzeti(db, session.sub);
  const hafiza = ozet ? ilkCumle(ozet) : null;

  // Faz 2 — başlıktaki AYNA pozu ilişki durumuna göre (küs → küs poz; sohbete
  // yazınca prompt tarafı zaten barışma tonuyla karşılar).
  let aynaDurum: AynaIliski = "sicak";
  if (await aynaKarakterAcikMi(db)) {
    const { data: sonYanit } = await db
      .from("missions")
      .select("responded_at")
      .eq("participant_id", session.sub)
      .not("responded_at", "is", null)
      .order("responded_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    aynaDurum = aynaIliskiDurumu(sonYanit?.responded_at ?? null);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <KocuSohbet hafiza={hafiza} aynaDurum={aynaDurum} />
    </main>
  );
}

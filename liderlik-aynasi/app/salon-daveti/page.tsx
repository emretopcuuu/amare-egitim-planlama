import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import SalonDaveti from "./SalonDaveti";

export const metadata = { title: "Salon Daveti — Liderlik Aynası" };

// [1.5] SALON DAVETİ — katılımcı sayfası (Gün 3 75. dk telefon anı).
export default async function SalonDavetiPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const { data: mevcut } = await db
    .from("salon_daveti")
    .select("id, gonderildi_at")
    .eq("participant_id", session.sub)
    .not("gonderildi_at", "is", null)
    .limit(1)
    .maybeSingle();

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="sahne-giris mx-auto w-full max-w-md space-y-4 p-5">
        <header>
          <h1 className="font-display altin-metin text-2xl font-bold leading-tight">🕊️ Salon Daveti</h1>
          <p className="mt-1 text-sm text-slate-400">
            Bu salondan bir davet çıksın. Tek bir isim — gerisini birlikte yazarız.
          </p>
        </header>
        <SalonDaveti zatenGonderildi={!!mevcut} />
      </div>
    </main>
  );
}

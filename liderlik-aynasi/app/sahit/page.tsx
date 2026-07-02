import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tokenSahibi } from "@/lib/sozMuhur";
import SahitOnay from "./SahitOnay";

export const metadata = { title: "Şahit Ol — Liderlik Aynası" };
export const revalidate = 0;

// [E3] Yüz yüze şahitlik: söz veren telefonunda QR gösterir; şahit okutunca buraya
// gelir (?u=token). Şahit kendi oturumuyla onaylar → söz sahibinin mührüne bir imza.
export default async function SahitPage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const { u } = await searchParams;
  const token = (u ?? "").trim();
  const sahibiAd = token ? await tokenSahibi(supabaseAdmin(), token) : null;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
      <div className="sahne-giris w-full max-w-sm space-y-4">
        {!sahibiAd ? (
          <>
            <p className="text-5xl" aria-hidden>🔍</p>
            <p className="text-slate-300">Şahit olunacak kişi bulunamadı. QR&apos;ı tekrar okut.</p>
          </>
        ) : (
          <SahitOnay token={token} sahibiAd={sahibiAd} />
        )}
      </div>
    </main>
  );
}

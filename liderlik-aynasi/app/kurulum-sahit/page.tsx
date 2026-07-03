import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tokenSahibi } from "@/lib/sozMuhur";
import KurulumSahitOnay from "./KurulumSahitOnay";

export const metadata = { title: "El Ele — Liderlik Aynası" };
export const revalidate = 0;

// [KURULUM 8] Kurulum doğrulama: kurulu kişi QR gösterir; komşu okutunca buraya
// gelir (?u=token). Onaylayınca ikisi de "El Ele" rozeti kazanır (ikisinin de
// bildirimi açık olmalı). Söz şahitlik akışının (/sahit) kurulum-kanıtı ikizi.
export default async function KurulumSahitPage({
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
            <p className="text-slate-300">Doğrulanacak kişi bulunamadı. QR&apos;ı tekrar okut.</p>
          </>
        ) : (
          <KurulumSahitOnay token={token} sahibiAd={sahibiAd.split(" ")[0]} />
        )}
      </div>
    </main>
  );
}

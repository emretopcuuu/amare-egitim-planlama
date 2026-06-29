import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import OyunSecici from "./OyunSecici";
import KurulumGecidi from "@/components/KurulumGecidi";

export const metadata = { title: "Oyun Seçimi — Liderlik Aynası" };

// Giriş akışı adımı: kişi Cumartesi seçmeli oyunlarından 2'sini seçer ve uygun
// bir gruba atanır. Zaten grubu varsa ya da seçim kapalıysa ana sayfaya alınır.
export default async function OyunSecimiSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const { data: kisi } = await db.from("participants").select("team").eq("id", session.sub).maybeSingle();
  if (kisi?.team) redirect("/");

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="mx-auto my-auto w-full max-w-md p-5">
        {/* Oyun seçiminden ÖNCE: telefona kurulum geçidi (atlanabilir). */}
        <KurulumGecidi>
          <OyunSecici />
        </KurulumGecidi>
      </div>
    </main>
  );
}

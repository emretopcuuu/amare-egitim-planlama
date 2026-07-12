import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { grupNoCozumle, grupSecmeliOyunlari, grupAdi, OYUN_BILGI } from "@/lib/cumartesiProgrami";
import { kapaliKombolar } from "@/lib/oyunKapasite";
import OyunSecici from "./OyunSecici";
import KurulumGecidi from "@/components/KurulumGecidi";
import OnboardingRayi from "@/components/OnboardingRayi";

export const metadata = { title: "Oyun Seçimi — Liderlik Aynası" };

// Giriş akışı adımı: kişi Cumartesi seçmeli oyunlarından 2'sini seçer ve uygun
// bir gruba atanır. Zaten grubu varsa artık ANA SAYFAYA ATILMAZ — kendi seçtiği
// oyunları/grubunu gösteren bir özet ekranı görür (üst rail'den geri dönünce
// "buraya geldim ama hiçbir şey yok" boşluğu yaşanmasın).
export default async function OyunSecimiSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const { data: kisi } = await db.from("participants").select("team").eq("id", session.sub).maybeSingle();

  if (kisi?.team) {
    const grupNo = grupNoCozumle(kisi.team);
    const oyunlar = grupNo ? grupSecmeliOyunlari(grupNo) : [];
    return (
      <main className="flex min-h-dvh flex-col overflow-y-auto">
        <div className="mx-auto w-full max-w-md pt-[calc(env(safe-area-inset-top,0px)+3.5rem+0.5rem)]">
          <OnboardingRayi />
        </div>
        <div className="mx-auto my-auto w-full max-w-md space-y-5 p-5 text-center">
          <p className="text-5xl" aria-hidden>🎮</p>
          <h1 className="prizma-serif ay-metin text-2xl font-bold">
            {grupNo ? grupAdi(grupNo) : kisi.team}
          </h1>
          {oyunlar.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {oyunlar.map((o) => (
                <span
                  key={o}
                  className="rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-sm font-medium text-gold-light"
                >
                  {OYUN_BILGI[o]?.simge} {OYUN_BILGI[o]?.ad}
                </span>
              ))}
            </div>
          )}
          <p className="text-sm text-slate-400">Cumartesi grubun bu — oyunların değişmez.</p>
          <Link
            href="/"
            className="btn-kor mx-auto mt-4 flex h-12 w-full max-w-xs items-center justify-center rounded-2xl text-base font-bold"
          >
            ← Ana sayfaya dön
          </Link>
        </div>
      </main>
    );
  }

  const kapali = await kapaliKombolar(db);

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-md pt-[calc(env(safe-area-inset-top,0px)+3.5rem+0.5rem)]">
        <OnboardingRayi />
      </div>
      <div className="mx-auto my-auto w-full max-w-md p-5">
        {/* Oyun seçiminden ÖNCE: telefona kurulum geçidi (atlanabilir). */}
        <KurulumGecidi>
          <OyunSecici kapaliKombolar={kapali} />
        </KurulumGecidi>
      </div>
    </main>
  );
}

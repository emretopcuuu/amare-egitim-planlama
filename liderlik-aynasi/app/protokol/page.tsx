import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { protokolKartlari } from "@/lib/protokolMotor";
import GeriButonu from "@/components/GeriButonu";
import ProtokolKartlar from "./ProtokolKartlar";

export const metadata = { title: "90 Gün Protokolü — Liderlik Aynası" };

// 90 GÜN PROTOKOLÜ sayfası: kişinin pratik kartları (çekirdek + kişisel),
// "neden sende", bugün yapıldı mı, toplam gün + gönüllü kapatma. 90 gün ilerleme.
export default async function ProtokolPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const bugun = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
  const kartlar = await protokolKartlari(db, session.sub, bugun);

  const gunSayilari = kartlar.reduce((t, k) => t + k.toplam, 0);

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="sahne-giris mx-auto my-auto w-full max-w-md space-y-5 p-5">
        <GeriButonu />
        <header className="text-center">
          <h1 className="prizma-serif ay-metin text-3xl font-semibold leading-tight">
            90 Gün Protokolü
          </h1>
          <p className="mt-2 text-base leading-relaxed text-slate-300">
            Kampta başlayan yolculuk burada sürüyor. Her pratik günde birkaç dakika —
            doksan gün sonra karşına çıkacak insanı bunlar inşa edecek.
          </p>
        </header>

        {kartlar.length === 0 ? (
          <section className="kart-cam rounded-3xl p-6 text-center">
            <p className="text-base leading-relaxed text-slate-300">
              Protokolün henüz kurulmadı. 90 gün yolculuğu başlayınca pratiklerin burada belirir.
            </p>
          </section>
        ) : (
          <>
            {gunSayilari > 0 && (
              <p className="rounded-xl bg-gold/[0.06] px-3 py-2 text-center text-sm font-medium text-gold-light">
                🌱 Toplam {gunSayilari} pratik günü biriktirdin.
              </p>
            )}
            <ProtokolKartlar kartlar={kartlar} />
          </>
        )}

        <Link href="/" className="block text-center text-sm text-slate-400 hover:text-gold-light">
          ← Ana sayfaya dön
        </Link>
      </div>
    </main>
  );
}

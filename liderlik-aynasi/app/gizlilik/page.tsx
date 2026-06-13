import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import VeriSilmeTalebi from "./VeriSilmeTalebi";

export const metadata = { title: "Gizlilik ve KVKK — Liderlik Aynası" };

const t = tr.kvkk;

function tarihYaz(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function GizlilikPage() {
  const session = await getSession();

  let rizaTarih: string | null = null;
  let silmeTarih: string | null = null;
  const katilimci = !!session && session.rol === "participant";
  if (katilimci) {
    const { data } = await supabaseAdmin()
      .from("participants")
      .select("consent_at, deletion_requested_at")
      .eq("id", session!.sub)
      .maybeSingle();
    rizaTarih = data?.consent_at ? tarihYaz(data.consent_at) : null;
    silmeTarih = data?.deletion_requested_at ? tarihYaz(data.deletion_requested_at) : null;
  }

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="sahne-giris mx-auto my-auto w-full max-w-md space-y-5 p-5">
        <header className="text-center">
          <h1 className="prizma-serif ay-metin text-2xl font-semibold leading-tight">
            {t.baslik}
          </h1>
        </header>

        <div className="kart-cam space-y-4 rounded-3xl p-5">
          {t.bolumler.map((b) => (
            <section key={b.baslik}>
              <h2 className="text-base font-semibold text-gold-light">{b.baslik}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">{b.metin}</p>
            </section>
          ))}
        </div>

        {katilimci && (
          <div className="kart-cam rounded-3xl p-5">
            <p className="text-sm text-slate-300">
              {rizaTarih ? t.rizaVar(rizaTarih) : t.rizaYok}
            </p>
            <div className="mt-4">
              <VeriSilmeTalebi mevcutTarih={silmeTarih} />
            </div>
          </div>
        )}

        <p className="pt-1 text-center">
          <Link
            href={session ? "/" : "/giris"}
            className="text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
          >
            {t.geriDon}
          </Link>
        </p>
      </div>
    </main>
  );
}

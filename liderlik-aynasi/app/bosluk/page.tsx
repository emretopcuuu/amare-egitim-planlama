import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { boslukGetirVeyaUret } from "@/lib/bosluk";
import { tr } from "@/lib/i18n/tr";
import BoslukDeneyim from "./BoslukDeneyim";

const t = tr.bosluk;

// FAZ 1 — Boşluk Anı. Kişinin iç engelini kamptaki kanıtla çürüten zirve.
// Kendi kendini gate'ler: pusula yoksa / kanıt birikmemişse sakin bir mesaj.
export default async function BoslukSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/");

  const sonuc = await boslukGetirVeyaUret(supabaseAdmin(), session.sub);

  if (sonuc.durum === "pusula-yok") {
    return <Bilgi ikon="🧭" baslik={t.pusulaYokBaslik} metin={t.pusulaYokMetin} />;
  }
  if (sonuc.durum === "kanit-yok") {
    return <Bilgi ikon="👁" baslik={t.kanitYokBaslik} metin={t.kanitYokMetin} />;
  }
  if (sonuc.durum !== "hazir") {
    return <Bilgi ikon="🪞" baslik={tr.hata.baslik} metin={t.hata} />;
  }

  return <BoslukDeneyim demolisyon={sonuc.demolisyon} yeniCumle={sonuc.yeniCumle} />;
}

function Bilgi({ ikon, baslik, metin }: { ikon: string; baslik: string; metin: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="kart-cam max-w-md rounded-3xl p-10">
        <p className="text-5xl" aria-hidden>
          {ikon}
        </p>
        <h1 className="prizma-serif ay-metin mt-4 text-2xl font-semibold">{baslik}</h1>
        <p className="mt-3 text-base leading-relaxed text-slate-300">{metin}</p>
      </div>
    </main>
  );
}

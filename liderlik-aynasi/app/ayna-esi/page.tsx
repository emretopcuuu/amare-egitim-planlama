import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import AynaLogo from "@/components/AynaLogo";
import GeriButonu from "@/components/GeriButonu";
import AynaEsiKart from "./AynaEsiKart";

export const metadata = { title: "Ayna Eşin — Liderlik Aynası" };

const t = tr.aynaEsi;

type Kisi = { full_name: string };
type Satir = {
  id: string;
  tur: number;
  slot: string;
  a_id: string;
  b_id: string;
  a_verir: number;
  b_verir: number;
  a_tamam: boolean;
  b_tamam: boolean;
  a: Kisi | null;
  b: Kisi | null;
};

export type Gorusme = {
  id: string;
  tur: number;
  slot: string;
  esAd: string;
  ogrenTrait: number; // eşin güçlü → ona soracaklarım
  anlatTrait: number; // benim güçlü → o bana soracak
  benimTamam: boolean;
};

export default async function AynaEsiSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const [{ data: ayar }, { data: satirlar }] = await Promise.all([
    db.from("settings").select("value").eq("key", "ayna_esi_acik").maybeSingle(),
    db
      .from("ayna_esi")
      .select(
        "id, tur, slot, a_id, b_id, a_verir, b_verir, a_tamam, b_tamam, a:participants!ayna_esi_a_id_fkey(full_name), b:participants!ayna_esi_b_id_fkey(full_name)"
      )
      .or(`a_id.eq.${session.sub},b_id.eq.${session.sub}`)
      .order("tur"),
  ]);

  if (ayar?.value !== "true") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <div className="kart-cam max-w-md rounded-3xl p-10">
          <AynaLogo className="text-4xl" />
          <h1 className="prizma-serif ay-metin mt-4 text-2xl font-semibold">{t.kapaliBaslik}</h1>
          <p className="mt-3 text-base leading-relaxed text-slate-300">{t.kapaliMetin}</p>
        </div>
      </main>
    );
  }

  const rows = (satirlar ?? []) as unknown as Satir[];
  const gorusmeler: Gorusme[] = rows.map((s) => {
    const benA = s.a_id === session.sub;
    return {
      id: s.id,
      tur: s.tur,
      slot: s.slot,
      esAd: (benA ? s.b?.full_name : s.a?.full_name)?.split(" ")[0] ?? "—",
      ogrenTrait: benA ? s.b_verir : s.a_verir,
      anlatTrait: benA ? s.a_verir : s.b_verir,
      benimTamam: benA ? s.a_tamam : s.b_tamam,
    };
  });

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-5 p-5">
      <GeriButonu />
      <header>
        <h1 className="prizma-serif ay-metin text-2xl font-semibold">{t.baslik}</h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">{t.aciklama}</p>
      </header>

      {gorusmeler.length === 0 ? (
        <div className="kart-3d rounded-2xl bg-midnight-card/60 p-6 text-center ring-1 ring-royal/30">
          <p className="font-semibold text-gold-light">{t.yokBaslik}</p>
          <p className="mt-2 text-sm text-slate-300">{t.yokMetin}</p>
        </div>
      ) : (
        gorusmeler.map((g) => <AynaEsiKart key={g.id} gorusme={g} />)
      )}
    </main>
  );
}

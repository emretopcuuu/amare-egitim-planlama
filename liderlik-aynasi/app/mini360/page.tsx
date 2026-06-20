import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { MINI360_IFADELER } from "@/lib/onFarkindalik";
import { tr } from "@/lib/i18n/tr";
import Mini360Oz from "./Mini360Oz";
import AynaLogo from "@/components/AynaLogo";
import GeriButonu from "@/components/GeriButonu";

export const metadata = { title: "Ekip Aynası — Liderlik Aynası" };

const t = tr.mini360;

export default async function Mini360Sayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const [{ data: ayar }, { data: turAyar }, { data: ben }] = await Promise.all([
    db.from("settings").select("value").eq("key", "mini360_acik").maybeSingle(),
    db.from("settings").select("value").eq("key", "mini360_tur").maybeSingle(),
    db.from("participants").select("team").eq("id", session.sub).maybeSingle(),
  ]);
  const aktifTur = Math.max(1, parseInt(turAyar?.value ?? "1", 10) || 1);

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

  // #9: yalnız aktif turun verisi. Öz puanım, bana gelen anonim dış puanlar,
  // ekibim, ekibin "değerlendirilmek istiyorum" bayrakları ve BU turda benim
  // kimleri değerlendirdiğim — hepsi tek seferde.
  const [{ data: oz }, { data: dis }, { data: ekipHam }, { data: benimVerdiklerim }] =
    await Promise.all([
      db
        .from("mini360_oz")
        .select("m1, m2, m3, m4, m5, m6, oylanma_istiyor")
        .eq("participant_id", session.sub)
        .eq("tur", aktifTur)
        .maybeSingle(),
      db
        .from("mini360_dis")
        .select("m1, m2, m3, m4, m5, m6")
        .eq("target_id", session.sub)
        .eq("tur", aktifTur),
      ben?.team
        ? db
            .from("participants")
            .select("id, full_name")
            .eq("team", ben.team)
            .eq("role", "participant")
            .neq("id", session.sub)
            .order("full_name")
        : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
      db
        .from("mini360_dis")
        .select("target_id")
        .eq("rater_id", session.sub)
        .eq("tur", aktifTur),
    ]);

  // Ekip ortalaması (anonim dış puanlar) + fark.
  const disSayi = (dis ?? []).length;
  const ekipOrt: Record<string, number | null> = {};
  for (const i of MINI360_IFADELER) {
    const vals = (dis ?? []).map((d) => d[i.kod]).filter((v): v is number => v !== null);
    ekipOrt[i.kod] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  }

  const ozBaslangic: Record<string, number> = {};
  if (oz) for (const i of MINI360_IFADELER) if (oz[i.kod] !== null) ozBaslangic[i.kod] = oz[i.kod] as number;
  const ozTamam = MINI360_IFADELER.every((i) => oz?.[i.kod] != null);
  const oylanmaIstiyor = oz?.oylanma_istiyor === true;

  // Ekibimin "değerlendirilmek istiyorum" bayrakları (bu tur).
  const ekipIds = (ekipHam ?? []).map((k) => k.id);
  const { data: ekipIstek } = ekipIds.length
    ? await db
        .from("mini360_oz")
        .select("participant_id, oylanma_istiyor")
        .in("participant_id", ekipIds)
        .eq("tur", aktifTur)
    : { data: [] as { participant_id: string; oylanma_istiyor: boolean }[] };
  const istekSet = new Set((ekipIstek ?? []).filter((r) => r.oylanma_istiyor).map((r) => r.participant_id));
  const verdiklerimSet = new Set((benimVerdiklerim ?? []).map((r) => r.target_id));

  const ekip = (ekipHam ?? []).map((k) => ({
    id: k.id,
    ad: k.full_name.split(" ")[0],
    istiyor: istekSet.has(k.id),
    degerlendirdim: verdiklerimSet.has(k.id),
  }));

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-5 p-5">
      <GeriButonu />
      {aktifTur > 1 && (
        <p className="text-center text-xs font-semibold text-royal-light">{t.turRozet(aktifTur)}</p>
      )}
      <Mini360Oz
        ozBaslangic={ozBaslangic}
        ekipOrt={ekipOrt}
        disSayi={disSayi}
        ozTamam={ozTamam}
        oylanmaIstiyor={oylanmaIstiyor}
        ekip={ekip}
      />
    </main>
  );
}

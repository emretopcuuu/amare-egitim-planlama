import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { MINI360_IFADELER } from "@/lib/onFarkindalik";
import { tr } from "@/lib/i18n/tr";
import Mini360Dis from "./Mini360Dis";
import AynaIkon from "@/components/AynaIkon";

export const metadata = { title: "Ekip Aynası — Liderlik Aynası" };

const t = tr.mini360;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Bilgi({ metin, geri = true }: { metin: string; geri?: boolean }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="kart-cam max-w-md rounded-3xl p-10">
        <AynaIkon className="mx-auto h-12 w-12 text-gold-light" />
        <p className="mt-4 text-base leading-relaxed text-slate-300">{metin}</p>
        {geri && (
          <Link href="/mini360" className="mt-6 inline-block rounded-xl bg-gold px-5 py-2.5 font-semibold text-[#1a1206]">
            {t.disGeri}
          </Link>
        )}
      </div>
    </main>
  );
}

// EKİP-İÇİ değerlendirme (girişli, anonim). Kendini değerlendiremez; yalnız
// aynı ekipteki gerçek katılımcı; önce öz-puan kapısı.
export default async function Mini360DisSayfa({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/giris?next=${encodeURIComponent(`/mini360/d/${id}`)}`);
  if (session.rol !== "participant") redirect("/admin");
  if (!UUID_RE.test(id)) return <Bilgi metin={t.disGecersiz} />;
  if (id === session.sub) return <Bilgi metin={t.disKendin} />;

  const db = supabaseAdmin();
  const { data: turAyar } = await db.from("settings").select("value").eq("key", "mini360_tur").maybeSingle();
  const tur = Math.max(1, parseInt(turAyar?.value ?? "1", 10) || 1);

  const [{ data: ben }, { data: hedef }, { data: oz }, { data: mevcutSatir }] = await Promise.all([
    db.from("participants").select("team").eq("id", session.sub).maybeSingle(),
    db.from("participants").select("full_name, team").eq("id", id).eq("role", "participant").maybeSingle(),
    db.from("mini360_oz").select("m1, m2, m3, m4, m5, m6").eq("participant_id", session.sub).eq("tur", tur).maybeSingle(),
    db.from("mini360_dis").select("m1, m2, m3, m4, m5, m6").eq("rater_id", session.sub).eq("target_id", id).eq("tur", tur).maybeSingle(),
  ]);

  // Ekip kapısı: hedef gerçek + benimle aynı ekipte olmalı.
  if (!hedef || !ben?.team || hedef.team !== ben.team) return <Bilgi metin={t.disGecersiz} />;

  // Öz-puan kapısı: önce kendini puanlamadan başkasını değerlendiremez.
  const ozTamam = MINI360_IFADELER.every((i) => oz?.[i.kod] != null);
  if (!ozTamam) return <Bilgi metin={t.disKilitMetin} />;

  const ad = hedef.full_name.split(" ")[0];
  const mevcut: Record<string, number> = {};
  if (mevcutSatir) for (const i of MINI360_IFADELER) if (mevcutSatir[i.kod] !== null) mevcut[i.kod] = mevcutSatir[i.kod] as number;

  return (
    <main className="mx-auto w-full max-w-md flex-1 p-5">
      <Mini360Dis hedefId={id} ad={ad} mevcut={mevcut} />
    </main>
  );
}

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { tr } from "@/lib/i18n/tr";
import SohbetKutusu from "@/components/SohbetKutusu";
import { uyeSohbeti, yonetimSohbeti, YONETIM, type IcMesaj } from "@/lib/icMesaj";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mesaj — Liderlik Aynası" };

const t = tr.grup;

// Katılımcı ↔ grup arkadaşı / kamp yönetimi sohbeti. Tam ekran, basit.
export default async function SohbetSayfa({
  params,
}: {
  params: Promise<{ kisi: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const { kisi } = await params;
  const db = supabaseAdmin();

  let baslik: string;
  let mesajlar: IcMesaj[];

  if (kisi === YONETIM) {
    baslik = t.yonetimSohbetBaslik;
    mesajlar = await yonetimSohbeti(db, session.sub);
  } else {
    // Hedef GERÇEKTEN aynı grupta mı? (yetki sızması olmasın)
    const [{ data: ben }, { data: diger }] = await Promise.all([
      db.from("participants").select("team").eq("id", session.sub).maybeSingle(),
      db.from("participants").select("full_name, team, role").eq("id", kisi).maybeSingle(),
    ]);
    if (!ben?.team || !diger || diger.role !== "participant" || diger.team !== ben.team) {
      notFound();
    }
    baslik = diger.full_name;
    mesajlar = await uyeSohbeti(db, session.sub, kisi);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Link href="/grup" className="text-sm font-semibold text-gold-light">
          {t.sohbetGeri}
        </Link>
      </div>
      <h1 className="prizma-serif ay-metin mb-3 text-2xl font-semibold">{baslik}</h1>
      <SohbetKutusu
        benId={session.sub}
        mod="katilimci"
        anahtar={kisi}
        digerAd={baslik}
        baslangic={mesajlar}
      />
    </main>
  );
}

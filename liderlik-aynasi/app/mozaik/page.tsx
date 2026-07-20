import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { mozaikAcikMi, grupParcalari } from "@/lib/mozaik";
import { tr } from "@/lib/i18n/tr";
import GeriButonu from "@/components/GeriButonu";
import MozaikYukle from "./MozaikYukle";

export const metadata = { title: "Grup Mozaiği — Liderlik Aynası" };

const t = tr.mozaik;

// B3 — Grup foto-mozaiği (canlı dolan). Kişi grubunun mozaiğine bir parça ekler;
// sayfa grubun tüm parçalarını ızgarada gösterir (yenilendikçe dolar). Kendi
// içinde kapalı — mevcut /ekran'a dokunmaz.
export default async function MozaikPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/admin");

  const db = supabaseAdmin();
  const acik = await mozaikAcikMi(db);

  const { data: kisi } = await db
    .from("participants")
    .select("team")
    .eq("id", session.sub)
    .maybeSingle();
  const grup = kisi?.team?.trim() ?? null;

  const parcalar = grup ? await grupParcalari(db, grup) : [];
  const benimVar = parcalar.some((p) => p.participant_id === session.sub);

  // İmzalı URL'ler (parça fotoları 'sesler' bucket'ında).
  const url = new Map<string, string>();
  if (parcalar.length > 0) {
    const { data: imzali } = await db.storage
      .from("sesler")
      .createSignedUrls(parcalar.map((p) => p.foto_path), 3600);
    for (const im of imzali ?? []) if (im.path && im.signedUrl) url.set(im.path, im.signedUrl);
  }

  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto">
      <div className="sahne-giris mx-auto my-auto w-full max-w-md space-y-5 p-5">
        <GeriButonu />
        <header className="text-center">
          <h1 className="prizma-serif ay-metin text-3xl font-semibold leading-tight">{t.baslik}</h1>
          <p className="mt-2 text-base leading-relaxed text-slate-300">
            {grup ? `${grup} · ${t.altBaslik}` : t.grupYok}
          </p>
        </header>

        {parcalar.length === 0 ? (
          <p className="kart-cam rounded-3xl p-6 text-center text-base leading-relaxed text-slate-300">
            {t.bosDurum}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {parcalar.map((p) =>
              url.get(p.foto_path) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p.participant_id}
                  src={url.get(p.foto_path)!}
                  alt=""
                  className="aspect-square w-full rounded-lg object-cover"
                />
              ) : null
            )}
          </div>
        )}

        {acik && grup ? (
          <MozaikYukle zatenVar={benimVar} />
        ) : (
          <p className="text-center text-sm text-slate-500">{acik ? t.grupYok : t.kapali}</p>
        )}

        <Link href="/" className="block text-center text-sm text-slate-400 hover:text-gold-light">
          {t.geriDon}
        </Link>
      </div>
    </main>
  );
}

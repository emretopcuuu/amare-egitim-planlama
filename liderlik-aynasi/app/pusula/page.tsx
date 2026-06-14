import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { pusulaDurum, pusulaGecmis } from "@/lib/pusula";
import { aktifOzellikler, ozPuanTamamMi } from "@/lib/degerlendirme";
import { tr } from "@/lib/i18n/tr";
import PusulaSohbet from "./PusulaSohbet";
import ProfilFoto from "@/components/ProfilFoto";

const t = tr.pusula;

// FAZ 0 — Nedenler çalışması. Kamp öncesi kişiselleştirme omurgası.
// Tamamlandıysa: kampa gelmeden yapılabilecek hazırlık adımları (kendini puanla,
// kamp rehberi, fotoğraf) + "kampta görüşürüz" beklemesi. Hiçbiri zorunlu değil.
export default async function PusulaSayfa() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.rol !== "participant") redirect("/");

  const db = supabaseAdmin();
  const [durum, gecmis, { data: kisi }, { data: pus }] = await Promise.all([
    pusulaDurum(db, session.sub),
    pusulaGecmis(db, session.sub),
    db
      .from("participants")
      .select("consent_at, profil_foto_path")
      .eq("id", session.sub)
      .maybeSingle(),
    db.from("pusula").select("oncelikler").eq("participant_id", session.sub).maybeSingle(),
  ]);

  // Sohbet sırasında kişi listesini görüp seçebilsin diye öncelikleri taşı.
  const oncelikler = ((pus?.oncelikler as { sira: number; metin: string }[]) ?? [])
    .slice()
    .sort((a, b) => a.sira - b.sira)
    .map((o) => o.metin);

  if (durum.tamam) {
    const ozellikler = await aktifOzellikler(db);
    const ozTamam = await ozPuanTamamMi(db, session.sub, 1, ozellikler.length);
    const fotoVar = !!kisi?.profil_foto_path;

    return (
      <main className="flex min-h-dvh flex-col overflow-y-auto">
        <div className="mx-auto my-auto w-full max-w-md space-y-4 px-5 py-8">
          <div className="text-center">
            <p className="text-5xl" aria-hidden>
              🧭
            </p>
            <h1 className="prizma-serif ay-metin mt-3 text-2xl font-semibold">
              {t.hazirlikBaslik}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              {t.hazirlikAltBaslik}
            </p>
          </div>

          <HazirlikKart ikon="⭐" baslik={t.adimPuanBaslik} metin={t.adimPuanMetin} tamam={ozTamam}>
            {!ozTamam && (
              <Link
                href={`/degerlendir/${session.sub}`}
                className="btn-kor flex h-11 w-full items-center justify-center rounded-xl text-sm font-bold"
              >
                {t.adimPuanDugme}
              </Link>
            )}
          </HazirlikKart>

          <HazirlikKart ikon="📖" baslik={t.adimRehberBaslik} metin={t.adimRehberMetin}>
            <Link
              href="/hosgeldin"
              className="flex h-11 w-full items-center justify-center rounded-xl border border-royal-light/30 text-sm font-semibold text-slate-200 hover:border-gold"
            >
              {t.adimRehberDugme}
            </Link>
          </HazirlikKart>

          <HazirlikKart ikon="📸" baslik={t.adimFotoBaslik} metin={t.adimFotoMetin} tamam={fotoVar}>
            <ProfilFoto varMi={fotoVar} />
          </HazirlikKart>

          <p className="px-2 pt-2 text-center text-sm leading-relaxed text-slate-400">
            {t.hazirlikBekle}
          </p>
        </div>
      </main>
    );
  }

  return (
    <PusulaSohbet
      baslangic={gecmis}
      rizaVar={!!kisi?.consent_at}
      onceliklerVar={durum.onceliklerVar}
      oncelikler={oncelikler}
    />
  );
}

function HazirlikKart({
  ikon,
  baslik,
  metin,
  tamam = false,
  children,
}: {
  ikon: string;
  baslik: string;
  metin: string;
  tamam?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`kart-cam rounded-2xl p-5 ring-1 ${
        tamam ? "ring-emerald-500/30" : "ring-royal/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          {ikon}
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-gold-light">{baslik}</h2>
            {tamam && (
              <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                ✓ {t.adimTamam}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">{metin}</p>
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}

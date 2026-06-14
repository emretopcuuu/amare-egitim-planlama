import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { pusulaDurum, pusulaGecmis } from "@/lib/pusula";
import { aktifOzellikler, ozPuanTamamMi } from "@/lib/degerlendirme";
import { tr } from "@/lib/i18n/tr";
import PusulaSohbet from "./PusulaSohbet";
import ProfilFoto from "@/components/ProfilFoto";
import GeriSayim from "@/components/GeriSayim";

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
    const [ozellikler, { count: kuranSayi }, { data: kampAyar }] = await Promise.all([
      aktifOzellikler(db),
      db
        .from("pusula")
        .select("id", { count: "exact", head: true })
        .not("tamamlandi_at", "is", null),
      db.from("settings").select("value").eq("key", "kamp_tarihi").maybeSingle(),
    ]);
    const ozTamam = await ozPuanTamamMi(db, session.sub, 1, ozellikler.length);
    const fotoVar = !!kisi?.profil_foto_path;
    // İlerleme: pusula (zaten ✓) + öz-puan + foto = 3 adım.
    const tamamlanan = 1 + (ozTamam ? 1 : 0) + (fotoVar ? 1 : 0);
    const yuzde = Math.round((tamamlanan / 3) * 100);
    const hepsiTamam = ozTamam && fotoVar;
    const kampTarihi = kampAyar?.value ?? null;

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
            {kampTarihi && <GeriSayim hedefZaman={kampTarihi} etiket={t.kampaKalan} />}
          </div>

          {/* İlerleme çubuğu + erken-kuş rozeti */}
          <div className="kart-cam rounded-2xl p-5 ring-1 ring-royal/30">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gold-light">{t.hazirYuzde(yuzde)}</p>
              {hepsiTamam && (
                <span className="parilti shrink-0 rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-bold text-gold-light">
                  {t.hazirRozet}
                </span>
              )}
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gold transition-all"
                style={{ width: `${yuzde}%` }}
              />
            </div>
            {hepsiTamam && <p className="mt-2 text-xs text-slate-400">{t.hazirRozetMetin}</p>}
          </div>

          {/* Sosyal kanıt */}
          <p className="text-center text-xs text-slate-500">👥 {t.sosyalKanit(kuranSayi ?? 0)}</p>

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

          {/* Kilitli sürprizler — merak tohumu */}
          <div className="pt-1">
            <p className="mb-2 text-center text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">
              {t.kilitBaslik}
            </p>
            <div className="space-y-2">
              {[t.kilit1, t.kilit2, t.kilit3].map((m) => (
                <div
                  key={m}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5"
                >
                  <span className="text-base" aria-hidden>
                    🔒
                  </span>
                  <span className="flex-1 text-sm text-slate-400">{m}</span>
                  <span className="shrink-0 text-[0.65rem] uppercase tracking-wide text-slate-600">
                    {t.kilitNot}
                  </span>
                </div>
              ))}
            </div>
          </div>

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

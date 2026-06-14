import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { pusulaDurum, pusulaGecmis } from "@/lib/pusula";
import { aktifOzellikler, ozPuanTamamMi } from "@/lib/degerlendirme";
import { tr } from "@/lib/i18n/tr";
import PusulaSohbet from "./PusulaSohbet";
import ProfilFoto from "@/components/ProfilFoto";
import CanliAyna from "@/components/CanliAyna";
import GeriSayim from "@/components/GeriSayim";
import Konfeti from "@/components/Konfeti";
import AynaKurulum from "@/components/AynaKurulum";

const t = tr.pusula;

// FAZ 0 — Nedenler çalışması + kamp öncesi hazırlık hub'ı. Pusula bitince kişi
// (hepsi opsiyonel) kendini puanlar, profil fotoğrafı + Canlı Ayna ekler, kamp
// rehberine bakar — sonra "kampta görüşürüz" beklemesi.
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
      .select("consent_at, profil_foto_path, yuz_fotolari")
      .eq("id", session.sub)
      .maybeSingle(),
    db.from("pusula").select("oncelikler").eq("participant_id", session.sub).maybeSingle(),
  ]);

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
    const selfieVar = !!kisi?.profil_foto_path;
    const yuzVar = Array.isArray(kisi?.yuz_fotolari) && (kisi.yuz_fotolari as unknown[]).length > 0;
    const kampTarihi = kampAyar?.value ?? null;

    const adimlar = [
      {
        k: "ozpuan",
        ikon: "⭐",
        baslik: t.adimPuanBaslik,
        metin: t.adimPuanMetin,
        sure: t.adimPuanSure,
        tamam: ozTamam,
        aksiyon: (
          <Link
            href={`/degerlendir/${session.sub}`}
            className="btn-kor flex h-12 w-full items-center justify-center rounded-xl text-sm font-bold"
          >
            {t.adimPuanDugme}
          </Link>
        ),
      },
      {
        k: "selfie",
        ikon: "📸",
        baslik: t.adimFotoBaslik,
        metin: t.adimFotoMetin,
        sure: t.adimFotoSure,
        tamam: selfieVar,
        aksiyon: <ProfilFoto varMi={selfieVar} />,
      },
      {
        k: "yuz",
        ikon: "🔮",
        baslik: t.adimYuzBaslik,
        metin: t.adimYuzMetin,
        sure: t.adimYuzSure,
        tamam: yuzVar,
        aksiyon: <CanliAyna varMi={yuzVar} />,
      },
    ];
    const tamamlanan = adimlar.filter((a) => a.tamam).length;
    const yuzde = Math.round((tamamlanan / adimlar.length) * 100);
    const hepsiTamam = tamamlanan === adimlar.length;
    const sonrakiK = adimlar.find((a) => !a.tamam)?.k ?? null;
    const sirali = [...adimlar].sort((a, b) => Number(a.tamam) - Number(b.tamam));

    return (
      <main className="flex min-h-dvh flex-col overflow-y-auto">
        {hepsiTamam && <Konfeti anahtar="hazirlik-tamam" />}
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

          {/* İlerleme halkası + erken-kuş rozeti */}
          <div className="kart-cam flex items-center gap-4 rounded-2xl p-5 ring-1 ring-royal/30">
            <Halka yuzde={yuzde} etiket={`${tamamlanan}/${adimlar.length}`} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gold-light">{t.hazirYuzde(yuzde)}</p>
              {hepsiTamam ? (
                <p className="mt-1 text-xs text-slate-400">{t.hazirRozetMetin}</p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">👥 {t.sosyalKanit(kuranSayi ?? 0)}</p>
              )}
            </div>
            {hepsiTamam && (
              <span className="parilti shrink-0 rounded-full bg-gold/15 px-2.5 py-1 text-xs font-bold text-gold-light">
                {t.hazirRozet}
              </span>
            )}
          </div>

          {/* Adımlar — sıradaki vurgulu, tamamlananlar sönük ve altta */}
          {sirali.map((a) => (
            <Adim
              key={a.k}
              ikon={a.ikon}
              baslik={a.baslik}
              metin={a.metin}
              sure={a.sure}
              tamam={a.tamam}
              vurgu={a.k === sonrakiK}
            >
              {!a.tamam && a.aksiyon}
            </Adim>
          ))}

          {/* Bildirim izni — hatırlatmaların çalışması için */}
          <div className="rounded-2xl bg-midnight-card/40 p-4 ring-1 ring-royal/20">
            <p className="mb-2 text-sm font-semibold text-slate-200">🔔 {t.bildirimBaslik}</p>
            <AynaKurulum />
          </div>

          {/* Kamp rehberi — bilgi (sayılmaz) */}
          <Link
            href="/hosgeldin"
            className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 transition-colors hover:border-royal-light/40"
          >
            <span aria-hidden>📖</span>
            <span className="flex-1 text-sm text-slate-300">{t.adimRehberMetin}</span>
            <span className="text-sm font-semibold text-gold-light">{t.adimRehberDugme} →</span>
          </Link>

          {/* Kilitli sürprizler — merak tohumu (katlanır) */}
          <details className="group rounded-2xl border border-white/5 bg-white/[0.02]">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">
              <span>✨ {t.kilitBaslik}</span>
              <span className="transition-transform group-open:rotate-180" aria-hidden>
                ▾
              </span>
            </summary>
            <div className="space-y-2 px-4 pb-4">
              {[t.kilit1, t.kilit2, t.kilit3].map((m) => (
                <div key={m} className="flex items-center gap-3 rounded-xl bg-black/20 px-3 py-2.5">
                  <span className="text-base" aria-hidden>
                    🔒
                  </span>
                  <span className="flex-1 text-sm text-slate-400">{m}</span>
                  <span className="shrink-0 text-[0.6rem] uppercase tracking-wide text-slate-600">
                    {t.kilitNot}
                  </span>
                </div>
              ))}
            </div>
          </details>

          <p className="px-2 text-center text-sm leading-relaxed text-slate-400">
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

// Dairesel ilerleme halkası — "n/3" ortada.
function Halka({ yuzde, etiket }: { yuzde: number; etiket: string }) {
  const r = 26;
  const cevre = 2 * Math.PI * r;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="#D4AF37"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={cevre}
          strokeDashoffset={cevre * (1 - yuzde / 100)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gold-light">
        {etiket}
      </span>
    </div>
  );
}

// Hazırlık adımı kartı — sıradaki vurgulu, tamamlanan sönük.
function Adim({
  ikon,
  baslik,
  metin,
  sure,
  tamam,
  vurgu,
  children,
}: {
  ikon: string;
  baslik: string;
  metin: string;
  sure: string;
  tamam: boolean;
  vurgu: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl p-5 transition-all ${
        tamam
          ? "bg-midnight-card/30 opacity-60 ring-1 ring-emerald-500/20"
          : vurgu
            ? "kart-cam parilti ring-2 ring-gold/50"
            : "kart-cam ring-1 ring-royal/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          {ikon}
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-gold-light">{baslik}</h2>
            {tamam ? (
              <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                ✓ {t.adimTamam}
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[0.7rem] font-medium text-slate-400">
                {vurgu ? `${t.siradaki} · ${sure}` : sure}
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

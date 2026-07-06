"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";
import { ufukAyEtiket } from "@/lib/planTakvim";
import Konfeti from "@/components/Konfeti";
import KonusanYansima from "@/components/KonusanYansima";

const t = tr.takip;

type Durum = {
  bugunYapildi: boolean | null;
  seri: number;
  toplam: number;
  son14: { gun: string; yapildi: boolean | null }[];
  kacirilanGun: number;
};
type Aksiyon = { metin: string; ufuk: string };
type Hafta = { gorusmeToplam: number; kayitToplam: number };

// [Faz 6 — 90 gün motoru #11] "BUNU SEN SÖYLEDİN" — milestone anlarında
// kişinin mühürlü sözünü (kendi sesi) dinletir. En güçlü motivasyon aracı:
// hiçbir AI metni kişinin kendi sesiyle verdiği sözle yarışamaz. sessionStorage
// ile oturum başına bir kez (aynı milestone'u art arda göstermez).
type Milestone = { anahtar: string; baslik: string; metin: string };
function milestoneBul(durum: Durum, hafta: Hafta, kota: number | null): Milestone | null {
  if (durum.seri === 7) {
    return { anahtar: "seri7", baslik: "7 gün önce bunu SEN söylemiştin", metin: "Bir hafta önce verdiğin sözü dinle — tam da bunu yaşıyorsun." };
  }
  if (durum.kacirilanGun === 1) {
    return { anahtar: `kacirma-${durum.toplam}`, baslik: "Düşmek bitmek değil", metin: "Bir gün kaçırdın, olur. Sözünü hatırla — yarın devam." };
  }
  if (durum.toplam === 30) {
    return { anahtar: "gun30", baslik: "30 gündür yürüyorsun", metin: "Kampta ne demiştin? Kendi sesini dinle." };
  }
  if (kota && hafta.gorusmeToplam >= kota) {
    return { anahtar: "kota-tamam", baslik: "Bu hafta sözünü tuttun", metin: "Kotanı doldurdun — sen bunu SEN söylemiştin." };
  }
  return null;
}

export default function TakipAkis({
  durum: durumBaslangic,
  aksiyonlar,
  hafta: haftaBaslangic,
  kota,
  sozSesUrl,
  degerDavranisi,
  ortakMomentum,
}: {
  durum: Durum;
  aksiyonlar: Aksiyon[];
  hafta: Hafta;
  kota: number | null;
  sozSesUrl: string | null;
  degerDavranisi: string | null;
  ortakMomentum: { cevreToplam: number; buHaftaAktif: number } | null;
}) {
  const [durum, setDurum] = useState<Durum>(durumBaslangic);
  const [hafta, setHafta] = useState<Hafta>(haftaBaslangic);
  const [not, setNot] = useState("");
  const [gorusme, setGorusme] = useState("");
  const [kayit, setKayit] = useState("");
  const [mesgul, setMesgul] = useState(false);
  const [now] = useState(() => new Date());
  const [ziliGoster, setZiliGoster] = useState(false);
  const [milestone, setMilestone] = useState<Milestone | null>(null);

  useEffect(() => {
    if (!sozSesUrl) return;
    const m = milestoneBul(durum, hafta, kota);
    if (!m) return;
    try {
      if (sessionStorage.getItem(`milestone-${m.anahtar}`)) return;
      sessionStorage.setItem(`milestone-${m.anahtar}`, "1");
    } catch {
      // depolama kapalı: yine de göster
    }
    setMilestone(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durum.seri, durum.kacirilanGun, durum.toplam, hafta.gorusmeToplam]);

  async function checkin(yapildi: boolean) {
    setMesgul(true);
    try {
      const kayitSayisi = Math.max(0, Math.round(Number(kayit) || 0));
      const res = await fetch("/api/soz-takip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          yapildi,
          notlar: not,
          gorusmeSayisi: gorusme.trim() ? Number(gorusme) : null,
          kayitSayisi,
        }),
      });
      const v = await res.json().catch(() => null);
      if (res.ok && v?.durum) {
        setDurum(v.durum);
        if (v.hafta) setHafta(v.hafta);
        setNot("");
        setGorusme("");
        setKayit("");
        if (v.kayitZili) {
          setZiliGoster(true);
          setTimeout(() => setZiliGoster(false), 2600);
        }
      }
    } finally {
      setMesgul(false);
    }
  }

  const isaretli = durum.bugunYapildi !== null;
  const kotaOrani = kota ? Math.min(100, Math.round((hafta.gorusmeToplam / kota) * 100)) : null;

  return (
    <div className="mx-auto my-auto w-full max-w-md space-y-5 p-5">
      {ziliGoster && <Konfeti key={Date.now()} />}
      {ziliGoster && (
        <div className="fixed inset-0 z-[56] flex items-center justify-center bg-black/60 p-6">
          <div className="kart-cam rounded-3xl p-8 text-center">
            <p className="text-5xl" aria-hidden>🔔</p>
            <h2 className="prizma-serif ay-metin mt-3 text-2xl font-bold text-gold-light">Kayıt Zili!</h2>
            <p className="mt-2 text-sm text-slate-300">Şahitlerine haber gitti — liderliğini gösterdin.</p>
          </div>
        </div>
      )}

      <header className="text-center">
        <p className="prizma-serif text-[0.7rem] uppercase tracking-[0.35em] text-slate-400">
          {tr.app.name}
        </p>
        <h1 className="prizma-serif ay-metin mt-1 text-2xl font-semibold">{t.baslik}</h1>
        <p className="mt-2 text-sm text-slate-300">{t.aciklama}</p>
      </header>

      {/* [Faz 6] "Bunu sen söyledin" — milestone anında kendi sesini dinlet. */}
      {milestone && sozSesUrl && (
        <div className="kart-cam rounded-2xl border border-gold/30 p-5 text-center">
          <p className="text-3xl" aria-hidden>🎙️</p>
          <h2 className="prizma-serif ay-metin mt-2 text-lg font-bold text-gold-light">{milestone.baslik}</h2>
          <p className="mt-1 text-sm text-slate-300">{milestone.metin}</p>
          <div className="mt-3">
            <KonusanYansima videoUrl={null} sesUrl={sozSesUrl} etiket="Sözünü dinle" />
          </div>
        </div>
      )}

      {/* Seri + toplam */}
      <div className="flex gap-3">
        <div className="flex-1 rounded-2xl bg-gold/10 p-4 text-center">
          <p className="text-2xl font-bold text-gold">{durum.seri}</p>
          <p className="text-xs text-slate-400">{durum.seri > 0 ? t.seri(durum.seri) : t.seriYok}</p>
        </div>
        <div className="flex-1 rounded-2xl bg-emerald-500/10 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-300">{durum.toplam}</p>
          <p className="text-xs text-slate-400">{t.toplam(durum.toplam)}</p>
        </div>
      </div>

      {/* B8: 90 günlük genel ilerleme — kaç gün tamamlandı, ne kadar kaldı */}
      <div className="rounded-2xl border border-royal/25 bg-midnight-card/50 p-4">
        <div className="flex items-center justify-between text-xs font-medium text-slate-400">
          <span>{t.yolBaslik}</span>
          <span className="text-gold-light">{t.yolGun(Math.min(durum.toplam, 90))}</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-royal-light to-gold transition-all duration-700"
            style={{ width: `${Math.min(100, Math.round((durum.toplam / 90) * 100))}%` }}
          />
        </div>
      </div>

      {/* [Faz 3] Haftalık görüşme kotası — planındaki hedeften türer. */}
      {kota != null && (
        <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.06] p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-300">
            <span>📞 Bu hafta görüşme kotan</span>
            <span className="text-emerald-300">
              {hafta.gorusmeToplam} / {kota}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-700"
              style={{ width: `${kotaOrani ?? 0}%` }}
            />
          </div>
          {hafta.kayitToplam > 0 && (
            <p className="mt-2 text-xs text-gold-light">🔔 Bu hafta {hafta.kayitToplam} kayıt aldın</p>
          )}
        </div>
      )}

      {/* Bugünün check-in'i */}
      <section className="kart-cam rounded-2xl p-5">
        {isaretli ? (
          <p className="text-center text-base font-semibold text-emerald-300">{t.bugunTamam}</p>
        ) : (
          <>
            <p className="text-base font-medium text-slate-100">{t.bugunSoru}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs text-slate-400">Kaç görüşme?</span>
                <input
                  inputMode="numeric"
                  value={gorusme}
                  onChange={(e) => setGorusme(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                  className="mt-1 w-full rounded-xl border border-royal-light/30 bg-midnight-soft px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-gold"
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-400">Kaç kayıt?</span>
                <input
                  inputMode="numeric"
                  value={kayit}
                  onChange={(e) => setKayit(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                  className="mt-1 w-full rounded-xl border border-gold/30 bg-midnight-soft px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-gold"
                />
              </label>
            </div>
            <textarea
              value={not}
              onChange={(e) => setNot(e.target.value.slice(0, 500))}
              rows={2}
              placeholder={t.notYer}
              className="mt-2 w-full resize-none rounded-xl border border-royal-light/30 bg-midnight-soft px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-gold"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => checkin(true)}
                disabled={mesgul}
                className="btn-kor flex h-12 flex-1 items-center justify-center rounded-xl text-base font-bold disabled:opacity-50"
              >
                {t.evet}
              </button>
              <button
                onClick={() => checkin(false)}
                disabled={mesgul}
                className="flex h-12 flex-1 items-center justify-center rounded-xl border border-royal-light/40 text-sm font-medium text-slate-300 hover:bg-midnight-soft disabled:opacity-50"
              >
                {t.hayir}
              </button>
            </div>
          </>
        )}
      </section>

      {/* Son 14 gün şeridi */}
      <section className="kart-cam rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t.son14}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {durum.son14.map((g) => (
            <span
              key={g.gun}
              title={g.gun}
              className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${
                g.yapildi === true
                  ? "bg-emerald-500/80 text-[#04140c]"
                  : g.yapildi === false
                    ? "bg-red-500/30 text-red-200"
                    : "bg-white/5 text-slate-600"
              }`}
            >
              {g.yapildi === true ? "✓" : g.yapildi === false ? "·" : ""}
            </span>
          ))}
        </div>
      </section>

      {/* [Faz 12] Ortak Momentum — söz çevren (şahitlerin + şahidi olduğun
          kişiler) bu hafta ne durumda. Akran baskısı, hafif ve tek bakışlık. */}
      {ortakMomentum && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-center">
          <p className="text-sm text-slate-300">
            🌐 Çevrende {ortakMomentum.cevreToplam} kişiden{" "}
            <span className="font-semibold text-emerald-300">{ortakMomentum.buHaftaAktif}</span>{" "}
            şu an sözünü tutuyor.
          </p>
        </div>
      )}

      {/* [Faz 7] Değer-Davranış Aynası — kampta seçtiğin değer bu haftaki
          gerçek verinle buluşuyor. AI çağrısı yok, haftada bir değişir. */}
      {degerDavranisi && (
        <section className="kart-cam rounded-2xl border border-royal-light/25 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-royal-light/80">
            ✨ Değerin bu hafta
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-200">{degerDavranisi}</p>
        </section>
      )}

      {/* Sözündeki adımlar */}
      {aksiyonlar.length > 0 && (
        <section className="kart-cam rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t.aksiyonHatirlatma}
          </p>
          <ul className="mt-2 space-y-1.5">
            {aksiyonlar.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[0.6rem] font-bold text-emerald-300">
                  {ufukAyEtiket(a.ufuk, now)}
                </span>
                <span>{a.metin}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-center">
        <Link href="/" className="text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline">
          {t.anaSayfa}
        </Link>
      </p>
    </div>
  );
}

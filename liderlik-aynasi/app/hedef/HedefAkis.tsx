"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import {
  KARIYER_BASAMAKLARI,
  SURE_SECENEKLERI,
  GUNLUK_SAAT_SECENEKLERI,
  kariyerPlaniHesapla,
  tlFormat,
  type KariyerPlani,
  ovSimulasyonu,
  gerekliTempo,
  makuSure,
  OV_SENARYOLAR,
  simulasyonMilestonelari,
  HBB_AYLAR,
  HBB_TOPLAM,
  HBB_BONUS_TOPLAM,
} from "@/lib/kariyer";

const t = tr.hedef;

type Mesaj = { rol: string; icerik: string };
type Durum = { asama: string; tamam: boolean; baslangicVar: boolean; plan: KariyerPlani | null; baslangicOv: number | null; yeniBaslangic: boolean };
type Faz = "acilis" | "baslangic" | "sohbet" | "wizard" | "tamam";

const NOKTALAR = ["yeni", "baslangic", "deneyimli", "lider"] as const;

export default function HedefAkis({
  durum,
  gecmis,
  ad,
  neden,
}: {
  durum: Durum;
  gecmis: Mesaj[];
  ad: string;
  neden: string | null;
}) {
  const router = useRouter();

  const ilkFaz: Faz = durum.tamam
    ? "tamam"
    : durum.asama === "kariyer"
      ? "wizard"
      : durum.baslangicVar || gecmis.length > 0
        ? "sohbet"
        : "acilis";

  const [faz, setFaz] = useState<Faz>(ilkFaz);
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [plan, setPlan] = useState<KariyerPlani | null>(durum.plan);
  const [ov0, setOv0] = useState<number | null>(durum.baslangicOv ?? null);

  async function istek(govde: Record<string, unknown>) {
    const res = await fetch("/api/hedef", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(govde),
    });
    return res.json().catch(() => null);
  }

  async function sifirla() {
    await istek({ sifirla: true });
    router.refresh();
  }

  // ---- ACILIS KAPAK ----
  if (faz === "acilis") {
    return (
      <Kapak ikon="🎯" baslik={t.acilisBaslik}>
        {neden && (
          <p className="mt-3 rounded-xl bg-gold/10 px-4 py-2 text-sm italic text-gold-light">
            “{neden}”
          </p>
        )}
        <p className="mt-3 text-base leading-relaxed text-slate-300">{t.acilisMetin}</p>
        <button
          onClick={() => setFaz("baslangic")}
          className="btn-kor parilti mt-7 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold"
        >
          {t.acilisBasla}
        </button>
      </Kapak>
    );
  }

  // ---- BAŞLANGIÇ NOKTASI FORMU ----
  if (faz === "baslangic") {
    return (
      <BaslangicFormu
        onKaydet={async (nokta, ay, detay, ov) => {
          setMesgul(true);
          setHata(null);
          const v = await istek({ baslangic: { nokta, deneyimAy: ay, detay, baslangicOv: ov } });
          setMesgul(false);
          if (!v?.ok) {
            setHata(v?.hata ?? t.hata);
            return;
          }
          setOv0(ov);
          setFaz("sohbet");
        }}
        mesgul={mesgul}
        hata={hata}
        onSifirla={sifirla}
      />
    );
  }

  // ---- KISA ISINMA SOHBETİ ----
  if (faz === "sohbet") {
    return (
      <Sohbet
        baslangic={gecmis}
        istek={istek}
        onBitti={() => setFaz("wizard")}
        onSifirla={sifirla}
      />
    );
  }

  // ---- SOMUTLAŞTIRMA WIZARD'I ----
  if (faz === "wizard") {
    return (
      <Wizard
        ov0={ov0}
        yeniBaslangic={durum.yeniBaslangic}
        onMuhur={async (hedefIndex, sure, gunluk) => {
          setMesgul(true);
          setHata(null);
          const v = await istek({ kariyer: { hedefIndex, sure, gunluk } });
          setMesgul(false);
          if (!v?.ok || !v.plan) {
            setHata(v?.hata ?? t.hata);
            return;
          }
          setPlan(v.plan as KariyerPlani);
          setFaz("tamam");
        }}
        mesgul={mesgul}
        hata={hata}
        onSifirla={sifirla}
      />
    );
  }

  // ---- TAMAM: mühürlenmiş plan ----
  return (
    <div className="mx-auto my-auto w-full max-w-md space-y-5 p-5">
      <div className="text-center">
        <p className="text-5xl" aria-hidden>
          🎯
        </p>
        <h1 className="prizma-serif ay-metin mt-3 text-2xl font-semibold">{t.tamamBaslik}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{t.tamamMetin}</p>
      </div>
      {plan && <PlanKarti plan={plan} />}
      <div className="rounded-2xl border border-slate-700/60 bg-midnight-soft px-4 py-3">
        <p className="text-xs leading-relaxed text-slate-400">{t.kampTaahhut}</p>
      </div>
      <button
        onClick={() => router.push("/")}
        className="btn-kor parilti flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold"
      >
        {t.bittiDevam}
      </button>
      <button
        onClick={sifirla}
        className="mx-auto block text-sm text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
      >
        {t.sifirlaDugme}
      </button>
    </div>
  );
}

// ---------- Başlangıç noktası formu ----------
function BaslangicFormu({
  onKaydet,
  mesgul,
  hata,
  onSifirla,
}: {
  onKaydet: (nokta: string, ay: number | null, detay: string | null, ov: number) => void;
  mesgul: boolean;
  hata: string | null;
  onSifirla: () => void;
}) {
  const [nokta, setNokta] = useState<string | null>(null);
  const [ay, setAy] = useState("");
  const [detay, setDetay] = useState("");
  const [ov, setOv] = useState("");
  const ovNum = Number(ov);
  const ovGecerli = ov.length > 0 && ovNum > 0;
  return (
    <div className="mx-auto my-auto w-full max-w-md space-y-5 p-5">
      <header>
        <h1 className="prizma-serif ay-metin text-2xl font-semibold">{t.noktaBaslik}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{t.noktaAciklama}</p>
      </header>
      <div className="space-y-2.5">
        {NOKTALAR.map((k) => {
          const secili = nokta === k;
          return (
            <button
              key={k}
              onClick={() => setNokta(k)}
              className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                secili
                  ? "border-gold bg-gold/10 ring-1 ring-gold/40"
                  : "border-royal-light/25 bg-midnight-soft hover:border-gold/50"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  secili ? "border-gold bg-gold text-[#1a1206]" : "border-slate-500"
                }`}
              >
                {secili ? "✓" : ""}
              </span>
              <span>
                <span className="block font-semibold text-slate-100">{t.noktalar[k].ad}</span>
                <span className="block text-xs text-slate-400">{t.noktalar[k].alt}</span>
              </span>
            </button>
          );
        })}
      </div>
      {/* OV — zorunlu, tüm seviyelerde */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-400">{t.ovEtiket}</label>
        <input
          inputMode="numeric"
          value={ov}
          onChange={(e) => setOv(e.target.value.replace(/[^0-9]/g, "").slice(0, 8))}
          className={`w-full rounded-xl border bg-midnight-soft px-4 py-2.5 text-base text-slate-100 outline-none focus:border-gold ${
            ov.length > 0 && !ovGecerli ? "border-red-400/60" : "border-royal-light/30"
          }`}
          placeholder={t.ovYer}
        />
        {ov.length > 0 && !ovGecerli && (
          <p className="text-xs text-red-400">{t.ovZorunlu}</p>
        )}
      </div>
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-400">{t.noktaAyEtiket}</label>
        <input
          inputMode="numeric"
          value={ay}
          onChange={(e) => setAy(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
          className="w-full rounded-xl border border-royal-light/30 bg-midnight-soft px-4 py-2.5 text-base text-slate-100 outline-none focus:border-gold"
          placeholder="—"
        />
      </div>
      <textarea
        value={detay}
        onChange={(e) => setDetay(e.target.value.slice(0, 500))}
        rows={2}
        placeholder={t.noktaDetayYer}
        className="w-full resize-none rounded-xl border border-royal-light/30 bg-midnight-soft px-4 py-2.5 text-base text-slate-100 outline-none focus:border-gold"
      />
      {hata && <p className="text-center text-sm text-red-400">{hata}</p>}
      <button
        onClick={() => nokta && ovGecerli && onKaydet(nokta, ay ? Number(ay) : null, detay || null, ovNum)}
        disabled={!nokta || !ovGecerli || mesgul}
        className="btn-kor parilti flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold disabled:opacity-50"
      >
        {mesgul ? t.dusunuyor : t.noktaDevam}
      </button>
      <SifirlaSatiri onSifirla={onSifirla} />
    </div>
  );
}

// ---------- Kısa ısınma sohbeti ----------
function Sohbet({
  baslangic,
  istek,
  onBitti,
  onSifirla,
}: {
  baslangic: Mesaj[];
  istek: (g: Record<string, unknown>) => Promise<{ mesaj?: string; bitti?: boolean; hata?: string } | null>;
  onBitti: () => void;
  onSifirla: () => void;
}) {
  const [mesajlar, setMesajlar] = useState<Mesaj[]>(baslangic);
  const [girdi, setGirdi] = useState("");
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  // Sohbet "bitti" olunca otomatik geçme — kişi kapanış cümlesini okusun,
  // hazır olunca kendisi "Devam et"e bassın.
  const [hazirDevam, setHazirDevam] = useState(false);
  const altRef = useRef<HTMLDivElement>(null);
  const acilisRef = useRef(false);

  useEffect(() => {
    altRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mesajlar, mesgul]);

  // Açılış repliğini getir (mesaj yoksa).
  useEffect(() => {
    if (mesajlar.length > 0 || acilisRef.current) return;
    acilisRef.current = true;
    (async () => {
      setMesgul(true);
      const v = await istek({});
      if (v?.mesaj) setMesajlar([{ rol: "ayna", icerik: v.mesaj }]);
      else if (v?.bitti) onBitti();
      else setHata(t.aiHata);
      setMesgul(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function gonder() {
    const metin = girdi.trim();
    if (!metin || mesgul) return;
    setMesajlar((m) => [...m, { rol: "kullanici", icerik: metin }]);
    setGirdi("");
    setMesgul(true);
    setHata(null);
    const v = await istek({ mesaj: metin });
    setMesgul(false);
    if (!v?.mesaj && !v?.bitti) {
      setHata(v?.hata ?? t.aiHata);
      return;
    }
    if (v?.mesaj) setMesajlar((m) => [...m, { rol: "ayna", icerik: v.mesaj! }]);
    if (v?.bitti) setHazirDevam(true);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-4 pt-6">
      <header className="shrink-0 pb-3 text-center">
        <p className="prizma-serif text-[0.7rem] uppercase tracking-[0.35em] text-slate-400">
          {tr.app.name}
        </p>
        <h1 className="prizma-serif ay-metin mt-1 text-xl font-semibold">{t.baslik}</h1>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto pb-3">
        {mesajlar.map((m, i) => (
          <div key={i} className={`flex ${m.rol === "ayna" ? "justify-start" : "justify-end"}`}>
            <p
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-base leading-relaxed ${
                m.rol === "ayna" ? "kart-cam text-slate-100" : "bg-royal/40 text-slate-100"
              }`}
            >
              {m.icerik}
            </p>
          </div>
        ))}
        {mesgul && (
          <div className="flex justify-start">
            <p className="kart-cam max-w-[85%] rounded-2xl px-4 py-2.5 text-sm text-slate-400">
              {t.dusunuyor}
            </p>
          </div>
        )}
        <div ref={altRef} />
      </div>
      {hata && <p className="pb-2 text-center text-sm text-red-400">{hata}</p>}
      {hazirDevam ? (
        // Sohbet tamam: kişi kapanış cümlesini okuduktan sonra kendisi geçer.
        <button
          onClick={onBitti}
          className="btn-kor parilti flex h-14 w-full shrink-0 items-center justify-center rounded-2xl text-lg font-bold"
        >
          {t.sohbetDevam}
        </button>
      ) : (
        <div className="flex shrink-0 items-end gap-2">
          <textarea
            value={girdi}
            onChange={(e) => setGirdi(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                gonder();
              }
            }}
            rows={1}
            placeholder={t.girisYer}
            className="max-h-[160px] min-h-[3rem] w-full flex-1 resize-none rounded-2xl border border-royal-light/30 bg-midnight-soft px-4 py-3 text-base leading-relaxed text-slate-100 outline-none focus:border-gold"
          />
          <button
            onClick={gonder}
            disabled={mesgul || !girdi.trim()}
            className="btn-kor flex h-12 shrink-0 items-center justify-center rounded-2xl px-5 text-base font-bold disabled:opacity-50"
          >
            {t.gonder}
          </button>
        </div>
      )}
      <SifirlaSatiri onSifirla={onSifirla} className="pt-3" />
    </main>
  );
}

// ---------- Somutlaştırma wizard'ı (3 soru) ----------
function Wizard({
  ov0,
  yeniBaslangic,
  onMuhur,
  mesgul,
  hata,
  onSifirla,
}: {
  ov0: number | null;
  yeniBaslangic: boolean;
  onMuhur: (hedefIndex: number, sure: string, gunluk: string) => void;
  mesgul: boolean;
  hata: string | null;
  onSifirla: () => void;
}) {
  const [hedefIndex, setHedefIndex] = useState<number | null>(null);
  const [sure, setSure] = useState<string | null>(null);
  const [gunluk, setGunluk] = useState<string | null>(null);

  const adim = hedefIndex == null ? 1 : sure == null ? 2 : gunluk == null ? 3 : 4;
  const hedefRutbe = hedefIndex != null ? KARIYER_BASAMAKLARI[hedefIndex] : null;
  const sureObj = SURE_SECENEKLERI.find((s) => s.anahtar === sure);
  const saatObj = GUNLUK_SAAT_SECENEKLERI.find((g) => g.anahtar === gunluk);
  const plan =
    hedefIndex != null && sureObj && saatObj
      ? kariyerPlaniHesapla(hedefIndex, sureObj.ay, saatObj.gunluk, saatObj.etiket)
      : null;

  return (
    <div className="mx-auto my-auto w-full max-w-md space-y-4 p-5">
      {/* İlerleme çubuğu (3 adım) */}
      <div className="flex gap-1.5">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full ${adim > n ? "bg-gold" : adim === n ? "bg-gold/60" : "bg-white/10"}`}
          />
        ))}
      </div>

      {/* Seçilmiş cevap rozetleri */}
      {hedefRutbe && (
        <Rozet
          etiket={t.hedefinEtiket}
          deger={`${hedefRutbe.ad} — ${tlFormat(hedefRutbe.ortalama, hedefRutbe.arti)} ${t.aylikBirim}`}
          onTik={adim < 4 ? undefined : () => setHedefIndex(null)}
        />
      )}
      {sureObj && (
        <Rozet etiket={t.suresiEtiket} deger={sureObj.etiket} onTik={adim < 4 ? undefined : () => setSure(null)} />
      )}

      {adim === 1 && (
        <section>
          <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm leading-relaxed text-emerald-200">
            {t.wizardIntro}
          </p>
          {/* Yeni başlayan: önce Hızlı Başlangıç (ilk 3 ay) bonusları, sonra
              uzun vadeli hedefini tablodan seçer. */}
          {yeniBaslangic && <HbbKarti />}
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t.soruEtiket(1)}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-100">{t.q1Baslik}</h2>
          <KariyerTablosu onSec={setHedefIndex} />
        </section>
      )}

      {adim === 2 && (
        <Secenekler
          etiket={t.soruEtiket(2)}
          baslik={t.q2Baslik}
          secenekler={SURE_SECENEKLERI.map((s) => ({ anahtar: s.anahtar, metin: s.etiket }))}
          onSec={setSure}
          onGeri={() => setHedefIndex(null)}
        />
      )}

      {adim === 3 && (
        <Secenekler
          etiket={t.soruEtiket(3)}
          baslik={t.q3Baslik}
          secenekler={GUNLUK_SAAT_SECENEKLERI.map((g) => ({ anahtar: g.anahtar, metin: g.etiket }))}
          onSec={setGunluk}
          onGeri={() => setSure(null)}
        />
      )}

      {adim === 4 && plan && (
        <section className="space-y-4">
          <p className="text-center text-sm font-semibold text-gold-light">{t.planUstBaslik}</p>
          {/* OV büyüme simülasyonu ÖNCE: kişi önce kendi rakamının ay ay nasıl
              büyüdüğünü görür, sonra somut kariyer planını. */}
          {ov0 && ov0 > 0 && hedefRutbe && sureObj && (
            <OvSimKarti ov0={ov0} ovHedef={hedefRutbe.ov} sureAy={sureObj.ay} />
          )}
          <PlanKarti plan={plan} />
          {hata && <p className="text-center text-sm text-red-400">{hata}</p>}
          <button
            onClick={() => hedefIndex != null && sure && gunluk && onMuhur(hedefIndex, sure, gunluk)}
            disabled={mesgul}
            className="btn-kor parilti flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold disabled:opacity-50"
          >
            {mesgul ? t.dusunuyor : t.planOnayla}
          </button>
          <button
            onClick={() => {
              setHedefIndex(null);
              setSure(null);
              setGunluk(null);
            }}
            className="mx-auto block text-sm text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
          >
            {t.planDegistir}
          </button>
        </section>
      )}

      <SifirlaSatiri onSifirla={onSifirla} />
    </div>
  );
}

function Rozet({ etiket, deger, onTik }: { etiket: string; deger: string; onTik?: () => void }) {
  return (
    <button
      type="button"
      onClick={onTik}
      disabled={!onTik}
      className="flex w-full items-center justify-between rounded-xl bg-emerald-500/10 px-4 py-2.5 text-left"
    >
      <span className="text-sm text-slate-400">{etiket}</span>
      <span className="text-sm font-semibold text-emerald-200">{deger}</span>
    </button>
  );
}

function KariyerTablosu({ onSec }: { onSec: (i: number) => void }) {
  // Gerçek <table>: sütunlar kendiliğinden hizalanır (her satır ayrı grid değil).
  // Opak koyu zemin + bulanıklık → arka plan fotoğrafı yazıyı yutmaz.
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-royal-light/25 bg-[#061320]/92 shadow-xl backdrop-blur-sm">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-white/[0.05] text-[0.6rem] font-semibold uppercase tracking-wide text-slate-400">
            <th className="px-3 py-2 font-semibold">{t.tabloKariyer}</th>
            <th className="px-2 py-2 text-right font-semibold">{t.tabloEnDusuk}</th>
            <th className="px-2 py-2 text-right font-semibold">{t.tabloEnYuksek}</th>
            <th className="px-3 py-2 text-right font-semibold">{t.tabloOrtalama}</th>
          </tr>
        </thead>
        <tbody>
          {KARIYER_BASAMAKLARI.map((r, i) => (
            <tr
              key={r.ad}
              onClick={() => onSec(i)}
              style={{ animationDelay: `${i * 55}ms` }}
              className="kariyer-satir cursor-pointer border-t border-royal/15 transition-colors hover:bg-gold/10"
            >
              <td className="px-3 py-2.5">
                <span className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-slate-50">{r.ad}</span>
                  {r.rozet && (
                    <span className="shrink-0 rounded-full bg-gold/20 px-1.5 py-0.5 text-[0.55rem] font-semibold text-gold-light">
                      {r.rozet}
                    </span>
                  )}
                </span>
              </td>
              <td className="whitespace-nowrap px-2 py-2.5 text-right font-mono text-xs tabular-nums text-slate-400">
                {r.enDusuk != null ? tlFormat(r.enDusuk) : "—"}
              </td>
              <td className="whitespace-nowrap px-2 py-2.5 text-right font-mono text-xs tabular-nums text-slate-400">
                {r.enYuksek != null ? tlFormat(r.enYuksek) : "—"}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-sm font-bold tabular-nums text-emerald-300">
                {tlFormat(r.ortalama, r.arti)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Yeni başlayan için Hızlı Başlangıç (HBB): ilk 3 ay Bronze→Silver→Gold,
// her ay bonus + ortalama kazanç. Uzun vadeli hedef seçiminden ÖNCE gösterilir.
function HbbKarti() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gold/40 bg-[#08182a]/95 shadow-xl backdrop-blur-sm">
      <div className="border-l-4 border-gold bg-gold/10 px-4 py-3">
        <p className="text-sm font-bold text-gold-light">{t.hbbBaslik}</p>
        <p className="mt-0.5 text-xs text-slate-300">{t.hbbAciklama}</p>
      </div>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-white/[0.05] text-[0.6rem] font-semibold uppercase tracking-wide text-slate-400">
            <th className="px-3 py-2">{t.hbbAy}</th>
            <th className="px-2 py-2 text-right">{t.hbbBonus}</th>
            <th className="px-2 py-2 text-right">{t.hbbOrtalama}</th>
            <th className="px-3 py-2 text-right">{t.hbbToplam}</th>
          </tr>
        </thead>
        <tbody>
          {HBB_AYLAR.map((a) => (
            <tr key={a.ay} className="border-t border-royal/15">
              <td className="px-3 py-2.5">
                <span className="text-sm font-medium text-slate-50">{t.hbbAyEtiket(a.ay)}</span>
                <span className="ml-1.5 rounded-full bg-gold/20 px-1.5 py-0.5 text-[0.55rem] font-semibold text-gold-light">
                  {a.rutbe}
                </span>
              </td>
              <td className="whitespace-nowrap px-2 py-2.5 text-right font-mono text-xs tabular-nums text-slate-400">
                {tlFormat(a.bonus)}
              </td>
              <td className="whitespace-nowrap px-2 py-2.5 text-right font-mono text-xs tabular-nums text-slate-400">
                {tlFormat(a.ortalama)}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-sm font-bold tabular-nums text-emerald-300">
                {tlFormat(a.toplam)}
              </td>
            </tr>
          ))}
          <tr className="border-t border-gold/30 bg-gold/5">
            <td className="px-3 py-2.5 text-sm font-bold text-gold-light">{t.hbbToplamSatir}</td>
            <td className="whitespace-nowrap px-2 py-2.5 text-right font-mono text-xs tabular-nums text-slate-300">
              {tlFormat(HBB_BONUS_TOPLAM)}
            </td>
            <td />
            <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-sm font-bold tabular-nums text-emerald-200">
              {tlFormat(HBB_TOPLAM)}
            </td>
          </tr>
        </tbody>
      </table>
      <div className="px-4 py-2.5">
        <p className="text-xs leading-relaxed text-slate-400">{t.hbbNot}</p>
      </div>
    </div>
  );
}

function Secenekler({
  etiket,
  baslik,
  secenekler,
  onSec,
  onGeri,
}: {
  etiket: string;
  baslik: string;
  secenekler: { anahtar: string; metin: string }[];
  onSec: (a: string) => void;
  onGeri: () => void;
}) {
  return (
    <section>
      <button
        onClick={onGeri}
        className="mb-2 text-sm text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
      >
        ← {t.geri}
      </button>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{etiket}</p>
      <h2 className="mt-1 text-lg font-semibold text-slate-100">{baslik}</h2>
      <div className="mt-4 space-y-2.5">
        {secenekler.map((s) => (
          <button
            key={s.anahtar}
            onClick={() => onSec(s.anahtar)}
            className="w-full rounded-2xl border border-royal-light/25 bg-midnight-soft px-4 py-3.5 text-left text-base font-medium text-slate-100 transition-colors hover:border-gold hover:bg-midnight-card"
          >
            {s.metin}
          </button>
        ))}
      </div>
    </section>
  );
}

// ---------- Kişisel kariyer planı kartı ----------
function PlanKarti({ plan }: { plan: KariyerPlani }) {
  const km = plan.kilometreTaslari;
  const ara = km.slice(0, -1);
  const ana = km[km.length - 1];
  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-400/40 bg-[#08182a]/95 shadow-xl backdrop-blur-sm">
      <div className="border-l-4 border-emerald-400 bg-emerald-500/15 px-5 py-3">
        <p className="text-lg font-bold text-emerald-50">{t.planBaslik(plan.rutbe)}</p>
        <p className="text-xs text-emerald-200/90">
          {t.planOzet(plan.sureAy, plan.gunlukSaatEtiket, plan.haftalikSaat)}
        </p>
      </div>
      <dl className="divide-y divide-white/5 px-5 py-1 text-sm">
        {ara.map((k, i) => (
          <SatirKV
            key={k.rutbe}
            k={i === 0 ? t.ilkHedef(k.ay) : t.ikinciHedef(k.ay)}
            v={`${k.rutbe} — ${tlFormat(k.gelir, k.arti)} ${t.aylikBirim}`}
          />
        ))}
        <div className="flex items-baseline justify-between gap-3 py-3">
          <dt className="text-slate-400">{t.anaHedef(ana.ay)}</dt>
          <dd className="text-right text-lg font-bold text-emerald-300">
            {ana.rutbe} — {tlFormat(ana.gelir, ana.arti)} {t.aylikBirim}
          </dd>
        </div>
        <SatirKV k={t.gunlukYatirim} v={plan.gunlukSaatEtiket} guclu />
        <SatirKV
          k={t.toplamYatirim}
          v={t.toplamYatirimDeger(plan.toplamSaat, tlFormat(plan.toplamPara))}
          guclu
        />
        <SatirKV k={t.geriDonus} v={t.geriDonusDeger(plan.geriDonusAy)} guclu />
      </dl>
      <div className="bg-gold/[0.06] px-5 py-3">
        <p className="text-sm leading-relaxed text-gold-light">
          {t.bunuDusun(
            plan.gunlukSaatEtiket,
            plan.sureAy,
            tlFormat(plan.gelir, plan.gelirArti),
            tlFormat(plan.saatlikKazanc)
          )}
        </p>
      </div>
    </div>
  );
}

// ---------- OV büyüme simülasyon kartı ----------
function OvSimKarti({ ov0, ovHedef, sureAy }: { ov0: number; ovHedef: number; sureAy: number }) {
  const milestoneAylar = simulasyonMilestonelari(sureAy);
  const tempo = gerekliTempo(ov0, ovHedef, sureAy);
  const tempoYuzde = tempo > 0 ? `%${(tempo * 100).toFixed(0)}` : "—";
  const makul = makuSure(ov0, ovHedef);
  return (
    <div className="overflow-hidden rounded-2xl border border-royal-light/25 bg-[#08182a]/95 shadow-xl backdrop-blur-sm">
      <div className="border-b border-royal-light/15 px-4 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">{t.simulasyonBaslik}</p>
      </div>
      {/* Senaryo tablosu */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[300px] text-xs">
          <thead>
            <tr className="border-b border-royal-light/10 text-slate-500">
              <th className="px-3 py-2 text-left">Ay</th>
              {OV_SENARYOLAR.map((s) => (
                <th key={s.etiket} className="px-2 py-2 text-right font-semibold">{s.etiket}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-royal-light/10">
            {milestoneAylar.map((ay) => (
              <tr key={ay} className={ay === sureAy ? "bg-gold/5" : ""}>
                <td className="px-3 py-2 font-medium text-slate-300">{t.simulasyonAyEtiket(ay)}</td>
                {OV_SENARYOLAR.map((s) => {
                  const ov = ovSimulasyonu(ov0, ay, s.buyume);
                  const ulasmis = ov >= ovHedef;
                  return (
                    <td key={s.etiket} className={`px-2 py-2 text-right font-mono ${ulasmis ? "font-bold text-emerald-400" : "text-slate-300"}`}>
                      {tlFormat(ov)}{ulasmis ? " ✓" : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Tempo + makul süre */}
      <div className="space-y-1 border-t border-royal-light/15 px-4 py-2.5">
        <p className="text-xs text-slate-400">{t.simulasyonGerekliTempo(tempoYuzde)}</p>
        {makul > 0 && <p className="text-xs text-gold-light">{t.simulasyonMakul(makul)}</p>}
      </div>
      {/* Uyarı */}
      <div className="border-t border-royal-light/15 px-4 py-2.5">
        <p className="text-[0.65rem] leading-relaxed text-slate-500">{t.simulasyonUyari}</p>
      </div>
    </div>
  );
}

function SatirKV({ k, v, guclu }: { k: string; v: string; guclu?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <dt className="text-slate-400">{k}</dt>
      <dd className={`text-right ${guclu ? "font-bold text-slate-100" : "font-medium text-slate-200"}`}>{v}</dd>
    </div>
  );
}

// ---------- Ortak ----------
function Kapak({ ikon, baslik, children }: { ikon: string; baslik: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="kart-cam max-w-md rounded-3xl p-8 text-center">
        <p className="text-5xl" aria-hidden>
          {ikon}
        </p>
        <h1 className="prizma-serif ay-metin mt-4 text-2xl font-semibold">{baslik}</h1>
        {children}
      </div>
    </div>
  );
}

function SifirlaSatiri({ onSifirla, className = "" }: { onSifirla: () => void; className?: string }) {
  const [sor, setSor] = useState(false);
  if (sor) {
    return (
      <div className={`rounded-2xl border border-red-400/30 bg-red-500/5 p-3 ${className}`}>
        <p className="text-sm text-slate-300">{t.sifirlaOnayMetin}</p>
        <div className="mt-2 flex justify-center gap-3">
          <button
            onClick={() => setSor(false)}
            className="rounded-lg border border-royal-light/40 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-midnight-soft"
          >
            {t.sifirlaVazgec}
          </button>
          <button
            onClick={onSifirla}
            className="rounded-lg bg-red-500/80 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
          >
            {t.sifirlaEvet}
          </button>
        </div>
      </div>
    );
  }
  return (
    <button
      onClick={() => setSor(true)}
      className={`mx-auto block text-sm text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline ${className}`}
    >
      {t.sifirlaDugme}
    </button>
  );
}

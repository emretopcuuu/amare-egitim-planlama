"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { kutla } from "@/lib/his";
import KivilcimPatlama from "@/components/KivilcimPatlama";
import MikrofonButonu from "@/components/MikrofonButonu";
import HedefPlanKarti from "@/components/HedefPlanKarti";
import BilgiIpucu from "@/components/BilgiIpucu";
import KayitRozeti from "@/components/KayitRozeti";
import GizlilikMuhru from "@/components/GizlilikMuhru";
import { ONBOARDING_SURE_DK } from "@/lib/onboardingSure";
import {
  KARIYER_BASAMAKLARI,
  TEMPO_SECENEKLERI,
  planKapisi,
  type PlanKapisi,
  GUNLUK_SAAT_SECENEKLERI,
  kariyerPlaniHesapla,
  tlFormat,
  type KariyerPlani,
  ovSimulasyonu,
  simulasyonSinirliAylar,
  HBB_AYLAR,
  HBB_TOPLAM,
  HBB_BONUS_TOPLAM,
} from "@/lib/kariyer";

const t = tr.hedef;

type Mesaj = { rol: string; icerik: string };
type Durum = { asama: string; tamam: boolean; baslangicVar: boolean; plan: KariyerPlani | null; baslangicOv: number | null; baslangicVol: number | null; yeniBaslangic: boolean };
type Faz = "acilis" | "baslangic" | "sohbet" | "wizard" | "tamam";

// Kariyer basamakları — 8 seviye (Pusula başından buraya taşındı).
const KARIYER_SECENEKLER = [
  "leader", "senior_leader", "exec_leader", "diamond",
  "1_star_diamond", "2_star_diamond", "3_star_diamond", "presidential_diamond",
] as const;

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
  const [vol0, setVol0] = useState<number | null>(durum.baslangicVol ?? null);
  const [kutlama, setKutlama] = useState(0); // hedef mühürlenince kıvılcım patlaması
  // [E8] Kariyer/OV formu ve mühür başarıyla kaydedilince köşede "✓ Kaydedildi".
  const [kayitBasari, setKayitBasari] = useState(0);

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
        {/* [UX4/E2] Süre beklentisi — merkezi haritadan */}
        <p className="mt-3 inline-block rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-slate-400">
          ⏱ ~{ONBOARDING_SURE_DK.hedef} dk sürer
        </p>
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
        onKaydet={async (kariyer, ay, detay, ov, vol) => {
          setMesgul(true);
          setHata(null);
          const v = await istek({
            baslangic: { kariyer, deneyimAy: ay, detay, baslangicOv: ov, baslangicVol: vol },
          });
          setMesgul(false);
          if (!v?.ok) {
            setHata(v?.hata ?? t.hata);
            return;
          }
          setKayitBasari((n) => n + 1); // [E8] görünür güven
          setOv0(ov);
          setVol0(vol);
          setFaz("sohbet");
        }}
        mesgul={mesgul}
        hata={hata}
        onSifirla={sifirla}
        onGeri={() => setFaz("acilis")}
      />
    );
  }

  // ---- KISA ISINMA SOHBETİ ----
  if (faz === "sohbet") {
    return (
      <>
        {/* [E8] Başlangıç formu az önce kaydedildiyse kısa görünür güven */}
        <KayitRozeti basari={kayitBasari} />
        <Sohbet
          baslangic={gecmis}
          istek={istek}
          onBitti={() => setFaz("wizard")}
          onSifirla={sifirla}
          onGeri={() => setFaz("baslangic")}
        />
        {/* Gizlilik mührü — kariyer/gelir gibi hassas verilerde güven imzası */}
        <GizlilikMuhru />
      </>
    );
  }

  // ---- SOMUTLAŞTIRMA WIZARD'I ----
  if (faz === "wizard") {
    return (
      <Wizard
        ov0={ov0}
        vol0={vol0}
        yeniBaslangic={durum.yeniBaslangic}
        onMuhur={async (hedefIndex, tempo, gunluk) => {
          setMesgul(true);
          setHata(null);
          const v = await istek({ kariyer: { hedefIndex, tempo, gunluk } });
          setMesgul(false);
          if (!v?.ok || !v.plan) {
            setHata(v?.hata ?? t.hata);
            return;
          }
          setKayitBasari((n) => n + 1); // [E8] görünür güven
          setPlan(v.plan as KariyerPlani);
          setFaz("tamam");
          kutla(); // dokunsal + su dalgası
          setKutlama((k) => k + 1); // kıvılcım patlaması
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
      <KayitRozeti basari={kayitBasari} />
      <KivilcimPatlama tetik={kutlama} />
      <div className="text-center">
        <p className="text-5xl" aria-hidden>
          🎯
        </p>
        <h1 className="prizma-serif ay-metin mt-3 text-2xl font-semibold">{t.tamamBaslik}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{t.tamamMetin}</p>
      </div>
      {plan && <HedefPlanKarti plan={plan} />}
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
  onGeri,
}: {
  onKaydet: (kariyer: string, ay: number | null, detay: string | null, ov: number, vol: number) => void;
  mesgul: boolean;
  hata: string | null;
  onSifirla: () => void;
  onGeri: () => void;
}) {
  const [kariyer, setKariyer] = useState("");
  const [ay, setAy] = useState("");
  const [detay, setDetay] = useState("");
  const [ov, setOv] = useState("");
  const [vol, setVol] = useState("");
  const ovNum = Number(ov);
  const volNum = Number(vol);
  // 0 GEÇERLİ: 3 ay pasif kalmış (OV/VOL = 0) biri de ilerleyebilmeli. Şart,
  // "0'dan büyük" değil "boş değil" — alan rakam girilince geçerli (0 dahil).
  const ovGecerli = ov.length > 0 && ovNum >= 0;
  const volGecerli = vol.length > 0 && volNum >= 0;
  const gecerli = !!kariyer && ovGecerli && volGecerli;
  return (
    <div className="mx-auto my-auto w-full max-w-md space-y-5 p-5">
      <button
        type="button"
        onClick={onGeri}
        className="-mb-1 flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-slate-200"
      >
        ← {t.geri}
      </button>
      <header>
        <h1 className="prizma-serif ay-metin text-2xl font-semibold">{t.noktaBaslik}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{t.noktaAciklama}</p>
      </header>
      {/* Kariyer basamağı — 8 seviye (zorunlu) */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-400">{t.kariyerEtiket}</label>
        <select
          value={kariyer}
          onChange={(e) => setKariyer(e.target.value)}
          className="h-12 w-full rounded-xl border border-royal-light/30 bg-midnight-soft px-3 text-base text-slate-100 outline-none focus:border-gold"
        >
          <option value="">{t.kariyerSecimYer}</option>
          {KARIYER_SECENEKLER.map((k) => (
            <option key={k} value={k}>
              {t.kariyerSeviyeEtiketler[k]}
            </option>
          ))}
        </select>
      </div>
      {/* OV — Son 3 ay ortalaması (zorunlu) */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-400">
          {t.ovEtiket}
          {/* [E9] OV nedir + rakamı nereden bulur */}
          <BilgiIpucu metin={t.ovIpucu} etiket="OV nedir?" />
        </label>
        <input
          inputMode="numeric"
          value={ov}
          onChange={(e) => setOv(e.target.value.replace(/[^0-9]/g, "").slice(0, 9))}
          className={`w-full rounded-xl border bg-midnight-soft px-4 py-2.5 text-base text-slate-100 outline-none focus:border-gold ${
            ov.length > 0 && !ovGecerli ? "border-red-400/60" : "border-royal-light/30"
          }`}
          placeholder={t.ovYer}
        />
      </div>
      {/* VOL — Son 3 ay ortalaması (zorunlu), kariyerin/OV'nin hemen altında */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-400">
          {t.volEtiket}
          {/* [E9] VOLL nedir + rakamı nereden bulur */}
          <BilgiIpucu metin={t.volIpucu} etiket="VOLL nedir?" />
        </label>
        <input
          inputMode="numeric"
          value={vol}
          onChange={(e) => setVol(e.target.value.replace(/[^0-9]/g, "").slice(0, 9))}
          className={`w-full rounded-xl border bg-midnight-soft px-4 py-2.5 text-base text-slate-100 outline-none focus:border-gold ${
            vol.length > 0 && !volGecerli ? "border-red-400/60" : "border-royal-light/30"
          }`}
          placeholder={t.volYer}
        />
        {((ov.length > 0 && !ovGecerli) || (vol.length > 0 && !volGecerli)) && (
          <p className="text-xs text-red-400">{t.ovZorunlu}</p>
        )}
      </div>
      {/* Kıdem — ay yazdırmak yerine değer aralığı seçtir (opsiyonel) */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-400">{t.noktaAyEtiket}</label>
        <select
          value={ay}
          onChange={(e) => setAy(e.target.value)}
          className="h-12 w-full rounded-xl border border-royal-light/30 bg-midnight-soft px-3 text-base text-slate-100 outline-none focus:border-gold"
        >
          <option value="">{t.kidemSecimYer}</option>
          {t.kidemAraliklar.map((r) => (
            <option key={r.ay} value={String(r.ay)}>
              {r.etiket}
            </option>
          ))}
        </select>
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
        onClick={() => gecerli && onKaydet(kariyer, ay ? Number(ay) : null, detay || null, ovNum, volNum)}
        disabled={!gecerli || mesgul}
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
  onGeri,
}: {
  baslangic: Mesaj[];
  istek: (g: Record<string, unknown>) => Promise<{ mesaj?: string; bitti?: boolean; hata?: string } | null>;
  onBitti: () => void;
  onSifirla: () => void;
  onGeri: () => void;
}) {
  const [mesajlar, setMesajlar] = useState<Mesaj[]>(baslangic);
  const [girdi, setGirdi] = useState("");
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  // Sohbet "bitti" olunca otomatik geçme — kişi kapanış cümlesini okusun,
  // hazır olunca kendisi "Devam et"e bassın.
  const [hazirDevam, setHazirDevam] = useState(false);
  const altRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const acilisRef = useRef(false);

  useEffect(() => {
    altRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mesajlar, mesgul]);

  // Yazdıkça metin alanı içeriğe göre büyüsün (tek satırda kırpılmasın).
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [girdi]);

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
    <main
      className="koyu-alan relative isolate mx-auto flex w-full max-w-md flex-col px-4 pb-4 pt-3"
      // Üstteki kimlik çipi (KimsinBant) global boşluk ayırıyor; min-h-dvh
      // çakışma yaratıyordu. Çipin altındaki kalan alana TAM sığ (KocuSohbet deseni).
      style={{ height: "calc(100dvh - env(safe-area-inset-top, 0px) - 3.5rem)" }}
    >
      <div aria-hidden className="pusula-okur-zemin pointer-events-none absolute inset-0 -z-10" />
      <header className="relative shrink-0 pb-3 text-center">
        <button
          type="button"
          onClick={onGeri}
          className="absolute left-0 top-0 flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-slate-200"
        >
          ← {t.geri}
        </button>
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
                m.rol === "ayna"
                  ? "kart-cam text-slate-100"
                  : "bg-gradient-to-br from-[#243349] to-[#10192a] text-[#f5ecd8] ring-1 ring-[#d4af37]/40 shadow-[0_6px_20px_-6px_rgba(0,0,0,0.45)]"
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
            ref={taRef}
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
          <MikrofonButonu
            ikon
            onMetin={(p) => setGirdi((g) => (g.trim() ? `${g.trim()} ${p}` : p))}
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
  vol0,
  yeniBaslangic,
  onMuhur,
  mesgul,
  hata,
  onSifirla,
}: {
  ov0: number | null;
  vol0: number | null;
  yeniBaslangic: boolean;
  onMuhur: (hedefIndex: number, tempo: string, gunluk: string) => void;
  mesgul: boolean;
  hata: string | null;
  onSifirla: () => void;
}) {
  const [hedefIndex, setHedefIndex] = useState<number | null>(null);
  const [tempo, setTempo] = useState<string | null>(null);
  const [gunluk, setGunluk] = useState<string | null>(null);

  const adim = hedefIndex == null ? 1 : tempo == null ? 2 : gunluk == null ? 3 : 4;
  const hedefRutbe = hedefIndex != null ? KARIYER_BASAMAKLARI[hedefIndex] : null;
  const tempoObj = TEMPO_SECENEKLERI.find((tp) => tp.anahtar === tempo);
  const saatObj = GUNLUK_SAAT_SECENEKLERI.find((g) => g.anahtar === gunluk);
  // Süre, seçilen tempoyla bağlayıcı kapıdan (OV VEYA VOLL) TÜRETİLİR. Kayıt
  // kariyeri için gereken OV zaten fazlaysa süreyi VOLL belirler (Diamond+ ta
  // büyüme yarılanır) — "surplus OV → 1 ayda hedef" yanılgısı olmaz.
  const kapi =
    hedefIndex != null && tempoObj
      ? planKapisi(ov0 ?? 0, vol0 ?? 0, hedefIndex, tempoObj.buyume)
      : null;
  const sureAy = kapi?.sureAy ?? null;
  const plan =
    hedefIndex != null && sureAy && saatObj
      ? kariyerPlaniHesapla(hedefIndex, sureAy, saatObj.gunluk, saatObj.etiket, kapi)
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
      {tempoObj && sureAy && (
        <Rozet
          etiket={t.tempoEtiket}
          deger={`${tempoObj.etiket} · ${t.tempoAyTahmin(sureAy)}`}
          onTik={adim < 4 ? undefined : () => setTempo(null)}
        />
      )}

      {/* key={adim} → her soru geçişinde blok yeniden monte olur ve 'of-adim'
          sinematik girişiyle (kayma + hafif yakınlaşma) belirir. */}
      <div key={adim} className="of-adim space-y-4">
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

      {/* SORU 2 — TEMPO seçimi: kişi büyüme hızını seçer; her seçenekte hedefe
          kaç ayda ulaşacağı (kendi OV'sinden türetilmiş) gösterilir. */}
      {adim === 2 && hedefRutbe && (
        <section>
          <button
            onClick={() => setHedefIndex(null)}
            className="mb-2 text-sm text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
          >
            ← {t.geri}
          </button>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.soruEtiket(2)}</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-100">{t.q2Baslik}</h2>
          <div className="mt-4 space-y-2.5">
            {TEMPO_SECENEKLERI.map((tp) => {
              const ay = hedefIndex != null
                ? planKapisi(ov0 ?? 0, vol0 ?? 0, hedefIndex, tp.buyume).sureAy
                : 1;
              return (
                <button
                  key={tp.anahtar}
                  onClick={() => setTempo(tp.anahtar)}
                  className="flex w-full items-center justify-between rounded-2xl border border-royal-light/25 bg-midnight-soft px-4 py-3.5 text-left transition-colors hover:border-gold hover:bg-midnight-card"
                >
                  <span className="text-base font-semibold text-slate-100">{tp.etiket}</span>
                  <span className="text-sm font-bold text-gold-light">{t.tempoAyTahmin(ay)}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {adim === 3 && (
        <Secenekler
          etiket={t.soruEtiket(3)}
          baslik={t.q3Baslik}
          secenekler={GUNLUK_SAAT_SECENEKLERI.map((g) => ({ anahtar: g.anahtar, metin: g.etiket }))}
          onSec={setGunluk}
          onGeri={() => setTempo(null)}
        />
      )}

      {adim === 4 && plan && (
        <section className="space-y-4">
          <p className="text-center text-sm font-semibold text-gold-light">{t.planUstBaslik}</p>
          {/* Büyüme simülasyonu: bağlayıcı kapı (OV/VOLL), etkin tempoyla ay ay;
              üst sınırı geçince durur. Aytug: yüksek basamakta VOLL'yi göster. */}
          {kapi && kapi.baslangic > 0 && sureAy && (
            <OvSimKarti kapi={kapi} sureAy={sureAy} />
          )}
          <HedefPlanKarti plan={plan} />
          {/* Kampta + sonraki 90 gün destek vaadi */}
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-200">🤝 {t.destek90Baslik}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">{t.destek90Metin}</p>
          </div>
          {hata && <p className="text-center text-sm text-red-400">{hata}</p>}
          <button
            onClick={() => hedefIndex != null && tempo && gunluk && onMuhur(hedefIndex, tempo, gunluk)}
            disabled={mesgul}
            className="btn-kor parilti flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold disabled:opacity-50"
          >
            {mesgul ? t.dusunuyor : t.planOnayla}
          </button>
          <button
            onClick={() => {
              setHedefIndex(null);
              setTempo(null);
              setGunluk(null);
            }}
            className="mx-auto block text-sm text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
          >
            {t.planDegistir}
          </button>
        </section>
      )}
      </div>

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
    <div className="kart-cam mt-3 overflow-x-auto rounded-2xl shadow-[0_22px_55px_-26px_rgba(15,30,50,0.45)]">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="kariyer-cizgi kariyer-baslik border-b text-[0.6rem] font-semibold uppercase tracking-wide">
            <th className="px-2.5 py-2.5 font-semibold">{t.tabloKariyer}</th>
            {/* Dar ekranda (telefon) detay sütunları gizlenir → tablo yatay
                kaydırma gerektirmeden sığar; sm+ (tablet/masaüstü) hepsi görünür. */}
            <th className="hidden px-1.5 py-2.5 text-right font-semibold sm:table-cell">{t.tabloEnDusuk}</th>
            <th className="hidden px-1.5 py-2.5 text-right font-semibold sm:table-cell">{t.tabloEnYuksek}</th>
            <th className="px-2.5 py-2.5 text-right font-semibold">{t.tabloOrtalama}</th>
          </tr>
        </thead>
        <tbody>
          {KARIYER_BASAMAKLARI.map((r, i) => (
            <tr
              key={r.ad}
              onClick={() => onSec(i)}
              style={{ animationDelay: `${i * 55}ms` }}
              className="kariyer-satir kariyer-cizgi cursor-pointer border-t transition-colors hover:bg-gold/10"
            >
              <td className="px-2.5 py-2.5">
                <span className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-100">{r.ad}</span>
                  {r.rozet && (
                    <span className="shrink-0 rounded-full bg-gold/20 px-1.5 py-0.5 text-[0.55rem] font-semibold text-gold-light">
                      {r.rozet}
                    </span>
                  )}
                </span>
              </td>
              <td className="hidden whitespace-nowrap px-1.5 py-2.5 text-right font-mono text-xs tabular-nums text-slate-400 sm:table-cell">
                {r.enDusuk != null ? tlFormat(r.enDusuk) : "—"}
              </td>
              <td className="hidden whitespace-nowrap px-1.5 py-2.5 text-right font-mono text-xs tabular-nums text-slate-400 sm:table-cell">
                {r.enYuksek != null ? tlFormat(r.enYuksek) : "—"}
              </td>
              <td className="kariyer-vurgu whitespace-nowrap px-2.5 py-2.5 text-right font-mono text-sm font-bold tabular-nums">
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
    <div className="kart-cam overflow-x-auto rounded-2xl shadow-[0_22px_55px_-26px_rgba(15,30,50,0.45)]">
      <div className="border-l-4 border-gold bg-gold/10 px-4 py-3">
        <p className="kariyer-baslik text-sm font-bold">{t.hbbBaslik}</p>
        <p className="mt-0.5 text-xs text-slate-300">{t.hbbAciklama}</p>
      </div>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="kariyer-baslik kariyer-cizgi border-b text-[0.6rem] font-semibold uppercase tracking-wide">
            <th className="px-3 py-2">{t.hbbAy}</th>
            <th className="px-2 py-2 text-right">{t.hbbBonus}</th>
            <th className="px-2 py-2 text-right">{t.hbbOrtalama}</th>
            <th className="px-3 py-2 text-right">{t.hbbToplam}</th>
          </tr>
        </thead>
        <tbody>
          {HBB_AYLAR.map((a) => (
            <tr key={a.ay} className="kariyer-cizgi border-t">
              <td className="px-3 py-2.5">
                <span className="text-sm font-semibold text-slate-100">{t.hbbAyEtiket(a.ay)}</span>
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
              <td className="kariyer-vurgu whitespace-nowrap px-3 py-2.5 text-right font-mono text-sm font-bold tabular-nums">
                {tlFormat(a.toplam)}
              </td>
            </tr>
          ))}
          <tr className="kariyer-cizgi border-t bg-gold/5">
            <td className="kariyer-baslik px-3 py-2.5 text-sm font-bold">{t.hbbToplamSatir}</td>
            <td className="whitespace-nowrap px-2 py-2.5 text-right font-mono text-xs tabular-nums text-slate-300">
              {tlFormat(HBB_BONUS_TOPLAM)}
            </td>
            <td />
            <td className="kariyer-vurgu whitespace-nowrap px-3 py-2.5 text-right font-mono text-sm font-bold tabular-nums">
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

// ---------- Büyüme simülasyon kartı (bağlayıcı kapı: OV/VOLL, sınırlı) ----------
function OvSimKarti({ kapi, sureAy }: { kapi: PlanKapisi; sureAy: number }) {
  const { metrik, baslangic, hedef, buyume, sinir } = kapi;
  // Üst sınırı (OV:1M / VOLL:300k) geçince afaki büyümeyi gösterme: tablo durur.
  const aylar = simulasyonSinirliAylar(baslangic, buyume, sureAy, sinir);
  const sonDeger = ovSimulasyonu(baslangic, aylar[aylar.length - 1], buyume);
  const siniraUlasti = sonDeger >= sinir && sureAy > aylar.length;
  return (
    <div className="kart-cam overflow-hidden rounded-2xl shadow-[0_22px_55px_-26px_rgba(15,30,50,0.45)]">
      <div className="kariyer-cizgi border-b px-4 py-2.5">
        <p className="kariyer-baslik text-xs font-semibold uppercase tracking-wide">{t.simulasyonBaslik(metrik)}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="kariyer-cizgi kariyer-baslik border-b">
              <th className="px-3 py-2 text-left font-semibold">Ay</th>
              <th className="px-3 py-2 text-right font-semibold">{`${metrik} · %${Math.round(buyume * 100)} / ay`}</th>
            </tr>
          </thead>
          <tbody className="kariyer-bol">
            {aylar.map((ay) => {
              const ov = ovSimulasyonu(baslangic, ay, buyume);
              const ulasmis = ov >= hedef;
              return (
                <tr key={ay} className={ulasmis ? "bg-gold/5" : ""}>
                  <td className="px-3 py-2 font-semibold text-slate-300">{t.simulasyonAyEtiket(ay)}</td>
                  <td className={`px-3 py-2 text-right font-mono ${ulasmis ? "kariyer-vurgu font-bold" : "text-slate-400"}`}>
                    {tlFormat(ov)}{ulasmis ? " ✓" : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {siniraUlasti && (
        <div className="kariyer-cizgi border-t px-4 py-2.5">
          <p className="kariyer-baslik text-xs">{t.simulasyonSinirNot(metrik)}</p>
        </div>
      )}
      <div className="kariyer-cizgi border-t px-4 py-2.5">
        <p className="text-[0.65rem] leading-relaxed text-slate-500">{t.simulasyonUyari}</p>
      </div>
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

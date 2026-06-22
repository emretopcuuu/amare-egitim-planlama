"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { tr } from "@/lib/i18n/tr";
import { titret } from "@/lib/his";
import MikrofonButonu from "@/components/MikrofonButonu";
import Konfeti from "@/components/Konfeti";
import YaziBoyu from "@/components/YaziBoyu";
import AynaLogo from "@/components/AynaLogo";
import AsamaRayi, { type RayAsama } from "@/components/AsamaRayi";
import { ADIMLAR, adimDolu, katman1Tutarlilik, SONUC_KARTI } from "@/lib/onFarkindalik";

// Adımları "grup" (bölüm/katman) sırasına göre ardışık kümele — aşama rayı için.
const BOLUMLER: { ad: string; sonIdx: number }[] = (() => {
  const sira: { ad: string; sonIdx: number }[] = [];
  ADIMLAR.forEach((s, i) => {
    const son = sira[sira.length - 1];
    if (!son || son.ad !== s.grup) sira.push({ ad: s.grup, sonIdx: i });
    else son.sonIdx = i;
  });
  return sira;
})();

const t = tr.onFarkindalik;
const TOPLAM = ADIMLAR.length;
const SONUC_KODLAR = new Set(SONUC_KARTI.map((s) => s.kod));
// Sonuç Kartı soruları soyut ("tek cümleyle özetle") — aday ne yazacağını net
// anlasın diye her birine somut bir örnek iliştiriyoruz (boş/anlamsız giriş azalır).
const METIN_IPUCLARI: Record<string, string> = {
  "sonuc.guclu": "Örn: “Baskı altında sakin kalır, dağılan ekibi toparlarım.”",
  "sonuc.kor_nokta": "Örn: “Kontrolü bırakamadığım için iş paylaşmıyor, her şeyi kendim yapıyorum.”",
  "sonuc.kamp_gorevi":
    "Örn: “Her sabah 3 kişiye geri bildirim vereceğim; akşam paylaşımında ilk sözü ben alacağım.”",
};
// UX #7: kamp wifi'si oynak — cevapları cihazda da yedekle (yenileme/çevrimdışı kayıp yok).
const TASLAK_DEPO = "la_of_taslak_v1";

// Dürüstlük vurgusu: "gerçek…/dürüst…" sözcüklerini altın renkle öne çıkar — bu
// çalışmanın değeri adayın ne kadar dürüst olduğuna bağlı; göz oraya gitsin.
const DURUST_AYIR = /(gerçek[\p{L}]*|dürüst[\p{L}]*)/giu;
const DURUST_TEK = /^(gerçek[\p{L}]*|dürüst[\p{L}]*)$/iu;
function DurustVurgu({ metin }: { metin: string }) {
  return (
    <>
      {metin.split(DURUST_AYIR).map((p, i) =>
        DURUST_TEK.test(p) ? (
          <span key={i} className="font-semibold text-gold-light">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

// Dürüstlük telkinleri: ilerleme bu eşikleri geçtiğinde bir kez beliren kısa
// hatırlatma — aday gerçeğe yatmak zorunda hissetsin.
const TELKIN_ESIKLERI = [25, 50, 75] as const;

// SİHİRBAZ: her ekranda TEK iş. Girdi tipleri: 1-5 ifade, ikili 1-10, sayı,
// yazılı (sesle de). Kademeli, otomatik ilerleme (likert), kısmi kayıt.
export default function OnFarkindalikAkis({
  baslangicSayi,
  baslangicMetin,
  oneri,
}: {
  baslangicSayi: Record<string, number>;
  baslangicMetin: Record<string, string>;
  oneri: Record<string, string>;
}) {
  const router = useRouter();
  const [yanitlar, setYanitlar] = useState<Record<string, number>>({ ...baslangicSayi });
  // Sonuç Kartı'nı profil önerisiyle pre-fill et (boşsa) — düzenlenebilir.
  const [metinler, setMetinler] = useState<Record<string, string>>(() => {
    const m = { ...baslangicMetin };
    for (const kod of SONUC_KODLAR) {
      if (!(m[kod] ?? "").trim() && (oneri[kod] ?? "").trim()) m[kod] = oneri[kod];
    }
    return m;
  });
  const [giris, setGiris] = useState(
    Object.keys(baslangicSayi).length === 0 && Object.keys(baslangicMetin).length === 0
  );
  const [adim, setAdim] = useState(() => {
    const i = ADIMLAR.findIndex((a) => !adimDolu(a, baslangicSayi, baslangicMetin));
    return i === -1 ? TOPLAM : i;
  });
  const [sayiGirdi, setSayiGirdi] = useState("");
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const ilerleZam = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Dürüstlük telkini: hangi eşikler gösterildi + o anki mesaj.
  const [telkin, setTelkin] = useState<string | null>(null);
  const telkinRef = useRef<Set<number>>(new Set());

  const yapilan = useMemo(
    () => ADIMLAR.filter((a) => adimDolu(a, yanitlar, metinler)).length,
    [yanitlar, metinler]
  );

  // Mount'ta geçilmiş eşikleri "gösterildi" say (geriye dönük telkin patlatma).
  useEffect(() => {
    const p = Math.round((Math.min(adim + 1, TOPLAM) / TOPLAM) * 100);
    for (const e of TELKIN_ESIKLERI) if (p >= e) telkinRef.current.add(e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // İlerleme bir eşiği YENİ geçtiğinde dürüstlük telkinini bir kez göster.
  useEffect(() => {
    const p = Math.round((Math.min(adim + 1, TOPLAM) / TOPLAM) * 100);
    for (const e of TELKIN_ESIKLERI) {
      if (p >= e && !telkinRef.current.has(e)) {
        telkinRef.current.add(e);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTelkin(t.durustlukTelkinler[e]);
        titret([10, 40, 10]);
      }
    }
  }, [adim]);

  // Telkin birkaç saniye sonra kendiliğinden kapansın.
  useEffect(() => {
    if (!telkin) return;
    const id = setTimeout(() => setTelkin(null), 6500);
    return () => clearTimeout(id);
  }, [telkin]);

  // UX #3: tüm çalışma tamamlanınca mikro-kutlama (haptik) — momentum hissi.
  const tumuBitti = adim >= TOPLAM && yapilan === TOPLAM;
  useEffect(() => {
    if (tumuBitti) titret([15, 40, 15, 40, 30]);
  }, [tumuBitti]);

  // UX #7: mount'ta cihaz yedeğini birleştir (sunucu yüklemesi çevrimdışı düşmüşse
  // kurtarır) + KALDIĞI ADIMI geri yükle ("kaydet & çık" sonrası tam yerinden devam).
  useEffect(() => {
    try {
      const ham = localStorage.getItem(TASLAK_DEPO);
      if (!ham) return;
      const d = JSON.parse(ham) as {
        yanitlar?: Record<string, number>;
        metinler?: Record<string, string>;
        adim?: number;
      };
      if (d.yanitlar) setYanitlar((e) => ({ ...d.yanitlar, ...e }));
      if (d.metinler) setMetinler((e) => ({ ...d.metinler, ...e }));
      if (typeof d.adim === "number" && d.adim >= 0 && d.adim <= TOPLAM) {
        // Sunucudaki ilk boşluktan daha ileriye gittiyse oraya dön (geri gidip
        // gözden geçirebilir); intro ekranı varsa atla.
        setAdim((cur) => Math.max(cur, d.adim!));
        if (d.adim > 0) setGiris(false);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // UX #7: her değişiklikte cihaza yedekle (cevaplar + kalınan adım) — yenileme/
  // çevrimdışı/çıkış sonrası kayıp olmaz.
  useEffect(() => {
    try {
      localStorage.setItem(TASLAK_DEPO, JSON.stringify({ yanitlar, metinler, adim }));
    } catch {}
  }, [yanitlar, metinler, adim]);

  // Her adım/ekran geçişinde sayfayı en tepeye al — yeni soru DAİMA en üstte
  // başlasın (yarı kaydırılmış halde açılmasın).
  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "auto" });
  }, [adim, giris]);

  // #9 Cevapları sunucuya da yaz (sessiz, fire-and-forget). localStorage cihaz
  // başına; bu sayede tarayıcı temizlense/cihaz değişse de ilerleme kaybolmaz.
  async function kaydetSessiz() {
    const gonderilecek = [
      ...Object.entries(yanitlar).map(([kod, deger]) => ({ kod, deger })),
      ...Object.entries(metinler)
        .filter(([, m]) => (m ?? "").trim())
        .map(([kod, metin]) => ({ kod, metin })),
    ];
    if (gonderilecek.length === 0) return;
    try {
      await fetch("/api/on-farkindalik", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ yanitlar: gonderilecek }),
      });
    } catch {
      // sessiz: localStorage yedeği zaten var, sonraki adımda yine denenir
    }
  }

  function ilerle() {
    setSayiGirdi("");
    setHata(null);
    void kaydetSessiz(); // her adımda sunucuya sessiz yedekle
    setAdim((a) => Math.min(a + 1, TOPLAM));
  }

  async function kaydet(): Promise<boolean> {
    const gonderilecek: { kod: string; deger?: number; metin?: string }[] = [
      ...Object.entries(yanitlar).map(([kod, deger]) => ({ kod, deger })),
      ...Object.entries(metinler)
        .filter(([, m]) => (m ?? "").trim())
        .map(([kod, metin]) => ({ kod, metin })),
    ];
    if (gonderilecek.length === 0) {
      setHata(t.enAzBir);
      return false;
    }
    setKaydediliyor(true);
    setHata(null);
    try {
      const res = await fetch("/api/on-farkindalik", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ yanitlar: gonderilecek }),
      });
      const v = await res.json().catch(() => null);
      if (!res.ok) {
        setHata(v?.hata ?? t.hata);
        return false;
      }
      return true;
    } catch {
      setHata(t.hata);
      return false;
    } finally {
      setKaydediliyor(false);
    }
  }

  async function kaydetVeCik() {
    if (await kaydet()) {
      router.refresh();
      router.push("/");
    }
  }

  function setSayi(kod: string, deger: number) {
    setYanitlar((e) => ({ ...e, [kod]: deger }));
    setHata(null);
  }
  function setMetin(kod: string, deger: string) {
    setMetinler((e) => ({ ...e, [kod]: deger }));
    setHata(null);
  }

  function likertSec(kod: string, deger: number) {
    titret(10);
    setSayi(kod, deger);
    if (ilerleZam.current) clearTimeout(ilerleZam.current);
    ilerleZam.current = setTimeout(ilerle, 260);
  }

  // GİRİŞ EKRANI
  if (giris) {
    return (
      <div className="flex min-h-[82vh] flex-col justify-center py-8 text-center">
        <AynaLogo className="text-4xl" />
        <h1 className="prizma-serif ay-metin mt-5 text-3xl font-semibold leading-tight">{t.girisBaslik}</h1>
        <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-slate-300"><DurustVurgu metin={t.girisMetin} /></p>
        {/* UX #4: sonunda ne kazanacağın — "neden buradayım" çerçevesi + ödül önizlemesi */}
        <ul className="mx-auto mt-6 max-w-md space-y-2 text-left">
          {t.girisKazanimlar.map((k, i) => (
            <li key={i} className="flex items-start gap-2.5 text-base text-slate-200">
              <span className="mt-0.5 text-gold-light" aria-hidden>✦</span>
              <span>{k}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={() => setGiris(false)}
          className="parilti btn-kor mx-auto mt-10 flex h-16 w-full max-w-md items-center justify-center rounded-2xl text-xl font-bold"
        >
          {t.girisDevam}
        </button>
        {/* UX #6: yaş-dostu — uzun çalışmaya başlamadan yazı boyutunu ayarla */}
        <div className="mx-auto mt-6 w-full max-w-md">
          <YaziBoyu />
        </div>
      </div>
    );
  }

  // TAMAM / KAYDEDİLDİ
  if (adim >= TOPLAM) {
    const tamamMi = yapilan === TOPLAM;
    return (
      <div className="flex min-h-[82vh] flex-col justify-center py-8 text-center">
        {tamamMi && <Konfeti />}
        <p className="text-5xl">{tamamMi ? <AynaLogo className="text-4xl" /> : "💾"}</p>
        <h1 className="prizma-serif ay-metin mt-5 text-3xl font-semibold leading-tight">
          {tamamMi ? t.tamamBaslik : t.devamBaslik}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-slate-300">
          {tamamMi ? t.tamamMetin : t.devamMetin}
        </p>
        <p className="mt-4 text-sm text-slate-400">{t.ilerleme(yapilan, TOPLAM)}</p>
        {/* #10 Veri dürüstlüğü: düz-çizgi cevap sezilirse nazik, özel bir yansıma */}
        {katman1Tutarlilik(yanitlar).dusukVaryans && (
          <div className="mx-auto mt-5 max-w-md rounded-2xl border border-amber-400/30 bg-amber-500/[0.06] p-4 text-left">
            <p className="text-sm font-semibold text-amber-300">{t.guvenBaslik}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">{t.guvenMetin}</p>
            <button
              onClick={() => setAdim(0)}
              className="mt-3 text-sm font-medium text-amber-300 underline-offset-4 hover:underline"
            >
              {t.guvenTekrar} →
            </button>
          </div>
        )}
        {hata && <p role="alert" className="mt-3 text-sm font-medium text-red-400">{hata}</p>}
        <div className="mt-8 space-y-3">
          <button
            onClick={kaydetVeCik}
            disabled={kaydediliyor}
            className="btn-kor parilti flex h-16 w-full items-center justify-center rounded-2xl text-xl font-bold disabled:opacity-50"
          >
            {kaydediliyor ? t.kaydediliyor : t.kaydet}
          </button>
          {!tamamMi && (
            <button
              onClick={() => setAdim(ADIMLAR.findIndex((a) => !adimDolu(a, yanitlar, metinler)))}
              className="flex h-12 w-full items-center justify-center text-base text-slate-400 hover:text-slate-200"
            >
              {t.devam}
            </button>
          )}
          {/* UX #5: korkusuz düzeltme — her an başa dönüp cevapları gözden geçir */}
          <button
            onClick={() => setAdim(0)}
            className="flex h-11 w-full items-center justify-center text-sm text-slate-500 underline-offset-4 hover:text-slate-300 hover:underline"
          >
            {t.gozdenGecir}
          </button>
        </div>
      </div>
    );
  }

  const a = ADIMLAR[adim];
  // Bu adım ileri gitmeye hazır mı? (opsiyonel metin hep "dolu" sayılır → atlanabilir)
  const suanGecerli = adimDolu(a, yanitlar, metinler);
  const yuzde = Math.round((Math.min(adim + 1, TOPLAM) / TOPLAM) * 100);
  // Gözden geçirme modu: her şey dolu ama aday erken bir adıma döndü → tek tuşla
  // sona (bitiş ekranına) dönebilsin, baştan sona tıklamak zorunda kalmasın.
  const gozdenMod = yapilan === TOPLAM && adim < TOPLAM;
  // UX #2: kalan süre tahmini (~12 sn/adım) — görünür bitiş çizgisi tamamlamayı artırır.
  const kalanDk = Math.max(1, Math.round(((TOPLAM - adim) * 12) / 60));

  return (
    <div className="flex min-h-[82vh] flex-col">
      {/* SABİT BAŞLIK — ilerleme + bölüm rayı (Öz Saygı, Öz Güven…) kaydırınca da
          hep en tepede çakılı kalır; -mx/-mt ile kenarlara taşar, üst boşluğu örter. */}
      <header className="sticky top-0 z-20 -mx-5 -mt-5 bg-midnight/92 px-5 pb-2.5 pt-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline">
            ← {t.geriDon}
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-base font-bold text-slate-300">%{yuzde}</span>
            <button
              type="button"
              onClick={kaydetVeCik}
              disabled={kaydediliyor || yapilan === 0}
              className="rounded-lg bg-gold px-2.5 py-1 text-xs font-bold text-[#1a1206] transition-colors hover:bg-gold-light disabled:opacity-40"
            >
              {kaydediliyor ? "…" : t.kaydetDevam}
            </button>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-gold-light/80">{a.grup}</p>
          <p className="text-[0.7rem] text-slate-500">{t.kalanDk(kalanDk)}</p>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold-dim to-gold transition-all duration-300"
            style={{ width: `${yuzde}%` }}
          />
        </div>
        {/* BÖLÜM RAYI — hangi katmandasın + sıradaki bölümler adıyla görünür */}
        <AsamaRayi
          asamalar={BOLUMLER.map<RayAsama>((b) => ({
            ad: b.ad,
            durum: adim > b.sonIdx ? "tamam" : b.ad === a.grup ? "simdi" : "bekliyor",
          }))}
          className="mt-2"
        />
      </header>

      {/* Gözden geçirme modunda: tek tuşla bitiş ekranına dön (sona git) */}
      {gozdenMod && (
        <button
          type="button"
          onClick={() => setAdim(TOPLAM)}
          className="mx-auto mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-royal-light/30 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5"
        >
          {t.sonaDon} →
        </button>
      )}

      {/* Dürüstlük telkini — ilerleme eşik geçtiğinde beliren kısa hatırlatma */}
      {telkin && (
        <button
          type="button"
          onClick={() => setTelkin(null)}
          aria-live="polite"
          className="sahne-giris mx-auto mt-4 block w-full rounded-2xl border border-gold/40 bg-gold/[0.06] p-4 text-left"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-light">
            {t.durustlukBaslik}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-100">{telkin}</p>
        </button>
      )}

      {/* key={adim} → her geçişte yeniden monte; .of-adim zarif giriş animasyonu
          verir (sayfanın değiştiği net hissedilir). py daraltıldı: tek ekrana sığ. */}
      <div key={adim} className="of-adim flex flex-1 flex-col justify-center py-4">
        {a.tip === "likert5" && (
          <>
            <h1 className="prizma-serif text-xl font-semibold leading-snug text-slate-50">{a.metin}</h1>
            <p className="mt-1.5 text-sm text-slate-400"><DurustVurgu metin={t.blokAlt} /></p>
            <div role="radiogroup" aria-label={a.metin} className="mt-4 space-y-2">
              {[1, 2, 3, 4, 5].map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={yanitlar[a.kod] === p}
                  onClick={() => likertSec(a.kod, p)}
                  className={`flex h-12 w-full items-center gap-3 rounded-xl px-4 text-left transition-all ${
                    yanitlar[a.kod] === p ? "btn-kor scale-[1.01]" : "kart-cam border-2 border-white/20 text-slate-200 hover:border-gold/60"
                  }`}
                >
                  <span className="font-mono text-lg font-bold">{p}</span>
                  <span className="text-sm font-semibold">{t.olcek[p]}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {a.tip === "ikili10" && (
          <>
            <h1 className="prizma-serif ay-metin text-2xl font-semibold leading-tight">{a.ad}</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{a.anlam}</p>
            <Olcek10 etiket={t.onemSoru} secili={yanitlar[a.onemKod]} onSec={(p) => setSayi(a.onemKod, p)} />
            <Olcek10 etiket={t.gercekSoru} secili={yanitlar[a.gercekKod]} onSec={(p) => setSayi(a.gercekKod, p)} />
          </>
        )}

        {a.tip === "sayi" && (
          <>
            <h1 className="prizma-serif text-xl font-semibold leading-snug text-slate-50">{a.metin}</h1>
            <p className="mt-1.5 text-sm text-slate-400"><DurustVurgu metin={t.sayiAlt} /></p>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={a.max}
              value={yanitlar[a.kod] !== undefined ? String(yanitlar[a.kod]) : sayiGirdi}
              onChange={(e) => {
                setSayiGirdi(e.target.value);
                const n = Number(e.target.value);
                if (e.target.value !== "" && Number.isInteger(n) && n >= 0 && n <= a.max) {
                  setSayi(a.kod, n);
                } else {
                  setYanitlar((y) => {
                    const k = { ...y };
                    delete k[a.kod];
                    return k;
                  });
                }
              }}
              placeholder="0"
              className="mt-4 h-16 w-full rounded-2xl border-2 border-white/20 bg-white/[0.04] text-center font-mono text-4xl font-bold text-slate-50 outline-none focus:border-gold"
            />
          </>
        )}

        {a.tip === "metin" && (
          <MetinAdim
            kod={a.kod}
            metin={a.metin}
            zorunlu={a.zorunlu}
            deger={metinler[a.kod] ?? ""}
            onDegis={(v) => setMetin(a.kod, v)}
          />
        )}

        {hata && <p role="alert" className="mt-4 text-center text-sm font-medium text-red-400">{hata}</p>}
      </div>

      {/* SABİT İLERİ / GERİ — her adımda aynı yerde; cevaplı adımda yeniden
          dokunmadan ileri/geri gidilir (gözden geçirme kolay). */}
      <div className="mt-1 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setAdim((x) => Math.max(x - 1, 0))}
          disabled={adim === 0}
          className="flex h-12 flex-1 items-center justify-center rounded-2xl border-2 border-white/20 text-base font-semibold text-slate-200 transition-colors hover:border-gold/60 disabled:opacity-30"
        >
          ← {t.geri}
        </button>
        <button
          type="button"
          onClick={ilerle}
          disabled={!suanGecerli}
          className="btn-kor flex h-12 flex-[2] items-center justify-center rounded-2xl text-lg font-bold disabled:opacity-40"
        >
          {t.devam} →
        </button>
      </div>

      <p className="pb-2 pt-2 text-center text-xs text-slate-500">{t.kismiNot}</p>
    </div>
  );
}

// Yazılı adım: soru + büyüyen textarea + sesle yaz + Devam (zorunluysa boş geçilmez).
function MetinAdim({
  kod,
  metin,
  deger,
  onDegis,
}: {
  kod: string;
  metin: string;
  zorunlu: boolean;
  deger: string;
  onDegis: (v: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [deger, kod]);
  return (
    <>
      <h1 className="prizma-serif text-xl font-semibold leading-snug text-slate-50">{metin}</h1>
      {METIN_IPUCLARI[kod] && (
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{METIN_IPUCLARI[kod]}</p>
      )}
      <textarea
        ref={ref}
        value={deger}
        onChange={(e) => onDegis(e.target.value)}
        rows={3}
        placeholder={t.metinYer}
        className="mt-4 max-h-[180px] min-h-[4.5rem] w-full resize-none rounded-2xl border-2 border-white/20 bg-white/[0.04] p-4 text-base leading-relaxed text-slate-100 outline-none placeholder:text-slate-500 focus:border-gold"
      />
      <div className="mt-3">
        <MikrofonButonu onMetin={(p) => onDegis(deger.trim() ? `${deger.trim()} ${p}` : p)} />
      </div>
    </>
  );
}

// 1-10 ölçek satırı (iki sıra × beş): önem / gerçek için.
function Olcek10({
  etiket,
  secili,
  onSec,
}: {
  etiket: string;
  secili: number | undefined;
  onSec: (p: number) => void;
}) {
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold text-gold-light">{etiket}</p>
      <div className="mt-2 grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={secili === p}
            onClick={() => onSec(p)}
            className={`h-12 rounded-xl text-lg font-bold transition-all ${
              secili === p ? "btn-kor scale-105" : "kart-cam border-2 border-white/20 text-slate-200 hover:border-gold/60"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

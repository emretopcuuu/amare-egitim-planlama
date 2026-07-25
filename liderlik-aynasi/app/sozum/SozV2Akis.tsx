"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "@/lib/i18n/tr";
import { ayAdi } from "@/lib/planTakvim";
import SesKaydedici from "@/app/soz/SesKaydedici";
import MikrofonButonu from "@/components/MikrofonButonu";
import SahitDavetleri, { type Davet } from "@/components/SahitDavetleri";

const t = tr.sozV2;

// Söz adımının ufku → ay etiketi. Eski gün kodlarını (10/40/90) da destekler,
// böylece daha önce şekillenmiş sözler de doğru (ay bazlı) görünür.
function ufukAyEtiket(ufuk: string, now: Date): string {
  if (ufuk === "ilk_72_saat" || ufuk === "72") return "İlk 72 Saat";
  if (ufuk === "kirk_gun" || ufuk === "40") return ayAdi(now, 1);
  if (ufuk === "doksan_gun" || ufuk === "90") return ayAdi(now, 2);
  return ayAdi(now, 0);
}

type Aksiyon = { metin: string; ufuk: string };
type Soz = {
  metin: string | null;
  aksiyonlar: Aksiyon[];
  voice_path: string | null;
  durum: string;
  sahit_gorunum?: "sade" | "tam";
  sahit_metin?: string | null;
} | null;
type TanikDurum = "bekliyor" | "kabul" | "ret";
type Tanik = { witness_id: string; ad: string; imzali: boolean; durum?: TanikDurum };
type Lider = { id: string; ad: string; takim: string | null };
type Faz = "sekil" | "duzenle" | "ses" | "tanik" | "tamam";

function ilkFaz(soz: Soz, tanikSayi: number): Faz {
  if (!soz?.metin) return "sekil";
  if (soz.durum === "taslak") return "duzenle";
  if (soz.durum === "onaylandi") return "ses";
  if (soz.durum === "sesli") return tanikSayi >= 5 ? "tamam" : "tanik";
  return "sekil";
}

async function istek(govde: Record<string, unknown>) {
  const res = await fetch("/api/soz-v2", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(govde),
  });
  return { ok: res.ok, veri: await res.json().catch(() => null) };
}

type Kanit = { tur: string; metin: string } | null;

export default function SozV2Akis({
  soz,
  taniklar: tanikBaslangic,
  bekleyenImzalar: bekleyenBaslangic,
  liderler,
  kanit = null,
}: {
  soz: Soz;
  taniklar: Tanik[];
  bekleyenImzalar: Davet[];
  liderler: Lider[];
  kanit?: Kanit;
}) {
  const router = useRouter();
  const [faz, setFaz] = useState<Faz>(
    ilkFaz(soz, tanikBaslangic.filter((tn) => tn.durum !== "ret").length)
  );
  const [metin, setMetin] = useState(soz?.metin ?? "");
  const [aksiyonlar] = useState<Aksiyon[]>(soz?.aksiyonlar ?? []);
  const [now] = useState(() => new Date());
  const [sesBlob, setSesBlob] = useState<Blob | null>(null);
  const [taniklar, setTaniklar] = useState<Tanik[]>(tanikBaslangic);
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  // Seni şahit gösterenler — kabul/ret (her fazda görünür, kendi state'ini yönetir).
  const imzaBandi = <SahitDavetleri davetler={bekleyenBaslangic} />;

  // ŞAHİT GİZLİLİĞİ — kişi, şahitlerinin sözün TAM metnini mi yoksa rakamsız/
  // mahremsiz SADE sürümünü mü göreceğini seçer. Varsayılan sade (güvenli).
  const [gorunum, setGorunum] = useState<"sade" | "tam">(soz?.sahit_gorunum ?? "sade");
  const [gorunumMesgul, setGorunumMesgul] = useState(false);
  async function gorunumSec(secim: "sade" | "tam") {
    if (secim === gorunum || gorunumMesgul) return;
    setGorunum(secim);
    setGorunumMesgul(true);
    await istek({ gorunum: secim });
    setGorunumMesgul(false);
    router.refresh();
  }
  const sahitOnizleme = gorunum === "tam" ? (soz?.metin ?? metin) : (soz?.sahit_metin ?? null);
  const gizlilikKontrol = (
    <div className="rounded-2xl border border-royal-light/25 bg-midnight-soft/50 p-4">
      <p className="text-sm font-semibold text-gold-light">{t.gizlilik.baslik}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{t.gizlilik.aciklama}</p>
      <div className="mt-3 flex gap-2">
        {(["sade", "tam"] as const).map((secim) => (
          <button
            key={secim}
            onClick={() => void gorunumSec(secim)}
            disabled={gorunumMesgul}
            className={`flex-1 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-60 ${
              gorunum === secim
                ? "border-gold bg-gold/[0.12]"
                : "border-white/12 bg-white/[0.02] hover:border-white/25"
            }`}
          >
            <span className="block text-sm font-semibold text-slate-100">
              {secim === "sade" ? t.gizlilik.sadeBaslik : t.gizlilik.tamBaslik}
            </span>
            <span className="mt-0.5 block text-[0.7rem] leading-snug text-slate-400">
              {secim === "sade" ? t.gizlilik.sadeAlt : t.gizlilik.tamAlt}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-white/10 bg-midnight/40 p-3">
        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">
          {t.gizlilik.onizlemeBaslik}
        </p>
        {sahitOnizleme ? (
          <p className="mt-1 line-clamp-4 font-serif text-sm italic leading-relaxed text-slate-200">
            &ldquo;{sahitOnizleme}&rdquo;
          </p>
        ) : (
          <p className="mt-1 text-sm leading-relaxed text-slate-400">{t.gizlilik.sadeBos}</p>
        )}
        {aksiyonlar.length > 0 && (
          <p className="mt-2 text-xs text-slate-500">{t.gizlilik.adimNotu(aksiyonlar.length)}</p>
        )}
      </div>
    </div>
  );

  // Öneri 8 — "Bu sözü verebilirsin, çünkü…": gerçek kamp kanıt anı. Söz veren
  // her fazda görür (motivasyon: söz boşa değil, kampta zaten kanıtladın).
  const kanitKarti =
    kanit && faz !== "tamam" ? (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.07] p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
          Bu sözü verebilirsin, çünkü…
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-200">✅ {kanit.metin}</p>
      </div>
    ) : null;

  // DÜZ FONKSİYON, JSX bileşeni DEĞİL — bilinçli. Render içinde tanımlı bir
  // <Sarmal> bileşeni her render'da YENİ tip sayılır; React tüm alt ağacı söküp
  // yeniden kurar → textarea her tuş vuruşunda imleci/odağı kaybeder (saha
  // bildirimi: "bir harf yazınca imleç başa atıyor"). Fonksiyon çağrısı düz
  // element döndürür, ağaç kimliği korunur, imleç yerinde kalır.
  function sarmal(children: React.ReactNode) {
    return (
      <div className="mx-auto my-auto w-full max-w-md space-y-5 p-5">
        {imzaBandi}
        {kanitKarti}
        {children}
      </div>
    );
  }

  // ---- ŞEKİLLENDİR ----
  if (faz === "sekil") {
    return sarmal(
      <>
        <div className="kart-cam rounded-3xl p-7 text-center">
          <p className="text-5xl">📜</p>
          <h1 className="prizma-serif ay-metin mt-3 text-2xl font-semibold">{t.sekilBaslik}</h1>
          <p className="mt-3 text-base leading-relaxed text-slate-300">{t.sekilMetin}</p>
          {hata && <p className="mt-3 text-sm text-red-400">{hata}</p>}
          <button
            onClick={async () => {
              setMesgul(true);
              setHata(null);
              const { ok, veri } = await istek({ sekillendir: true });
              setMesgul(false);
              if (ok && veri?.durum === "hazir") {
                setMetin(veri.metin);
                setFaz("duzenle");
                router.refresh();
              } else setHata(t.kapali);
            }}
            disabled={mesgul}
            className="btn-kor parilti mt-7 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold disabled:opacity-50"
          >
            {mesgul ? t.dusunuyor : t.sekillendir}
          </button>
        </div>
      </>
    );
  }

  // ---- DÜZENLE ----
  if (faz === "duzenle") {
    return sarmal(
      <>
        <header>
          <h1 className="prizma-serif ay-metin text-2xl font-semibold">{t.duzenleBaslik}</h1>
          <p className="mt-2 text-sm text-slate-300">{t.duzenleMetin}</p>
        </header>
        <textarea
          value={metin}
          onChange={(e) => setMetin(e.target.value.slice(0, 4000))}
          rows={10}
          className="w-full resize-none rounded-2xl border border-royal-light/30 bg-midnight-soft px-4 py-3 font-serif text-base leading-relaxed text-slate-100 outline-none focus:border-gold"
        />
        <MikrofonButonu
          belirgin
          onMetin={(p) => setMetin((g) => (g.trim() ? `${g.trim()} ${p}` : p).slice(0, 4000))}
        />
        {aksiyonlar.length > 0 && (
          <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.06] p-4">
            <p className="text-sm font-semibold text-emerald-300">{t.aksiyonlarBaslik}</p>
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
          </div>
        )}
        {hata && <p className="text-center text-sm text-red-400">{hata}</p>}
        <button
          onClick={async () => {
            if (!metin.trim()) return;
            setMesgul(true);
            setHata(null);
            const { ok } = await istek({ kaydet: { metin, aksiyonlar } });
            setMesgul(false);
            if (ok) setFaz("ses");
            else setHata(t.kapali);
          }}
          disabled={mesgul || !metin.trim()}
          className="btn-kor parilti flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold disabled:opacity-50"
        >
          {t.onayla}
        </button>
      </>
    );
  }

  // ---- SES ----
  if (faz === "ses") {
    return sarmal(
      <>
        <header>
          <h1 className="prizma-serif ay-metin text-2xl font-semibold">{t.sesBaslik}</h1>
          <p className="mt-2 text-sm text-slate-300">{t.sesMetin}</p>
        </header>
        <div className="kart-cam rounded-2xl p-4">
          <p className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-slate-100">
            {metin}
          </p>
        </div>
        {/* Kaydet → dinle → beğenmezsen "Yeniden kaydet" (SesKaydedici içinde).
            Ses ancak "Bu sesi kullan" ile yüklenir — önizlemeden önce kilit yok. */}
        <SesKaydedici
          onKayit={(blob) => {
            setSesBlob(blob);
            setHata(null);
          }}
        />
        {sesBlob ? (
          <button
            onClick={async () => {
              setMesgul(true);
              setHata(null);
              const fd = new FormData();
              fd.append("ses", sesBlob, "soz-v2.webm");
              const res = await fetch("/api/soz-v2/ses", { method: "POST", body: fd });
              setMesgul(false);
              if (res.ok) {
                setSesBlob(null);
                setFaz("tanik");
                router.refresh();
              } else setHata(t.kapali);
            }}
            disabled={mesgul}
            className="btn-kor parilti flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold disabled:opacity-50"
          >
            {mesgul ? t.sesYukleniyor : "Bu sesi kullan → devam et"}
          </button>
        ) : (
          <p className="text-center text-xs text-slate-500">
            Kaydet, dinle; beğenmezsen &ldquo;Yeniden kaydet&rdquo;. Beğendiğinde &ldquo;Bu sesi kullan&rdquo;a bas.
          </p>
        )}
        {hata && <p className="text-center text-sm text-red-400">{hata}</p>}
        <button
          onClick={() => setFaz("tanik")}
          className="mx-auto block text-sm text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
        >
          {t.sesAtla}
        </button>
      </>
    );
  }

  // ---- ŞAHİTLER ----
  if (faz === "tanik") {
    const seciliIdler = new Set(taniklar.map((x) => x.witness_id));
    return (
      <TanikSecimi
        imzaBandi={imzaBandi}
        gizlilikKontrol={gizlilikKontrol}
        taniklar={taniklar}
        liderler={liderler.filter((l) => !seciliIdler.has(l.id))}
        onEkle={async (id) => {
          const { ok, veri } = await istek({ tanikEkle: id });
          if (ok) {
            const l = liderler.find((x) => x.id === id);
            if (l) setTaniklar((tl) => [...tl, { witness_id: id, ad: l.ad, imzali: false, durum: "bekliyor" }]);
            setHata(null);
          } else if (veri?.sebep === "lider_dolu") setHata(t.tanikLiderDolu);
          else if (veri?.sebep === "reddetti") setHata(t.tanikReddettiHata);
          else if (veri?.sebep === "dolu") setHata(t.tanikDolu);
        }}
        onSil={async (id) => {
          await istek({ tanikSil: id });
          setTaniklar((tl) => tl.filter((x) => x.witness_id !== id));
          setHata(null);
        }}
        onDevam={() => setFaz("tamam")}
        onSesYeniden={() => {
          setSesBlob(null);
          setFaz("ses");
        }}
        hata={hata}
      />
    );
  }

  // ---- TAMAM ----
  return sarmal(
    <>
      <div className="kart-cam rounded-3xl p-8 text-center">
        <p className="text-5xl">🤝</p>
        <h1 className="prizma-serif ay-metin mt-3 text-2xl font-semibold">{t.tamamBaslik}</h1>
        <p className="mt-3 text-base leading-relaxed text-slate-300">{t.tamamMetin}</p>
        {taniklar.length > 0 && (
          <ul className="mt-5 space-y-1.5 text-left">
            {taniklar.map((tn) => (
              <li
                key={tn.witness_id}
                className="flex items-center justify-between rounded-xl bg-midnight-soft/70 px-3 py-2 text-sm"
              >
                <span className="text-slate-200">{tn.ad}</span>
                <span
                  className={
                    tn.durum === "ret"
                      ? "text-amber-400"
                      : tn.imzali
                        ? "text-emerald-300"
                        : "text-slate-500"
                  }
                >
                  {tn.durum === "ret"
                    ? t.tanikReddetti
                    : tn.imzali
                      ? t.tanikImzali
                      : t.tanikImzaBekliyor}
                </span>
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={() => router.push("/")}
          className="btn-kor parilti mt-7 flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold"
        >
          {t.devam}
        </button>
        <div className="mt-3 flex flex-col items-center gap-2">
          <button
            onClick={() => setFaz("tanik")}
            className="text-sm text-slate-400 underline-offset-2 hover:text-gold-light hover:underline"
          >
            🤝 Şahitlerimi düzenle
          </button>
          <button
            onClick={() => {
              setSesBlob(null);
              setFaz("ses");
            }}
            className="text-sm text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
          >
            🎤 Sesi yeniden kaydet
          </button>
        </div>
      </div>
    </>
  );
}

// Şahit seçimi alt bileşeni (kendi arama state'iyle).
function TanikSecimi({
  imzaBandi,
  gizlilikKontrol,
  taniklar,
  liderler,
  onEkle,
  onSil,
  onDevam,
  onSesYeniden,
  hata,
}: {
  imzaBandi: React.ReactNode;
  gizlilikKontrol: React.ReactNode;
  taniklar: Tanik[];
  liderler: Lider[];
  onEkle: (id: string) => void;
  onSil: (id: string) => void;
  onDevam: () => void;
  onSesYeniden: () => void;
  hata: string | null;
}) {
  const [arama, setArama] = useState("");
  // Reddedilen davetler 5'lik hedefe SAYILMAZ (yerine yeni şahit seçilmeli).
  const aktifTaniklar = taniklar.filter((tn) => tn.durum !== "ret");
  const dolu = aktifTaniklar.length >= 5;
  const suzulmus = arama.trim()
    ? liderler.filter((l) => l.ad.toLocaleLowerCase("tr").includes(arama.toLocaleLowerCase("tr")))
    : liderler;

  return (
    <div className="mx-auto my-auto w-full max-w-md space-y-5 p-5">
      {imzaBandi}
      <header>
        <h1 className="prizma-serif ay-metin text-2xl font-semibold">{t.tanikBaslik}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{t.tanikMetin}</p>
        <p className="mt-2 text-sm font-semibold text-gold-light">{t.tanikSecili(aktifTaniklar.length)}</p>
      </header>

      {/* Şahitler ne görecek? — kişi burada, şahit seçerken karar verir. */}
      {gizlilikKontrol}

      {taniklar.length > 0 && (
        <ul className="space-y-2">
          {taniklar.map((tn) => {
            const ret = tn.durum === "ret";
            return (
              <li
                key={tn.witness_id}
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${
                  ret ? "bg-amber-500/[0.08]" : "bg-emerald-500/10"
                }`}
              >
                <span className={`text-sm font-medium ${ret ? "text-slate-400" : "text-slate-100"}`}>
                  {tn.ad}
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className={`text-xs ${
                      ret ? "text-amber-400" : tn.imzali ? "text-emerald-300" : "text-slate-500"
                    }`}
                  >
                    {ret ? t.tanikReddetti : tn.imzali ? t.tanikImzali : t.tanikImzaBekliyor}
                  </span>
                  {!tn.imzali && !ret && (
                    <button
                      onClick={() => onSil(tn.witness_id)}
                      className="text-xs text-slate-500 hover:text-red-400"
                    >
                      {t.tanikSil}
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {hata && <p className="text-center text-sm text-amber-400">{hata}</p>}

      {!dolu && (
        <div>
          <input
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder={t.tanikAra}
            className="w-full rounded-xl border border-royal-light/30 bg-midnight-soft px-4 py-2.5 text-base text-slate-100 outline-none focus:border-gold"
          />
          <ul className="mt-2 max-h-64 space-y-1.5 overflow-y-auto">
            {suzulmus.map((l) => (
              <li key={l.id}>
                <button
                  onClick={() => onEkle(l.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-royal-light/20 bg-midnight-soft px-3 py-2.5 text-left transition-colors hover:border-gold"
                >
                  <span>
                    <span className="block text-sm font-medium text-slate-100">{l.ad}</span>
                    {l.takim && <span className="block text-xs text-slate-500">{l.takim}</span>}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-gold-light">{t.tanikEkle}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={onDevam}
        disabled={!dolu}
        className="btn-kor parilti flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold disabled:opacity-50"
      >
        {dolu ? t.devam : t.tanikSecili(aktifTaniklar.length)}
      </button>
      <button
        onClick={onSesYeniden}
        className="mx-auto block text-sm text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
      >
        🎤 Sesi yeniden kaydet
      </button>
    </div>
  );
}

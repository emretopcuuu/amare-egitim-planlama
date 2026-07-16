"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Bekle from "@/components/Bekle";
import AynaDusunuyor from "@/components/AynaDusunuyor";
import MikrofonButonu from "@/components/MikrofonButonu";
import { tr } from "@/lib/i18n/tr";
import { ayAdi, aySonunaGun } from "@/lib/planTakvim";
import type { OyunPlani, PlanMadde, PlanUfuk } from "@/lib/oyunPlani";

// PLAN ATÖLYESİ — kişi karar verir, AYNA danışman. AI önerisi "öneri" olarak
// gelir; kişi her maddeyi kabul/düzenle/çıkar, kendi maddesini ekler, takıldığı
// yerde AYNA'ya danışır. "Planım hazır" → onaylanır (kilit) → Sözünü Ver açılır.

type UfukGorunum = { key: PlanUfuk; etiket: string; kisa: string; alt: string; ikon: string };
// Ufuklar takvim ayına bağlı: 72 saat sabit, sonrakiler bu ay / gelecek ay /
// sonraki ay + "ayın bitmesine X gün" canlı sayacı (ayAdi/aySonunaGun ile).
const UFUK_TABAN: { key: PlanUfuk; ikon: string; ay: number | null }[] = [
  { key: "ilk_72_saat", ikon: "⚡", ay: null },
  { key: "on_gun", ikon: "🌱", ay: 0 },
  { key: "kirk_gun", ikon: "🔥", ay: 1 },
  { key: "doksan_gun", ikon: "🏔️", ay: 2 },
];
function ufuklariKur(now: Date): UfukGorunum[] {
  return UFUK_TABAN.map((t) =>
    t.ay === null
      ? {
          key: t.key,
          ikon: t.ikon,
          etiket: "İlk 72 Saat",
          kisa: "72 Saat",
          alt: "Kamptan çıkınca ilk 3 gün — küçük ama net kıvılcımlar",
        }
      : {
          key: t.key,
          ikon: t.ikon,
          etiket: ayAdi(now, t.ay),
          kisa: ayAdi(now, t.ay),
          alt: `${ayAdi(now, t.ay)} ayının bitmesine ${aySonunaGun(now, t.ay)} gün`,
        }
  );
}

type PlanDurumu = Record<PlanUfuk, PlanMadde[]>;

function planiCikar(p: OyunPlani): PlanDurumu {
  return {
    ilk_72_saat: [...p.ilk_72_saat],
    on_gun: [...p.on_gun],
    kirk_gun: [...p.kirk_gun],
    doksan_gun: [...p.doksan_gun],
  };
}

const BOS: PlanDurumu = { ilk_72_saat: [], on_gun: [], kirk_gun: [], doksan_gun: [] };

export default function PlanAtolyesi({ ilkPlan }: { ilkPlan: OyunPlani | null }) {
  const router = useRouter();
  const [plan, setPlan] = useState<OyunPlani | null>(ilkPlan);
  const [durum, setDurum] = useState<"taslak" | "onaylandi">(ilkPlan?.durum ?? "taslak");
  const [veri, setVeri] = useState<PlanDurumu>(ilkPlan ? planiCikar(ilkPlan) : BOS);
  const [uretiliyor, setUretiliyor] = useState(!ilkPlan);
  const [uretimHata, setUretimHata] = useState(false);
  const [now] = useState(() => new Date());
  const [adim, setAdim] = useState(0); // sihirbaz aşaması (0..3)
  const ufuklar = ufuklariKur(now);
  const toplamGun = aySonunaGun(now, 2);
  const [duzenlenen, setDuzenlenen] = useState<string | null>(null); // "ufuk:idx"
  const [danisAcik, setDanisAcik] = useState<{ ufuk: PlanUfuk; idx: number } | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  // Plan yoksa CLIENT'ta üret (Opus ~10-20 sn) — yükleme göstergesiyle, timeout
  // riski olmadan. Bir kez dener; hata olursa kişi "tekrar dene" ile yeniden.
  const denendi = useRef(false);
  async function uret() {
    setUretiliyor(true);
    setUretimHata(false);
    try {
      const res = await fetch("/api/oyun-plani", { method: "POST" });
      const v = await res.json().catch(() => null);
      if (res.ok && v?.durum === "hazir") {
        const p = v.plan as OyunPlani;
        setPlan(p);
        setDurum(p.durum);
        setVeri(planiCikar(p));
      } else {
        setUretimHata(true);
      }
    } catch {
      setUretimHata(true);
    } finally {
      setUretiliyor(false);
    }
  }
  useEffect(() => {
    if (plan || denendi.current) return;
    denendi.current = true;
    void uret();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toplamMadde = ufuklar.reduce((t, u) => t + veri[u.key].length, 0);

  // ---- ÜRETİM: yükleme / hata ----
  if (uretiliyor) {
    return (
      <div className="space-y-5">
        <header>
          <h1 className="prizma-serif ay-metin text-2xl font-semibold leading-tight">
            90 Günlük Oyun Planım
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            AYNA senin verinden bir başlangıç önerisi hazırlıyor — birazdan hepsini sen düzenleyeceksin.
          </p>
        </header>
        <AynaDusunuyor satirlar={tr.dusunuyor.mektup} />
      </div>
    );
  }
  if (!plan) {
    return (
      <div className="kart-cam rounded-3xl p-8 text-center">
        <p className="text-5xl" aria-hidden>🧭</p>
        <h1 className="prizma-serif ay-metin mt-4 text-xl font-semibold">Plan bu an kurulamadı</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          {uretimHata ? "Bir aksilik oldu — verilerin duruyor. Tekrar dene." : "Birazdan tekrar dene."}
        </p>
        <button
          onClick={uret}
          className="btn-kor mt-5 inline-flex h-11 items-center justify-center rounded-xl px-6 font-semibold"
        >
          Tekrar dene
        </button>
      </div>
    );
  }

  function maddeGuncelle(ufuk: PlanUfuk, idx: number, alan: keyof PlanMadde, deger: string) {
    setVeri((v) => {
      const dizi = [...v[ufuk]];
      dizi[idx] = { ...dizi[idx], [alan]: deger, kaynak: "duzenlendi" };
      return { ...v, [ufuk]: dizi };
    });
  }
  function maddeSil(ufuk: PlanUfuk, idx: number) {
    setVeri((v) => ({ ...v, [ufuk]: v[ufuk].filter((_, i) => i !== idx) }));
    setDuzenlenen(null);
  }
  function maddeEkle(ufuk: PlanUfuk) {
    setVeri((v) => {
      const dizi = [...v[ufuk], { baslik: "", aksiyon: "", olcut: "", kaynak: "kisi" as const }];
      return { ...v, [ufuk]: dizi };
    });
    setDuzenlenen(`${ufuk}:${veri[ufuk].length}`);
  }
  function secenekUygula(ufuk: PlanUfuk, idx: number, madde: PlanMadde) {
    setVeri((v) => {
      const dizi = [...v[ufuk]];
      dizi[idx] = { ...madde, kaynak: "duzenlendi" };
      return { ...v, [ufuk]: dizi };
    });
    setDanisAcik(null);
  }

  async function planimHazir() {
    if (toplamMadde === 0) {
      setHata("Sözünü verebilmen için en az bir madde olmalı.");
      return;
    }
    setGonderiliyor(true);
    setHata(null);
    try {
      const k = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "kaydet", plan: veri }),
      });
      if (!k.ok) throw new Error();
      const o = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "onayla" }),
      });
      if (!o.ok) throw new Error();
      router.push("/sozum");
      router.refresh();
    } catch {
      setHata("Kaydedilemedi. Bağlantını kontrol edip tekrar dene.");
      setGonderiliyor(false);
    }
  }

  async function gozdenGecir() {
    setGonderiliyor(true);
    try {
      const r = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "gozden-gecir" }),
      });
      if (r.ok) setDurum("taslak");
    } finally {
      setGonderiliyor(false);
    }
  }

  // ---- ONAYLI (kilitli) görünüm ----
  if (durum === "onaylandi") {
    return (
      <div className="space-y-5">
        <header className="text-center">
          <p className="text-4xl" aria-hidden>🔒</p>
          <h1 className="prizma-serif ay-metin mt-2 text-2xl font-semibold">Planın hazır ve kilitli</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Bu senin kararın. Sözünü verince taahhüdün olur.
          </p>
        </header>
        {ufuklar.map((u) =>
          veri[u.key].length === 0 ? null : (
            <section key={u.key} className="kart-cam rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-light/80">
                {u.ikon} {u.etiket}
              </p>
              <ul className="mt-3 space-y-3">
                {veri[u.key].map((m, i) => (
                  <li key={i} className="border-l-2 border-gold/30 pl-3">
                    <p className="font-semibold text-slate-100">{m.baslik}</p>
                    <p className="mt-0.5 text-sm text-slate-300">{m.aksiyon}</p>
                    {m.olcut && <p className="mt-0.5 text-xs text-slate-500">📏 {m.olcut}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )
        )}
        <div className="space-y-3">
          <Link
            href="/sozum"
            className="parilti btn-kor flex h-14 w-full items-center justify-center rounded-2xl text-lg font-bold"
          >
            Sözünü Ver →
          </Link>
          <button
            onClick={gozdenGecir}
            disabled={gonderiliyor}
            className="flex h-11 w-full items-center justify-center rounded-xl border border-white/15 text-sm font-medium text-slate-300 transition-colors hover:border-gold/40 disabled:opacity-50"
          >
            {gonderiliyor ? <Bekle /> : "Planımı gözden geçir"}
          </button>
        </div>
      </div>
    );
  }

  // ---- ATÖLYE (SİHİRBAZ: ufuk ufuk) ----
  const sonAdim = ufuklar.length - 1;
  const u = ufuklar[adim];

  async function tasla() {
    // İlerlerken taslağı sessizce kaydet (kişi çıkıp dönse bile durur).
    try {
      await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "kaydet", plan: veri }),
      });
    } catch {
      // yut — akışta kal
    }
  }
  function adimaGit(hedef: number) {
    setDuzenlenen(null);
    setDanisAcik(null);
    setAdim(Math.max(0, Math.min(sonAdim, hedef)));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function ilerle() {
    await tasla();
    adimaGit(adim + 1);
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="prizma-serif ay-metin text-2xl font-semibold leading-tight">
          90 Günlük Oyun Planım
        </h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1 text-xs font-semibold text-gold-light ring-1 ring-gold/25">
            🎯 {ayAdi(now, 2)} sonuna {toplamGun} gün
          </span>
          <span className="text-xs text-slate-400">Aşama aşama kur — kararlar senin.</span>
        </div>
      </header>

      {/* AŞAMALAR — tepede. Tamamladığın aşamaya geri dönebilirsin. */}
      <div className="flex items-center gap-1.5">
        {ufuklar.map((uf, i) => {
          const aktif = i === adim;
          const gecildi = i < adim;
          return (
            <button
              key={uf.key}
              onClick={() => i <= adim && adimaGit(i)}
              disabled={i > adim}
              className={`flex-1 rounded-lg px-1 py-1.5 text-center text-[0.6rem] font-semibold uppercase leading-tight tracking-wide transition-colors disabled:cursor-default ${
                aktif
                  ? "bg-gold text-[#1a1206]"
                  : gecildi
                    ? "bg-gold/15 text-gold-light"
                    : "bg-white/5 text-slate-500"
              }`}
            >
              {gecildi ? "✓ " : ""}
              {uf.kisa}
            </button>
          );
        })}
      </div>

      {/* İlk aşamada özet çapası — planın ruhu. */}
      {adim === 0 && plan.ozet && (
        <p className="prizma-serif ay-metin rounded-2xl border border-gold/20 bg-gold/[0.05] p-4 text-sm italic leading-snug text-gold-light/90">
          {plan.ozet}
        </p>
      )}

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-gold-light">
            {u.ikon} {u.etiket}
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">{u.alt}</p>
        </div>

        {veri[u.key].length === 0 && (
          <p className="rounded-xl border border-dashed border-white/12 px-4 py-3 text-sm text-slate-500">
            Bu ufukta madde yok. İstersen bir madde ekle.
          </p>
        )}

        <ul className="space-y-3">
          {veri[u.key].map((m, i) => {
            const anahtar = `${u.key}:${i}`;
            const duzen = duzenlenen === anahtar;
            return (
              <li key={i} className="kart-cam rounded-2xl p-4">
                {duzen ? (
                  <div className="space-y-2">
                    <input
                      value={m.baslik}
                      onChange={(e) => maddeGuncelle(u.key, i, "baslik", e.target.value)}
                      placeholder="Başlık (kısa)"
                      className="w-full rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-slate-100 outline-none focus:border-gold/50"
                    />
                    <textarea
                      value={m.aksiyon}
                      onChange={(e) => maddeGuncelle(u.key, i, "aksiyon", e.target.value)}
                      placeholder="Ne yapacaksın? (somut, ölçülebilir)"
                      rows={2}
                      className="w-full resize-none rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 outline-none focus:border-gold/50"
                    />
                    <MikrofonButonu
                      ikon
                      onMetin={(p) => {
                        const g = m.aksiyon.trim();
                        maddeGuncelle(u.key, i, "aksiyon", g ? `${g} ${p}` : p);
                      }}
                    />
                    <input
                      value={m.olcut}
                      onChange={(e) => maddeGuncelle(u.key, i, "olcut", e.target.value)}
                      placeholder="Nasıl takip edeceksin? (sayı/sıklık)"
                      className="w-full rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-xs text-slate-300 outline-none focus:border-gold/50"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setDuzenlenen(null)}
                        className="rounded-lg bg-gold px-4 py-1.5 text-sm font-semibold text-[#1a1206]"
                      >
                        Tamam
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-slate-100">{m.baslik || "(başlıksız)"}</p>
                    <p className="mt-0.5 text-sm text-slate-300">{m.aksiyon}</p>
                    {m.olcut && <p className="mt-1 text-xs text-slate-500">📏 {m.olcut}</p>}
                    {m.kaynak && m.kaynak !== "ai" && (
                      <p className="mt-1 text-[0.65rem] uppercase tracking-wide text-royal-light/70">
                        {m.kaynak === "kisi" ? "senin eklediğin" : "senin düzenlediğin"}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => setDuzenlenen(anahtar)}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-gold/40"
                      >
                        ✏️ Düzenle
                      </button>
                      <button
                        onClick={() =>
                          setDanisAcik(danisAcik?.ufuk === u.key && danisAcik.idx === i ? null : { ufuk: u.key, idx: i })
                        }
                        className="rounded-lg border border-royal/30 px-3 py-1.5 text-xs font-medium text-royal-light transition-colors hover:border-royal/60"
                      >
                        🤔 AYNA'ya danış
                      </button>
                      <button
                        onClick={() => maddeSil(u.key, i)}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-red-400/40 hover:text-red-300"
                      >
                        🗑️ Çıkar
                      </button>
                    </div>
                    {danisAcik?.ufuk === u.key && danisAcik.idx === i && (
                      <DanisPaneli
                        ufuk={u.key}
                        madde={m}
                        onSecenek={(sec) => secenekUygula(u.key, i, sec)}
                        onKapat={() => setDanisAcik(null)}
                      />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {veri[u.key].length < 3 && (
          <button
            onClick={() => maddeEkle(u.key)}
            className="w-full rounded-xl border border-dashed border-gold/30 py-2.5 text-sm font-medium text-gold-light/90 transition-colors hover:bg-gold/[0.06]"
          >
            ➕ Kendi maddeni ekle
          </button>
        )}
      </section>

      <div className="sticky bottom-0 -mx-5 space-y-2 border-t border-white/10 bg-[#04101c]/90 px-5 py-4 backdrop-blur">
        {hata && <p className="text-center text-sm font-medium text-red-400">{hata}</p>}
        {adim < sonAdim ? (
          <>
            <p className="text-center text-xs text-slate-500">
              {adim + 1}/{ufuklar.length} — {u.etiket}. Tamamla, sonraki aşamaya geç.
            </p>
            <div className="flex gap-2">
              {adim > 0 && (
                <button
                  onClick={() => adimaGit(adim - 1)}
                  className="h-14 flex-1 rounded-2xl border border-white/15 text-sm font-medium text-slate-300 transition-colors hover:border-gold/40"
                >
                  ← Geri
                </button>
              )}
              <button
                onClick={ilerle}
                className="parilti btn-kor flex h-14 flex-[2] items-center justify-center rounded-2xl text-lg font-bold"
              >
                Devam et →
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-center text-xs text-slate-500">
              Son aşama. Sözünü verince plan kilitlenir; sonra "gözden geçir" ile güncelleyebilirsin.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => adimaGit(adim - 1)}
                className="h-14 flex-1 rounded-2xl border border-white/15 text-sm font-medium text-slate-300 transition-colors hover:border-gold/40"
              >
                ← Geri
              </button>
              <button
                onClick={planimHazir}
                disabled={gonderiliyor}
                className="parilti btn-kor flex h-14 flex-[2] items-center justify-center rounded-2xl text-lg font-bold disabled:opacity-60"
              >
                {gonderiliyor ? <Bekle /> : "Planım hazır — Sözünü Ver"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// AYNA danışman paneli — tek maddede tavsiye + 2 alternatif öneri. Karar kişinin.
function DanisPaneli({
  ufuk,
  madde,
  onSecenek,
  onKapat,
}: {
  ufuk: PlanUfuk;
  madde: PlanMadde;
  onSecenek: (m: PlanMadde) => void;
  onKapat: () => void;
}) {
  const [soru, setSoru] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [tavsiye, setTavsiye] = useState<string | null>(null);
  const [secenekler, setSecenekler] = useState<PlanMadde[]>([]);
  const [hata, setHata] = useState(false);

  async function danis() {
    setYukleniyor(true);
    setHata(false);
    try {
      const r = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "danis", ufuk, madde, soru: soru || null }),
      });
      const veri = await r.json();
      if (!r.ok || veri?.durum !== "hazir") {
        setHata(true);
        return;
      }
      setTavsiye(veri.tavsiye as string);
      setSecenekler((veri.secenekler as PlanMadde[]) ?? []);
    } catch {
      setHata(true);
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-royal/25 bg-royal/[0.06] p-3">
      {!tavsiye ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-300">
            Bu maddede takıldıysan bir sorunu yaz (istersen boş bırak), AYNA sana akıl versin.
          </p>
          <textarea
            value={soru}
            onChange={(e) => setSoru(e.target.value)}
            placeholder="Örn: Bu hafta gerçekçi kaç sunum yapabilirim?"
            rows={2}
            className="w-full resize-none rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 outline-none focus:border-royal/50"
          />
          <MikrofonButonu
            ikon
            onMetin={(p) => setSoru((g) => (g.trim() ? `${g.trim()} ${p}` : p))}
          />
          {hata && <p className="text-xs font-medium text-red-400">Danışman şu an yanıt veremedi, tekrar dene.</p>}
          <div className="flex gap-2">
            <button
              onClick={danis}
              disabled={yukleniyor}
              className="rounded-lg bg-royal px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {yukleniyor ? <Bekle /> : "AYNA'ya danış"}
            </button>
            <button onClick={onKapat} className="rounded-lg px-3 py-1.5 text-sm text-slate-400">
              Kapat
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-slate-200">{tavsiye}</p>
          {secenekler.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-royal-light/80">
                Seçebileceğin öneriler (istersen üstüne kendi cümleni yaz)
              </p>
              {secenekler.map((s, i) => (
                <button
                  key={i}
                  onClick={() => onSecenek(s)}
                  className="block w-full rounded-lg border border-white/12 bg-white/[0.02] p-3 text-left transition-colors hover:border-gold/40"
                >
                  <p className="text-sm font-semibold text-slate-100">{s.baslik}</p>
                  <p className="mt-0.5 text-sm text-slate-300">{s.aksiyon}</p>
                  {s.olcut && <p className="mt-0.5 text-xs text-slate-500">📏 {s.olcut}</p>}
                  <p className="mt-1 text-[0.65rem] uppercase tracking-wide text-gold-light/70">bunu benimki yap →</p>
                </button>
              ))}
            </div>
          )}
          <button onClick={onKapat} className="text-sm text-slate-400 underline-offset-4 hover:underline">
            Kapat
          </button>
        </div>
      )}
    </div>
  );
}
